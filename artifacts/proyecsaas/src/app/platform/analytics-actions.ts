"use server";

import { prisma } from "@/server/db/prisma";
import { requirePlatformAdmin } from "@/server/auth/access";

export type ImpactPeriod = "7d" | "30d" | "365d";

export type OrgImpactRow = {
  orgId: string;
  orgName: string;
  leads: number;
  visits: number;
  conversations: number;
  agentName: string | null;
  agentStatus: "ACTIVE" | "PAUSED" | "DRAFT" | null;
  whatsappPhone: string | null;
};

export type ImpactMetrics = {
  totals: { leads: number; visits: number; conversations: number };
  byOrg: OrgImpactRow[];
};

export async function getImpactMetrics(period: ImpactPeriod): Promise<ImpactMetrics> {
  await requirePlatformAdmin();

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 365;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [orgs, leads, visits, conversations, agents] = await Promise.all([
    prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.visit.groupBy({
      by: ["organizationId"],
      where: { status: "COMPLETED", scheduledAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.conversation.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.aiAgent.findMany({
      where: { organization: { isActive: true } },
      select: {
        organizationId: true,
        name: true,
        status: true,
        whatsappChannelId: true,
      },
    }),
  ]);

  // Fetch WhatsApp phone numbers for agents that have a channel linked
  const channelIds = agents.map((a) => a.whatsappChannelId).filter(Boolean) as string[];
  const channels = channelIds.length > 0
    ? await prisma.whatsAppChannel.findMany({
        where: { id: { in: channelIds } },
        select: { id: true, displayPhoneNumber: true },
      })
    : [];
  const channelPhoneMap = new Map(channels.map((c) => [c.id, c.displayPhoneNumber]));

  const leadsMap = new Map(leads.map((r) => [r.organizationId, r._count._all]));
  const visitsMap = new Map(visits.map((r) => [r.organizationId, r._count._all]));
  const convsMap = new Map(conversations.map((r) => [r.organizationId, r._count._all]));
  const agentsMap = new Map(agents.map((a) => [a.organizationId, a]));

  const byOrg: OrgImpactRow[] = orgs
    .map((org) => {
      const agent = agentsMap.get(org.id);
      return {
        orgId: org.id,
        orgName: org.name,
        leads: leadsMap.get(org.id) ?? 0,
        visits: visitsMap.get(org.id) ?? 0,
        conversations: convsMap.get(org.id) ?? 0,
        agentName: agent?.name ?? null,
        agentStatus: (agent?.status as OrgImpactRow["agentStatus"]) ?? null,
        whatsappPhone: agent?.whatsappChannelId
          ? (channelPhoneMap.get(agent.whatsappChannelId) ?? null)
          : null,
      };
    })
    .sort((a, b) => b.leads + b.visits + b.conversations - (a.leads + a.visits + a.conversations));

  const totals = byOrg.reduce(
    (acc, o) => ({
      leads: acc.leads + o.leads,
      visits: acc.visits + o.visits,
      conversations: acc.conversations + o.conversations,
    }),
    { leads: 0, visits: 0, conversations: 0 },
  );

  return { totals, byOrg };
}
