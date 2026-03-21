import "server-only";

import { PropertyStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

import type { OrganizationSummary, OrganizationWorkspace } from "@/modules/organizations/types";

function buildOrganizationSummary(organization: {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  planLabel: string | null;
  marketFocus: string | null;
  description: string | null;
  _count: {
    memberships: number;
    leads: number;
    properties: number;
  };
}) {
  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
    city: organization.city ?? "Unknown city",
    planLabel: organization.planLabel ?? "Starter",
    marketFocus: organization.marketFocus ?? "General real estate operations",
    description: organization.description ?? "Workspace overview pending.",
    memberCount: organization._count.memberships,
    leadCount: organization._count.leads,
    propertyCount: organization._count.properties,
  } satisfies OrganizationSummary;
}

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          memberships: true,
          leads: true,
          properties: true,
        },
      },
    },
  });

  return organizations.map((organization) => buildOrganizationSummary(organization));
}

export async function getOrganizationWorkspace(
  orgSlug: string,
): Promise<OrganizationWorkspace | null> {
  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      _count: {
        select: {
          memberships: true,
          leads: true,
          properties: true,
        },
      },
      leads: {
        select: { status: true },
      },
      properties: {
        select: {
          publicVisible: true,
          status: true,
        },
      },
    },
  });

  if (!organization) {
    return null;
  }

  const summary = buildOrganizationSummary(organization);

  return {
    ...summary,
    activeLeadCount: organization.leads.filter((lead) => lead.status !== "CLOSED").length,
    publicPropertyCount: organization.properties.filter((property) => property.publicVisible)
      .length,
    availablePropertyCount: organization.properties.filter(
      (property) => property.status === PropertyStatus.AVAILABLE,
    ).length,
  };
}

export async function getOrganizationSwitcherItems() {
  return listOrganizations();
}
