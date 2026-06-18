import "server-only";

import { prisma } from "@/server/db/prisma";
import { readLeadCommercialSignals } from "@/modules/leads/commercial-signals";
import { sanitizeVisitNotes } from "@/modules/visits/service";

import type {
  LeadDetail,
  LeadListItem,
  LeadStage,
  LeadSummary,
} from "@/modules/leads/types";

const CLOSED_STAGE: LeadStage = "CLOSED";
const CONTACTED_STAGE: LeadStage = "CONTACTED";
const INTERESTED_STAGE: LeadStage = "INTERESTED";
const NEW_STAGE: LeadStage = "NEW";
const VISIT_STAGE: LeadStage = "VISIT";

export async function listOrganizationLeads(
  orgSlug: string,
  q?: string,
): Promise<LeadListItem[]> {
  const leads = await prisma.lead.findMany({
    where: {
      organization: {
        slug: orgSlug,
      },
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      property: true,
      owner: true,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  // developmentId es escalar (sin relación): resolvemos los nombres en una query
  // para mostrar el desarrollo vinculado cuando el lead no tiene propiedad.
  const devIds = [...new Set(leads.map((l) => l.developmentId).filter((id): id is string => Boolean(id)))];
  const devs = devIds.length
    ? await prisma.development.findMany({ where: { id: { in: devIds } }, select: { id: true, name: true } })
    : [];
  const devNameById = new Map(devs.map((d) => [d.id, d.name]));

  return leads.map((lead) => {
    const signals = readLeadCommercialSignals({
      notes: lead.notes,
      interestLabel: lead.interestLabel,
      budgetLabel: lead.budgetLabel,
    });

    return {
      id: lead.id,
      fullName: lead.fullName,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      status: lead.status,
      source: lead.source ?? "Ingreso manual",
      notes: signals.notes || "Oportunidad lista para calificación.",
      interestLabel: lead.interestLabel ?? "Nueva consulta",
      budgetLabel: lead.budgetLabel ?? "Pendiente de calificación",
      ownerName: lead.owner?.fullName ?? "Sin asignar",
      propertyId: lead.propertyId ?? undefined,
      propertyTitle:
        lead.property?.title ??
        (lead.developmentId ? devNameById.get(lead.developmentId) : undefined) ??
        "Sin propiedad vinculada",
      developmentId: lead.developmentId ?? undefined,
      developmentName: (lead.developmentId ? devNameById.get(lead.developmentId) : undefined) ?? undefined,
      lastContactAt: (lead.lastContactAt ?? lead.updatedAt).toISOString(),
      leadTemperature: signals.leadTemperature,
    };
  });
}

export async function getLeadSummary(orgSlug: string): Promise<LeadSummary> {
  const orgWhere = { organization: { slug: orgSlug } };
  const [total, newCount, contactedCount, interestedCount, visitCount, closedCount] =
    await Promise.all([
      prisma.lead.count({ where: orgWhere }),
      prisma.lead.count({ where: { ...orgWhere, status: NEW_STAGE } }),
      prisma.lead.count({ where: { ...orgWhere, status: CONTACTED_STAGE } }),
      prisma.lead.count({ where: { ...orgWhere, status: INTERESTED_STAGE } }),
      prisma.lead.count({ where: { ...orgWhere, status: VISIT_STAGE } }),
      prisma.lead.count({ where: { ...orgWhere, status: CLOSED_STAGE } }),
    ]);

  return { total, newCount, contactedCount, interestedCount, visitCount, closedCount };
}

export async function getLeadDetail(
  orgSlug: string,
  leadId: string,
): Promise<LeadDetail | null> {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organization: {
        slug: orgSlug,
      },
    },
    include: {
      property: true,
      owner: true,
      conversations: {
        where: {
          organization: {
            slug: orgSlug,
          },
        },
        take: 1,
        select: {
          id: true,
          status: true,
          subject: true,
          participantName: true,
          participantPhone: true,
          followUpActive: true,
          followUpCategory: true,
          followUpReason: true,
          followUpActiveAt: true,
          lastMessageAt: true,
          updatedAt: true,
          messages: {
            orderBy: {
              sentAt: "desc",
            },
            take: 12,
            select: {
              id: true,
              direction: true,
              body: true,
              senderName: true,
              sentAt: true,
              deliveryStatus: true,
              deliveryError: true,
            },
          },
        },
        orderBy: [{ followUpActiveAt: "desc" }, { updatedAt: "desc" }],
      },
      visits: {
        include: {
          property: true,
        },
        orderBy: {
          scheduledAt: "asc",
        },
      },
    },
  });

  if (!lead) {
    return null;
  }

  // developmentId es escalar: resolvemos el nombre del desarrollo vinculado.
  const developmentName = lead.developmentId
    ? (
        await prisma.development.findUnique({
          where: { id: lead.developmentId },
          select: { name: true },
        })
      )?.name ?? null
    : null;

  const activity = [
    {
      id: `${lead.id}_created`,
      title: "Oportunidad creada",
      description: lead.source
        ? `La oportunidad ingresó al CRM desde ${lead.source}.`
        : "La oportunidad ingresó al CRM y está lista para calificación.",
      happenedAt: lead.createdAt.toISOString(),
    },
    ...(lead.updatedAt.getTime() !== lead.createdAt.getTime()
      ? [
          {
            id: `${lead.id}_updated`,
            title: "Oportunidad actualizada",
            description: "Se actualizaron datos de la oportunidad, etapa o propiedad asignada.",
            happenedAt: lead.updatedAt.toISOString(),
          },
        ]
      : []),
    ...(lead.property
      ? [
          {
            id: `${lead.id}_property`,
            title: "Propiedad vinculada",
            description: `La oportunidad está vinculada a ${lead.property.title}.`,
            happenedAt: (lead.lastContactAt ?? lead.updatedAt).toISOString(),
          },
        ]
      : []),
    ...(!lead.property && developmentName
      ? [
          {
            id: `${lead.id}_development`,
            title: "Desarrollo vinculado",
            description: `La oportunidad está vinculada al desarrollo ${developmentName}.`,
            happenedAt: (lead.lastContactAt ?? lead.updatedAt).toISOString(),
          },
        ]
      : []),
  ].sort((left, right) => right.happenedAt.localeCompare(left.happenedAt));

  const visits = lead.visits.map((visit) => ({
    id: visit.id,
    scheduledAt: visit.scheduledAt.toISOString(),
    status: visit.status,
    notes: sanitizeVisitNotes(visit.notes),
    propertyTitle: visit.property?.title ?? "Propiedad no disponible",
  }));

  const signals = readLeadCommercialSignals({
    notes: lead.notes,
    interestLabel: lead.interestLabel,
    budgetLabel: lead.budgetLabel,
  });
  const conversationContextSource = lead.conversations[0] ?? null;
  const activeFollowUpConversation = lead.conversations.find((conversation) => conversation.followUpActive);
  const conversationContext = conversationContextSource
    ? {
        id: conversationContextSource.id,
        status: conversationContextSource.status,
        subject: conversationContextSource.subject ?? "Conversación sobre propiedad",
        participantName: conversationContextSource.participantName ?? "Participante desconocido",
        participantPhone: conversationContextSource.participantPhone ?? "Teléfono pendiente",
        followUpActive: conversationContextSource.followUpActive,
        followUpCategory: conversationContextSource.followUpCategory,
        followUpReason: conversationContextSource.followUpReason,
        lastMessageAt: (
          conversationContextSource.lastMessageAt ?? conversationContextSource.updatedAt
        ).toISOString(),
        messages: [...conversationContextSource.messages]
          .sort((left, right) => left.sentAt.getTime() - right.sentAt.getTime())
          .map((message) => ({
            id: message.id,
            direction: message.direction,
            body: message.body,
            senderName: message.senderName ?? "Remitente desconocido",
            sentAt: message.sentAt.toISOString(),
            deliveryStatus: message.deliveryStatus,
            deliveryError: message.deliveryError ?? null,
          })),
      }
    : null;

  return {
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    status: lead.status,
    source: lead.source ?? "Ingreso manual",
    notes: signals.notes || "Oportunidad lista para calificación.",
    interestLabel: lead.interestLabel ?? "Nueva consulta",
    budgetLabel: lead.budgetLabel ?? "Pendiente de calificación",
    ownerName: lead.owner?.fullName ?? "Sin asignar",
    assignedUserEmail: lead.owner?.email ?? "Sin correo asignado",
    propertyId: lead.propertyId ?? undefined,
    propertyTitle: lead.property?.title ?? developmentName ?? "Sin propiedad vinculada",
    developmentId: lead.developmentId ?? undefined,
    developmentName: developmentName ?? undefined,
    lastContactAt: (lead.lastContactAt ?? lead.updatedAt).toISOString(),
    leadTemperature: signals.leadTemperature,
    propertyMatch: signals.propertyMatch,
    nextBestAction: signals.nextBestAction,
    automationSummary: signals.automationSummary,
    requiresFollowUp: Boolean(activeFollowUpConversation),
    followUpReason: activeFollowUpConversation?.followUpReason ?? null,
    extractedPreferences: signals.extractedPreferences,
    activity,
    visits,
    followUpCategory: activeFollowUpConversation?.followUpCategory ?? null,
    conversationContext,
  };
}
