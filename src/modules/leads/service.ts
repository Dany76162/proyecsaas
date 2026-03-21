import "server-only";

import {
  getDemoLeadById,
  getDemoOrganizationBySlug,
  getDemoPropertyById,
  getDemoUserById,
  listDemoLeadActivities,
  listDemoLeadsByOrganization,
  listDemoUsersByOrganization,
  listDemoVisitsByLead,
} from "@/server/demo/workspace-store";

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
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return [];
  }

  const users = listDemoUsersByOrganization(organization.id);

  return listDemoLeadsByOrganization(organization.id).map((lead) => {
    const property = lead.propertyId
      ? getDemoPropertyById(organization.id, lead.propertyId)
      : null;

    return {
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
      propertyId: lead.propertyId,
      propertyTitle: property?.title ?? "No property linked yet",
      lastContactAt: lead.lastContactAt,
    };
  });
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
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return null;
  }

  const lead = getDemoLeadById(organization.id, leadId);

  if (!lead) {
    return null;
  }

  const property = lead.propertyId
    ? getDemoPropertyById(organization.id, lead.propertyId)
    : null;
  const owner = getDemoUserById(lead.ownerId);
  const activity = listDemoLeadActivities(organization.id, lead.id).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    happenedAt: item.happenedAt,
  }));
  const visits = listDemoVisitsByLead(organization.id, lead.id).map((visit) => ({
    id: visit.id,
    scheduledAt: visit.scheduledAt,
    status: visit.status,
    notes: visit.notes,
    propertyTitle:
      getDemoPropertyById(organization.id, visit.propertyId)?.title ?? "Property unavailable",
  }));

  return {
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    notes: lead.notes,
    interestLabel: lead.interestLabel,
    budgetLabel: lead.budgetLabel,
    ownerName: owner?.fullName ?? "Unassigned",
    assignedUserEmail: owner?.email ?? "No assigned user email",
    propertyId: lead.propertyId,
    propertyTitle: property?.title ?? "No property linked yet",
    lastContactAt: lead.lastContactAt,
    activity,
    visits,
  };
}
