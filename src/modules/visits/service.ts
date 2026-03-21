import "server-only";

import { VisitStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

import type { VisitListItem, VisitSummary } from "@/modules/visits/types";

export async function listOrganizationVisits(
  orgSlug: string,
): Promise<VisitListItem[]> {
  const visits = await prisma.visit.findMany({
    where: {
      organization: {
        slug: orgSlug,
      },
    },
    include: {
      property: true,
      lead: true,
      createdBy: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  return visits.map((visit) => ({
      id: visit.id,
      scheduledAt: visit.scheduledAt.toISOString(),
      status: visit.status,
      notes: visit.notes ?? "Visit scheduled from the CRM workspace.",
      propertyId: visit.propertyId,
      propertyTitle: visit.property.title,
      leadId: visit.leadId ?? "",
      leadName: visit.lead?.fullName ?? "Unknown lead",
      ownerName: visit.createdBy.fullName,
    }));
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
