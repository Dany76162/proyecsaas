import "server-only";

import { VisitStatus } from "@prisma/client";

import {
  getDemoOrganizationBySlug,
  getDemoPropertyById,
  listDemoLeadsByOrganization,
  listDemoUsersByOrganization,
  listDemoVisitsByOrganization,
} from "@/server/demo/workspace-store";

import type { VisitListItem, VisitSummary } from "@/modules/visits/types";

export async function listOrganizationVisits(
  orgSlug: string,
): Promise<VisitListItem[]> {
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return [];
  }

  const leads = listDemoLeadsByOrganization(organization.id);
  const users = listDemoUsersByOrganization(organization.id);

  return listDemoVisitsByOrganization(organization.id)
    .map((visit) => ({
      id: visit.id,
      scheduledAt: visit.scheduledAt,
      status: visit.status,
      notes: visit.notes,
      propertyId: visit.propertyId,
      propertyTitle:
        getDemoPropertyById(organization.id, visit.propertyId)?.title ?? "Unknown property",
      leadId: visit.leadId,
      leadName: leads.find((lead) => lead.id === visit.leadId)?.fullName ?? "Unknown lead",
      ownerName:
        users.find((user) => user.id === visit.createdById)?.fullName ?? "Unassigned",
    }))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function getVisitSummary(orgSlug: string): Promise<VisitSummary> {
  const visits = await listOrganizationVisits(orgSlug);

  return {
    total: visits.length,
    pendingCount: visits.filter((visit) => visit.status === VisitStatus.PENDING).length,
    confirmedCount: visits.filter((visit) => visit.status === VisitStatus.CONFIRMED).length,
    completedCount: visits.filter((visit) => visit.status === VisitStatus.COMPLETED).length,
  };
}
