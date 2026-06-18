import { LeadStatus, NotificationType, VisitStatus, Prisma, PrismaClient } from "@prisma/client";

import type { VisitListItem, VisitSummary } from "@/modules/visits/types";
import { notifyVisitScheduled } from "@/server/push/notify";

export type CreateVisitForAutomationParams = {
  organizationId: string;
  leadId: string;
  scheduledAt: Date;
  status?: VisitStatus;
  notes?: string;
};

export class VisitAutomationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "VisitAutomationError";
  }
}

export type VisitView = "upcoming" | "all";

// Limpia notas de visita que filtraron texto interno de debug en inglés
// (bug del path viejo: volcaba `internalNotes` "AI intent: ... AI confidence: ...").
// Rescata el motivo legible si está, o cae a un texto en español.
export function sanitizeVisitNotes(notes: string | null | undefined): string {
  const fallback = "Visita coordinada por el agente IA.";
  if (!notes) return fallback;
  if (/AI intent:|AI confidence:|Lead temperature:|routed to human|Auto-scheduled/i.test(notes)) {
    const match = notes.match(/Follow-up reason:\s*(.+?)(?:\s+(?:Client agreed|AI intent|AI confidence|Lead temperature)\b|$)/i);
    return match?.[1]?.trim() || fallback;
  }
  return notes;
}

export async function listOrganizationVisits(
  prisma: PrismaClient | Prisma.TransactionClient,
  orgSlug: string,
  view: VisitView = "upcoming",
): Promise<VisitListItem[]> {
  const visits = await prisma.visit.findMany({
    where: {
      organization: {
        slug: orgSlug,
      },
      ...(view === "upcoming"
        ? { status: { in: [VisitStatus.PENDING, VisitStatus.CONFIRMED] } }
        : {}),
    },
    include: {
      property: true,
      lead: true,
      createdBy: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
    take: 200,
  });

  return visits.map((visit) => ({
      id: visit.id,
      scheduledAt: visit.scheduledAt.toISOString(),
      status: visit.status,
      notes: sanitizeVisitNotes(visit.notes),
      propertyId: visit.propertyId,
      // Una visita puede ser a una propiedad o a un desarrollo/lote (sin propertyId):
      // en ese caso usamos el rótulo de destino guardado al crearla.
      propertyTitle: visit.property?.title ?? visit.targetLabel ?? "Visita",
      leadId: visit.leadId ?? "",
      leadName: visit.lead?.fullName ?? "Contacto desconocido",
      ownerName: visit.createdBy.fullName,
    }));
}

export async function getVisitSummary(
  prisma: PrismaClient | Prisma.TransactionClient,
  orgSlug: string,
): Promise<VisitSummary> {
  const orgWhere = { organization: { slug: orgSlug } };
  const [total, pendingCount, confirmedCount, completedCount] = await Promise.all([
    prisma.visit.count({ where: orgWhere }),
    prisma.visit.count({ where: { ...orgWhere, status: VisitStatus.PENDING } }),
    prisma.visit.count({ where: { ...orgWhere, status: VisitStatus.CONFIRMED } }),
    prisma.visit.count({ where: { ...orgWhere, status: VisitStatus.COMPLETED } }),
  ]);

  return { total, pendingCount, confirmedCount, completedCount };
}

export async function createVisitForAutomation(
  prisma: PrismaClient | Prisma.TransactionClient,
  params: CreateVisitForAutomationParams,
) {
  const organization = await prisma.organization.findUnique({
    where: {
      id: params.organizationId,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!organization) {
    throw new VisitAutomationError("missing-organization", "Organization not found.");
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: params.leadId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      fullName: true,
      ownerId: true,
      propertyId: true,
    },
  });

  if (!lead) {
    throw new VisitAutomationError("missing-lead", "Lead not found in organization.");
  }

  if (!lead.propertyId) {
    throw new VisitAutomationError(
      "missing-property",
      "Lead must be linked to a property before creating a visit.",
    );
  }

  const [property, fallbackOwner] = await Promise.all([
    prisma.property.findFirst({
      where: {
        id: lead.propertyId,
        organizationId: organization.id,
      },
      select: {
        id: true,
        title: true,
      },
    }),
    prisma.membership.findFirst({
      where: {
        organizationId: organization.id,
      },
      select: {
        userId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  if (!property) {
    throw new VisitAutomationError(
      "property-unavailable",
      "Property is unavailable for this organization.",
    );
  }

  const ownerId = lead.ownerId || fallbackOwner?.userId;

  if (!ownerId) {
    throw new VisitAutomationError(
      "missing-owner",
      "No valid owner was found to attribute the visit.",
    );
  }

  const scheduledAt = new Date(params.scheduledAt);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new VisitAutomationError("invalid-visit", "Visit date is invalid.");
  }

  const runInTransaction = async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${organization.id}), hashtext(${`${lead.id}:${property.id}:${scheduledAt.toISOString()}`}))
    `;

    const existingVisit = await tx.visit.findFirst({
      where: {
        organizationId: organization.id,
        leadId: lead.id,
        propertyId: property.id,
        scheduledAt,
        status: {
          not: VisitStatus.CANCELED,
        },
      },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
      },
    });

    if (existingVisit) {
      return {
        visit: existingVisit,
        notification: null,
        reusedExisting: true,
      };
    }

    const visit = await tx.visit.create({
      data: {
        organizationId: organization.id,
        leadId: lead.id,
        propertyId: property.id,
        createdById: ownerId,
        scheduledAt,
        status: params.status ?? VisitStatus.PENDING,
        notes: params.notes ?? "Visita creada desde el flujo de automatización.",
      },
    });

    await tx.lead.update({
      where: {
        id: lead.id,
      },
      data: {
        status: LeadStatus.VISIT,
        lastContactAt: new Date(),
      },
    });

    const notification = await tx.notification.create({
      data: {
        organizationId: organization.id,
        type: NotificationType.VISIT_CREATED,
        title: `Visita agendada para ${lead.fullName}`,
        body: `${property.title} reservado el ${visit.scheduledAt.toLocaleString("es-AR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}.`,
        link: `/${organization.slug}/visits`,
        entityType: "visit",
        entityId: visit.id,
      },
    });

    return { visit, notification, reusedExisting: false };
  };

  const result = ('$transaction' in prisma)
    ? await (prisma as PrismaClient).$transaction(runInTransaction)
    : await runInTransaction(prisma as Prisma.TransactionClient);

  if (!result.reusedExisting) {
    await notifyVisitScheduled(
      organization.id,
      organization.slug,
      lead.fullName,
      property.title,
      scheduledAt,
    );
  }

  return {
    ...result,
    organizationSlug: organization.slug,
    propertyId: property.id,
  };
}

export type CreateAgentVisitParams = {
  organizationId: string;
  leadId: string;
  scheduledAt: Date;
  propertyId?: string | null;
  developmentId?: string | null;
  lotId?: string | null;
  targetLabel?: string | null;
  status?: VisitStatus;
  notes?: string;
};

/**
 * Crea (o reutiliza) una visita coordinada por el agente IA. A diferencia de
 * `createVisitForAutomation`, NO requiere que el lead tenga una propiedad: la
 * visita puede ser a un desarrollo/lote. Queda como PENDING para que el humano
 * la confirme. Dedup: si ya hay una visita activa para ese lead + mismo destino,
 * la reutiliza (actualiza horario/notas) en vez de duplicar.
 */
export async function createAgentVisit(
  prisma: PrismaClient | Prisma.TransactionClient,
  params: CreateAgentVisitParams,
) {
  const organization = await prisma.organization.findUnique({
    where: { id: params.organizationId },
    select: { id: true, slug: true },
  });

  if (!organization) {
    throw new VisitAutomationError("missing-organization", "Organization not found.");
  }

  const lead = await prisma.lead.findFirst({
    where: { id: params.leadId, organizationId: organization.id },
    select: { id: true, fullName: true, ownerId: true },
  });

  if (!lead) {
    throw new VisitAutomationError("missing-lead", "Lead not found in organization.");
  }

  const scheduledAt = new Date(params.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new VisitAutomationError("invalid-visit", "Visit date is invalid.");
  }

  // Vincular el lead al desarrollo (paridad CRM con propiedades): si coordina una
  // visita a un desarrollo, queda asociado a ese desarrollo en el CRM.
  if (params.developmentId) {
    await prisma.lead
      .updateMany({
        where: { id: lead.id, developmentId: null },
        data: { developmentId: params.developmentId, ...(params.lotId ? { lotId: params.lotId } : {}) },
      })
      .catch(() => {});
  }

  const fallbackOwner = await prisma.membership.findFirst({
    where: { organizationId: organization.id },
    select: { userId: true },
    orderBy: { createdAt: "asc" },
  });

  const ownerId = lead.ownerId || fallbackOwner?.userId;
  if (!ownerId) {
    throw new VisitAutomationError("missing-owner", "No valid owner was found to attribute the visit.");
  }

  // ¿Ya hay una visita activa para este lead y este destino? La reutilizamos.
  // Matcheamos por desarrollo O por propiedad (cualquiera que coincida), para no
  // duplicar cuando el agente a veces matchea por propiedad y a veces por desarrollo
  // (el lead tiene una sola visita activa para el mismo destino).
  const targetOr: Array<{ developmentId: string } | { propertyId: string }> = [];
  if (params.developmentId) targetOr.push({ developmentId: params.developmentId });
  if (params.propertyId) targetOr.push({ propertyId: params.propertyId });

  const existing = await prisma.visit.findFirst({
    where: {
      organizationId: organization.id,
      leadId: lead.id,
      status: { in: [VisitStatus.PENDING, VisitStatus.CONFIRMED] },
      ...(targetOr.length ? { OR: targetOr } : {}),
    },
    select: { id: true, status: true },
  });

  if (existing) {
    await prisma.visit.update({
      where: { id: existing.id },
      data: {
        scheduledAt,
        notes: params.notes ?? undefined,
        targetLabel: params.targetLabel ?? undefined,
        propertyId: params.propertyId ?? undefined,
        developmentId: params.developmentId ?? undefined,
        lotId: params.lotId ?? undefined,
      },
    });

    return { visitId: existing.id, reusedExisting: true, organizationSlug: organization.slug };
  }

  const visit = await prisma.visit.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      propertyId: params.propertyId ?? null,
      developmentId: params.developmentId ?? null,
      lotId: params.lotId ?? null,
      targetLabel: params.targetLabel ?? null,
      createdById: ownerId,
      scheduledAt,
      status: params.status ?? VisitStatus.PENDING,
      notes: params.notes ?? "Visita coordinada por el agente IA.",
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: LeadStatus.VISIT, lastContactAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      organizationId: organization.id,
      type: NotificationType.VISIT_CREATED,
      title: `Visita por confirmar: ${lead.fullName}`,
      body: `${params.targetLabel ?? "Visita"} — ${scheduledAt.toLocaleString("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}.`,
      link: `/${organization.slug}/visits`,
      entityType: "visit",
      entityId: visit.id,
    },
  });

  return { visitId: visit.id, reusedExisting: false, organizationSlug: organization.slug };
}

/**
 * Cancela (status CANCELED) las visitas activas de un lead. La usa el agente
 * cuando el prospecto confirma que cancela. No borra: deja historial en el CRM.
 */
export async function cancelAgentVisitsForLead(
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationId: string,
  leadId: string,
): Promise<number> {
  const result = await prisma.visit.updateMany({
    where: {
      organizationId,
      leadId,
      status: { in: [VisitStatus.PENDING, VisitStatus.CONFIRMED] },
    },
    data: { status: VisitStatus.CANCELED },
  });

  return result.count;
}
