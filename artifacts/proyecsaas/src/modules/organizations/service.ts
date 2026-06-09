import "server-only";

import { PropertyStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

import type {
  OrganizationSummary,
  OrganizationWorkspace,
  SetupChecklistStatus,
  WorkspaceNotification,
} from "@/modules/organizations/types";

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
    city: organization.city ?? "Ciudad no especificada",
    planLabel: organization.planLabel ?? "Starter",
    marketFocus: organization.marketFocus ?? "Operaciones generales inmobiliarias",
    description: organization.description ?? "Perfil del workspace pendiente.",
    memberCount: organization._count.memberships,
    leadCount: organization._count.leads,
    propertyCount: organization._count.properties,
  } satisfies OrganizationSummary;
}

/**
 * INTERNAL / ADMIN USE ONLY â€” returns all organizations with no auth or tenant scoping.
 * Must never be called from user-facing pages, components, or server actions.
 * For user-facing org lists, use listOrganizationsForUser(userId) instead.
 */
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

export async function listOrganizationsForUser(
  userId: string,
): Promise<OrganizationSummary[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      user: {
        isActive: true,
      },
      organization: {
        isActive: true,
        deletedAt: null,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      organization: {
        include: {
          _count: {
            select: {
              memberships: true,
              leads: true,
              properties: true,
            },
          },
        },
      },
    },
  });

  return memberships.map(({ organization }) => buildOrganizationSummary(organization));
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

  if (organization.deletedAt) {
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

export async function getOrganizationSwitcherItems(userId: string): Promise<OrganizationSummary[]> {
  return listOrganizationsForUser(userId);
}

export async function getSetupChecklistStatus(
  orgSlug: string,
): Promise<SetupChecklistStatus> {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      name: true,
      city: true,
      deletedAt: true,
      _count: { select: { properties: true } },
      aiAgents: {
        select: { id: true, status: true, whatsappChannelId: true },
      },
      whatsappChannels: {
        where: { status: "ACTIVE" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!org) {
    return {
      profileComplete: false,
      propertiesLoaded: false,
      agentConfigured: false,
      whatsappConnected: false,
      readyToOperate: false,
      completedCount: 0,
      totalCount: 5,
      isComplete: false,
    };
  }

  if (org.deletedAt) {
    return {
      profileComplete: false,
      propertiesLoaded: false,
      agentConfigured: false,
      whatsappConnected: false,
      readyToOperate: false,
      completedCount: 0,
      totalCount: 5,
      isComplete: false,
    };
  }

  const profileComplete = Boolean(org.name?.trim() && org.city?.trim());
  const propertiesLoaded = org._count.properties > 0;
  const agentConfigured = Boolean(
    org.aiAgents[0] &&
    org.aiAgents[0].status === "ACTIVE" &&
    org.aiAgents[0].whatsappChannelId,
  );
  const whatsappConnected = org.whatsappChannels.length > 0;

  const panoramasCount = await prisma.propertyPanorama.count({
    where: { property: { organization: { slug: orgSlug } } },
  });
  const tourReady = panoramasCount > 0;
  const readyToOperate = tourReady;

  const completedCount = [
    profileComplete,
    propertiesLoaded,
    agentConfigured,
    whatsappConnected,
    tourReady,
  ].filter(Boolean).length;

  return {
    profileComplete,
    propertiesLoaded,
    agentConfigured,
    whatsappConnected,
    readyToOperate,
    completedCount,
    totalCount: 5,
    isComplete: completedCount === 5,
  };
}

export async function listWorkspaceNotifications(
  orgSlug: string,
): Promise<WorkspaceNotification[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      organization: {
        slug: orgSlug,
      },
      readAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link ?? undefined,
    createdAt: notification.createdAt.toISOString(),
  }));
}
