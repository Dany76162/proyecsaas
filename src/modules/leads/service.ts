import "server-only";

import { prisma } from "@/server/db/prisma";

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
): Promise<LeadListItem[]> {
  const leads = await prisma.lead.findMany({
    where: {
      organization: {
        slug: orgSlug,
      },
    },
    include: {
      property: true,
      owner: true,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return leads.map((lead) => ({
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    status: lead.status,
    source: lead.source ?? "Manual entry",
    notes: lead.notes ?? "Lead record ready for qualification.",
    interestLabel: lead.interestLabel ?? "New inquiry",
    budgetLabel: lead.budgetLabel ?? "Pending qualification",
    ownerName: lead.owner?.fullName ?? "Unassigned",
    propertyId: lead.propertyId ?? undefined,
    propertyTitle: lead.property?.title ?? "No property linked yet",
    lastContactAt: (lead.lastContactAt ?? lead.updatedAt).toISOString(),
  }));
}

export async function getLeadSummary(orgSlug: string): Promise<LeadSummary> {
  const leads = await listOrganizationLeads(orgSlug);

  return {
    total: leads.length,
    newCount: leads.filter((lead) => lead.status === NEW_STAGE).length,
    contactedCount: leads.filter((lead) => lead.status === CONTACTED_STAGE).length,
    interestedCount: leads.filter((lead) => lead.status === INTERESTED_STAGE).length,
    visitCount: leads.filter((lead) => lead.status === VISIT_STAGE).length,
    closedCount: leads.filter((lead) => lead.status === CLOSED_STAGE).length,
  };
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

  const activity = [
    {
      id: `${lead.id}_created`,
      title: "Lead created",
      description: lead.source
        ? `Lead entered the CRM from ${lead.source}.`
        : "Lead entered the CRM and is ready for qualification.",
      happenedAt: lead.createdAt.toISOString(),
    },
    ...(lead.updatedAt.getTime() !== lead.createdAt.getTime()
      ? [
          {
            id: `${lead.id}_updated`,
            title: "Lead updated",
            description: "Core lead details, stage, or property assignment were updated.",
            happenedAt: lead.updatedAt.toISOString(),
          },
        ]
      : []),
    ...(lead.property
      ? [
          {
            id: `${lead.id}_property`,
            title: "Property linked",
            description: `Lead is currently linked to ${lead.property.title}.`,
            happenedAt: (lead.lastContactAt ?? lead.updatedAt).toISOString(),
          },
        ]
      : []),
  ].sort((left, right) => right.happenedAt.localeCompare(left.happenedAt));

  const visits = lead.visits.map((visit) => ({
    id: visit.id,
    scheduledAt: visit.scheduledAt.toISOString(),
    status: visit.status,
    notes: visit.notes ?? "Visit scheduled from the CRM workspace.",
    propertyTitle: visit.property?.title ?? "Property unavailable",
  }));

  return {
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    status: lead.status,
    source: lead.source ?? "Manual entry",
    notes: lead.notes ?? "Lead record ready for qualification.",
    interestLabel: lead.interestLabel ?? "New inquiry",
    budgetLabel: lead.budgetLabel ?? "Pending qualification",
    ownerName: lead.owner?.fullName ?? "Unassigned",
    assignedUserEmail: lead.owner?.email ?? "No assigned user email",
    propertyId: lead.propertyId ?? undefined,
    propertyTitle: lead.property?.title ?? "No property linked yet",
    lastContactAt: (lead.lastContactAt ?? lead.updatedAt).toISOString(),
    activity,
    visits,
  };
}
