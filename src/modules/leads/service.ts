import "server-only";

import { LeadStatus } from "@prisma/client";

import {
  getDemoOrganizationBySlug,
  listDemoLeadsByOrganization,
  listDemoUsersByOrganization,
} from "@/server/demo/workspace-store";

import type { LeadListItem, LeadSummary } from "@/modules/leads/types";

export async function listOrganizationLeads(
  orgSlug: string,
): Promise<LeadListItem[]> {
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return [];
  }

  const users = listDemoUsersByOrganization(organization.id);

  return listDemoLeadsByOrganization(organization.id).map((lead) => ({
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    notes: lead.notes,
    interestLabel: lead.interestLabel,
    budgetLabel: lead.budgetLabel,
    ownerName:
      users.find((user) => user.id === lead.ownerId)?.fullName ?? "Unassigned",
    lastContactAt: lead.lastContactAt,
  }));
}

export async function getLeadSummary(orgSlug: string): Promise<LeadSummary> {
  const leads = await listOrganizationLeads(orgSlug);

  return {
    total: leads.length,
    newCount: leads.filter((lead) => lead.status === LeadStatus.NEW).length,
    qualifiedCount: leads.filter((lead) => lead.status === LeadStatus.QUALIFIED).length,
    ownerCoverage: new Set(leads.map((lead) => lead.ownerName)).size,
  };
}
