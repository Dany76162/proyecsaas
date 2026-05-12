"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/server/auth/access";
import * as governanceService from "./governance-service";
import { AgentAutonomyLevel } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export async function updateGovernancePolicyAction(
  agentId: string, 
  data: {
    maxTasksPerDay?: number;
    maxRunsPerDay?: number;
    autonomyLevel?: AgentAutonomyLevel;
    isPaused?: boolean;
    pauseReason?: string;
  }
) {
  await requirePlatformAdmin();
  
  try {
    await governanceService.updateAgentGovernancePolicy(agentId, data);
    revalidatePath("/platform/agents/governance");
    revalidatePath("/platform/agents");
    return { success: true };
  } catch (err: any) {
    throw new Error(err.message);
  }
}

export async function getGovernanceOverviewAction() {
  await requirePlatformAdmin();
  return governanceService.getPlatformGovernanceOverview();
}

export async function exportAgentLogsAction() {
  await requirePlatformAdmin();
  const logs = await prisma.agentLog.findMany({
    where: { scope: "PLATFORM" },
    orderBy: { timestamp: "desc" },
    take: 1000,
    include: {
      run: { 
        select: { 
          taskId: true, 
          agentId: true,
          agent: { select: { name: true } }
        } 
      }
    }
  });

  return logs.map(log => ({
    timestamp: log.timestamp,
    level: log.level,
    message: log.message,
    agent: log.run?.agent?.name || "System",
    taskId: log.run?.taskId || "N/A",
    metadata: log.metadata
  }));
}
