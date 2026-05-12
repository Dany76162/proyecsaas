import "server-only";
import { prisma } from "@/server/db/prisma";
import { 
  AgentAutonomyLevel, 
  AgentLogLevel, 
  Prisma,
  AgentScope
} from "@prisma/client";
import { createAgentLog } from "./service";

export type AgentGovernanceOverview = {
  agentId: string;
  name: string;
  tasksToday: number;
  runsToday: number;
  policy: {
    maxTasksPerDay: number | null;
    maxRunsPerDay: number | null;
    autonomyLevel: AgentAutonomyLevel;
    isPaused: boolean;
  };
  isBlocked: boolean;
  isNearLimit: boolean;
};

export async function getAgentGovernancePolicy(agentId: string) {
  let policy = await prisma.agentGovernancePolicy.findUnique({
    where: { agentId }
  });

  if (!policy) {
    // Default policy creation
    policy = await prisma.agentGovernancePolicy.create({
      data: {
        agentId,
        maxTasksPerDay: 10,
        maxRunsPerDay: 50,
        autonomyLevel: AgentAutonomyLevel.REQUIRE_APPROVAL
      }
    });
  }

  return policy;
}

export async function checkAgentOperationalLimit(agentId: string, action: 'TASK' | 'RUN' | 'AUTOMATION'): Promise<{ allowed: boolean; reason?: string }> {
  const policy = await getAgentGovernancePolicy(agentId);
  
  if (policy.isPaused) {
    return { allowed: false, reason: `Agente pausado: ${policy.pauseReason || 'Sin razón especificada'}` };
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (action === 'TASK') {
    const tasksToday = await prisma.agentTask.count({
      where: { agentId, createdAt: { gte: startOfToday } }
    });
    if (policy.maxTasksPerDay && tasksToday >= policy.maxTasksPerDay) {
      await logGovernanceViolation(agentId, `Límite de tareas diarias alcanzado (${policy.maxTasksPerDay})`);
      return { allowed: false, reason: "Límite de tareas diarias alcanzado" };
    }
  }

  if (action === 'RUN') {
    const runsToday = await prisma.agentRun.count({
      where: { agentId, startedAt: { gte: startOfToday } }
    });
    if (policy.maxRunsPerDay && runsToday >= policy.maxRunsPerDay) {
      await logGovernanceViolation(agentId, `Límite de ejecuciones diarias alcanzado (${policy.maxRunsPerDay})`);
      return { allowed: false, reason: "Límite de ejecuciones diarias alcanzado" };
    }
  }

  return { allowed: true };
}

async function logGovernanceViolation(agentId: string, message: string) {
  await createAgentLog({
    level: AgentLogLevel.WARN,
    message: `[GOVERNANCE] ${message}`,
    metadata: { violation: true, agentId }
  });
}

export async function updateAgentGovernancePolicy(agentId: string, data: Partial<Prisma.AgentGovernancePolicyUpdateInput>) {
  return prisma.agentGovernancePolicy.update({
    where: { agentId },
    data
  });
}

export async function getPlatformGovernanceOverview(): Promise<AgentGovernanceOverview[]> {
  const agents = await prisma.agent.findMany({
    where: { scope: AgentScope.PLATFORM, isActive: true },
    include: { governance: true }
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const overview = await Promise.all(agents.map(async (agent) => {
    const [tasks, runs] = await Promise.all([
      prisma.agentTask.count({ where: { agentId: agent.id, createdAt: { gte: startOfToday } } }),
      prisma.agentRun.count({ where: { agentId: agent.id, startedAt: { gte: startOfToday } } })
    ]);

    const policy = agent.governance || {
      maxTasksPerDay: 10,
      maxRunsPerDay: 50,
      autonomyLevel: AgentAutonomyLevel.REQUIRE_APPROVAL,
      isPaused: false
    };

    const isBlocked = (policy.maxTasksPerDay && tasks >= policy.maxTasksPerDay) || 
                      (policy.maxRunsPerDay && runs >= policy.maxRunsPerDay) ||
                      policy.isPaused;

    return {
      agentId: agent.id,
      name: agent.name,
      tasksToday: tasks,
      runsToday: runs,
      policy: {
        maxTasksPerDay: policy.maxTasksPerDay,
        maxRunsPerDay: policy.maxRunsPerDay,
        autonomyLevel: policy.autonomyLevel,
        isPaused: policy.isPaused
      },
      isBlocked: !!isBlocked,
      isNearLimit: !!(!isBlocked && (
        (policy.maxTasksPerDay && tasks >= (policy.maxTasksPerDay * 0.8)) ||
        (policy.maxRunsPerDay && runs >= (policy.maxRunsPerDay * 0.8))
      ))
    };
  }));

  return overview;
}
