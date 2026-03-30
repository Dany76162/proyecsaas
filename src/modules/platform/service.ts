import "server-only";

import { prisma } from "@/server/db/prisma";
import type { OrgHealthStatus, OrgPlatformSummary } from "@/modules/platform/types";

export type WorkerStatus = "ok" | "stale" | "down";

export type WorkerHeartbeatStatus = {
  status: WorkerStatus;
  lastSeenAt: string | null;
  secondsAgo: number | null;
};

export async function getWorkerHeartbeatStatus(): Promise<WorkerHeartbeatStatus> {
  const record = await prisma.workerHeartbeat.findUnique({
    where: { id: "singleton" },
    select: { lastSeenAt: true },
  });

  if (!record) {
    return { status: "down", lastSeenAt: null, secondsAgo: null };
  }

  const secondsAgo = Math.floor((Date.now() - record.lastSeenAt.getTime()) / 1000);

  const status: WorkerStatus =
    secondsAgo < 120 ? "ok" : secondsAgo < 300 ? "stale" : "down";

  return {
    status,
    lastSeenAt: record.lastSeenAt.toISOString(),
    secondsAgo,
  };
}

function computeHealth(input: {
  channel: { status: string } | null;
  recentFailedDeliveries: number;
  leadCount: number;
}): OrgHealthStatus {
  if (input.channel?.status === "ERROR") return "critical";
  if (input.recentFailedDeliveries > 0) return "warning";
  if (input.channel && input.channel.status !== "ACTIVE") return "warning";
  if (!input.channel && input.leadCount > 0) return "warning";
  return "ok";
}

export async function listOrganizationsForPlatform(): Promise<OrgPlatformSummary[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [orgs, recentLeads, followUps, recentFailures] = await Promise.all([
    prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        planLabel: true,
        isActive: true,
        _count: {
          select: { memberships: true, leads: true, properties: true },
        },
        memberships: {
          take: 1,
          select: {
            user: { select: { passwordHash: true } },
          },
        },
        whatsappChannels: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          take: 1,
          select: {
            status: true,
            displayPhoneNumber: true,
            lastErrorAt: true,
            lastErrorCode: true,
          },
        },
        conversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 1,
          select: { lastMessageAt: true },
        },
      },
    }),
    prisma.lead.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
    prisma.conversation.groupBy({
      by: ["organizationId"],
      where: { followUpActive: true },
      _count: { _all: true },
    }),
    prisma.message.groupBy({
      by: ["organizationId"],
      where: { deliveryStatus: "FAILED", sentAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
  ]);

  const recentLeadsMap = new Map(recentLeads.map((r) => [r.organizationId, r._count._all]));
  const followUpsMap = new Map(followUps.map((r) => [r.organizationId, r._count._all]));
  const failuresMap = new Map(recentFailures.map((r) => [r.organizationId, r._count._all]));

  return orgs.map((org) => {
    const channel = org.whatsappChannels[0] ?? null;
    const lastActivityAt = org.conversations[0]?.lastMessageAt?.toISOString() ?? null;
    const recentLeadCount = recentLeadsMap.get(org.id) ?? 0;
    const pendingFollowUpCount = followUpsMap.get(org.id) ?? 0;
    const recentFailedDeliveries = failuresMap.get(org.id) ?? 0;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      city: org.city ?? "Unknown city",
      planLabel: org.planLabel ?? "Starter",
      isActive: org.isActive,
      memberCount: org._count.memberships,
      leadCount: org._count.leads,
      propertyCount: org._count.properties,
      recentLeadCount,
      pendingFollowUpCount,
      recentFailedDeliveries,
      lastActivityAt,
      whatsappChannel: channel
        ? {
            status: channel.status,
            displayPhoneNumber: channel.displayPhoneNumber ?? null,
            lastErrorAt: channel.lastErrorAt?.toISOString() ?? null,
            lastErrorCode: channel.lastErrorCode ?? null,
          }
        : null,
      onboardingStatus:
        org._count.memberships === 0
          ? "Sin usuarios"
          : org._count.memberships === 1
            ? org.memberships[0]?.user.passwordHash
              ? "Onboarding iniciado"
              : "Invitación pendiente"
            : "Operativa",
      health: computeHealth({
        channel,
        recentFailedDeliveries,
        leadCount: org._count.leads,
      }),
    } satisfies OrgPlatformSummary;
  });
}
