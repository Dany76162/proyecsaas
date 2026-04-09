import { prisma } from "@/server/db/prisma";
import { buildAgentSummary, type AgentDetail, type AgentSummary } from "./types";

export async function getAgentsForOrg(orgId: string): Promise<AgentSummary[]> {
  const agents = await prisma.aiAgent.findMany({
    where: { organizationId: orgId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return agents.map(buildAgentSummary);
}

export async function getAgentDetail(agentId: string, orgId: string): Promise<AgentDetail | null> {
  const agent = await prisma.aiAgent.findFirst({
    where: { id: agentId, organizationId: orgId },
    include: {
      organization: {
        include: {
          whatsappChannels: {
            select: {
              id: true,
              displayPhoneNumber: true,
              verifiedDisplayName: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!agent) return null;

  const assignedChannel = agent.whatsappChannelId
    ? agent.organization.whatsappChannels.find((ch) => ch.id === agent.whatsappChannelId) ?? null
    : null;

  return {
    ...buildAgentSummary(agent),
    whatsappChannel: assignedChannel
      ? {
          id: assignedChannel.id,
          displayPhoneNumber: assignedChannel.displayPhoneNumber,
          verifiedDisplayName: assignedChannel.verifiedDisplayName,
          status: assignedChannel.status,
        }
      : null,
  };
}

export async function getAgentStatsForOrg(orgId: string) {
  const [total, active, paused] = await Promise.all([
    prisma.aiAgent.count({ where: { organizationId: orgId } }),
    prisma.aiAgent.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    prisma.aiAgent.count({ where: { organizationId: orgId, status: "PAUSED" } }),
  ]);

  return { total, active, paused, draft: total - active - paused };
}

export async function getAvailableChannels(orgId: string) {
  return prisma.whatsAppChannel.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      displayPhoneNumber: true,
      verifiedDisplayName: true,
      status: true,
    },
  });
}
