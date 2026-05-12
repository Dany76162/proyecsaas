import "server-only";

import { prisma } from "@/server/db/prisma";
import { 
  AutomationStatus, 
  AutomationFrequency, 
  AutomationType,
  TaskStatus,
  AgentLogLevel 
} from "@prisma/client";
import { createAgentLog, getActiveAgentByType } from "./service";
import { AgentType } from "@prisma/client";

export async function listAgentAutomations() {
  return prisma.agentAutomation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      agent: { select: { name: true, type: true } },
      goal: { select: { title: true } },
      _count: { select: { tasks: true } }
    }
  });
}

export async function getAgentAutomationDetail(id: string) {
  return prisma.agentAutomation.findUnique({
    where: { id },
    include: {
      agent: { select: { name: true, type: true } },
      goal: { select: { title: true } },
      tasks: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          agent: { select: { name: true } }
        }
      }
    }
  });
}

export async function createAgentAutomation(data: {
  title: string;
  description?: string;
  type: AutomationType;
  frequency: AutomationFrequency;
  agentId?: string;
  goalId?: string;
  dayOfWeek?: number;
  timeOfDay?: string;
  timezone?: string;
  createdById: string;
}) {
  const nextRunAt = calculateNextRun(data.frequency, data.dayOfWeek, data.timeOfDay, data.timezone);

  const automation = await prisma.agentAutomation.create({
    data: {
      ...data,
      status: AutomationStatus.ACTIVE,
      nextRunAt,
    }
  });

  await createAgentLog({
    level: AgentLogLevel.INFO,
    message: `Automatización creada: ${automation.title}`,
    metadata: { automationId: automation.id, frequency: automation.frequency }
  });

  return automation;
}

export async function runAgentAutomationNow(automationId: string, userId: string) {
  const automation = await prisma.agentAutomation.findUnique({
    where: { id: automationId }
  });

  if (!automation) throw new Error("Automatización no encontrada");

  // Si no tiene agente asignado, intentamos buscar el Orquestador por defecto
  let targetAgentId = automation.agentId;
  if (!targetAgentId) {
    const orchestrator = await getActiveAgentByType(AgentType.ORCHESTRATOR);
    targetAgentId = orchestrator?.id || null;
  }

  const task = await prisma.agentTask.create({
    data: {
      scope: "PLATFORM",
      organizationId: null,
      automationId: automation.id,
      goalId: automation.goalId,
      agentId: targetAgentId,
      status: targetAgentId ? TaskStatus.ASSIGNED : TaskStatus.PENDING,
      title: `[AUTO] ${automation.title}`,
      description: automation.description || `Tarea generada automáticamente por la regla: ${automation.title}`,
      priority: "MEDIUM",
      createdById: userId,
      metadata: { 
        isAutomated: true, 
        automationType: automation.type 
      }
    }
  });

  await prisma.agentAutomation.update({
    where: { id: automationId },
    data: { 
      lastRunAt: new Date(),
      nextRunAt: calculateNextRun(automation.frequency, automation.dayOfWeek, automation.timeOfDay, automation.timezone)
    }
  });

  await createAgentLog({
    level: AgentLogLevel.INFO,
    message: `Tarea generada por automatización: ${automation.title}`,
    metadata: { automationId, taskId: task.id }
  });

  return task;
}

export async function toggleAutomationStatus(id: string, active: boolean) {
  return prisma.agentAutomation.update({
    where: { id },
    data: { 
      isActive: active,
      status: active ? AutomationStatus.ACTIVE : AutomationStatus.PAUSED
    }
  });
}

function calculateNextRun(freq: AutomationFrequency, day?: number | null, time?: string | null, tz: string = "UTC"): Date | null {
  if (freq === AutomationFrequency.MANUAL) return null;

  const now = new Date();
  let next = new Date(now);

  // Lógica simple de cálculo de próxima ejecución
  if (freq === AutomationFrequency.DAILY) {
    next.setDate(now.getDate() + 1);
  } else if (freq === AutomationFrequency.WEEKLY) {
    const targetDay = day ?? 1; // Default Monday
    let diff = targetDay - now.getDay();
    if (diff <= 0) diff += 7;
    next.setDate(now.getDate() + diff);
  } else if (freq === AutomationFrequency.MONTHLY) {
    next.setMonth(now.getMonth() + 1);
    next.setDate(1);
  }

  if (time) {
    const [hours, minutes] = time.split(":").map(Number);
    next.setHours(hours || 0, minutes || 0, 0, 0);
  } else {
    next.setHours(9, 0, 0, 0); // Default 9 AM
  }

  return next;
}
