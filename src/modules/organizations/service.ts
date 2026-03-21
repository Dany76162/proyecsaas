import "server-only";

import { PropertyStatus } from "@prisma/client";

import {
  getDemoOrganizationBySlug,
  listDemoLeadsByOrganization,
  listDemoMembershipsByOrganization,
  listDemoOrganizations,
  listDemoPropertiesByOrganization,
} from "@/server/demo/workspace-store";

import type { OrganizationSummary, OrganizationWorkspace } from "@/modules/organizations/types";

function buildOrganizationSummary(organizationId: string) {
  const organization = listDemoOrganizations().find((item) => item.id === organizationId);

  if (!organization) {
    return null;
  }

  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
    city: organization.city,
    planLabel: organization.planLabel,
    marketFocus: organization.marketFocus,
    description: organization.description,
    memberCount: listDemoMembershipsByOrganization(organization.id).length,
    leadCount: listDemoLeadsByOrganization(organization.id).length,
    propertyCount: listDemoPropertiesByOrganization(organization.id).length,
  } satisfies OrganizationSummary;
}

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  return listDemoOrganizations()
    .map((organization) => buildOrganizationSummary(organization.id))
    .filter((organization): organization is OrganizationSummary => Boolean(organization));
}

export async function getOrganizationWorkspace(
  orgSlug: string,
): Promise<OrganizationWorkspace | null> {
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return null;
  }

  const leads = listDemoLeadsByOrganization(organization.id);
  const properties = listDemoPropertiesByOrganization(organization.id);
  const summary = buildOrganizationSummary(organization.id);

  if (!summary) {
    return null;
  }

  return {
    ...summary,
    activeLeadCount: leads.filter((lead) => lead.status !== "CLOSED").length,
    publicPropertyCount: properties.filter((property) => property.publicVisible).length,
    availablePropertyCount: properties.filter(
      (property) => property.status === PropertyStatus.AVAILABLE,
    ).length,
  };
}

export async function getOrganizationSwitcherItems() {
  return listOrganizations();
}
