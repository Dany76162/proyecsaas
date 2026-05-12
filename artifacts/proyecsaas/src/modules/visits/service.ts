import { LeadStatus, NotificationType, VisitStatus, Prisma, PrismaClient } from "@prisma/client";

import type { VisitListItem, VisitSummary } from "@/modules/visits/types";

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
      notes: visit.notes ?? "Visita agendada desde el workspace.",
      propertyId: visit.propertyId,
      propertyTitle: visit.property.title,
      leadId: visit.leadId ?? "",
      leadName: visit.lead?.fullName ?? "Lead desconocido",
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
        notes: params.notes ?? "Visita creada desde el flujo de automatizaciÃ³n.",
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

  return {
    ...result,
    organizationSlug: organization.slug,
    propertyId: property.id,
  };
}
