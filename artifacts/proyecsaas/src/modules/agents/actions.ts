"use server";
import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpenAIClient, createAgentLog, getActiveAgentByType, inferPlatform, formatOpenAIPrompt, parseMarketingResponse, OPENAI_MODEL } from "@/modules/agents/service";
import { prisma } from "@/server/db/prisma";
import { assertMinimumRole, requireOrganizationMembership, requirePlatformAdmin } from "@/server/auth/access";
import { ApprovalStatus, AgentType, AgentLogLevel, TaskStatus, RunStatus, DraftStatus, MembershipRole, GoalType, GoalStatus } from "@prisma/client";
import type { ContentPlatform, AgentPriority } from "@prisma/client";
import { createAgentGoal, suggestTasksForGoal } from "./goals-service";
import { createAgentAutomation, runAgentAutomationNow, toggleAutomationStatus } from "./automations-service";
import { AutomationType, AutomationFrequency } from "@prisma/client";

export async function createAgentTask(formData: FormData) {
  const sessionUser = await requirePlatformAdmin();

  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const priority = formData.get("priority")?.toString() as AgentPriority | null;
  const platform = formData.get("platform")?.toString() as ContentPlatform | null;
  const contentType = formData.get("contentType")?.toString()?.trim() || "post";
  const goalId = formData.get("goalId")?.toString();

  if (!title || !description || !priority) {
    throw new Error("Título, descripción y prioridad son obligatorios");
  }

  const task = await prisma.agentTask.create({
    data: {
      scope: "PLATFORM",
      organizationId: null,
      title,
      description,
      priority,
      goalId: goalId || null,
      createdById: sessionUser.id,
      metadata: { contentType, platform },
    },
  });

  await createAgentLog({
    level: AgentLogLevel.INFO,
    message: `Tarea creada: ${title}`,
    metadata: { taskId: task.id, priority, platform },
  });

  const orchestrator = await getActiveAgentByType(AgentType.ORCHESTRATOR);
  if (!orchestrator) {
    await prisma.agentTask.update({ where: { id: task.id }, data: { status: TaskStatus.FAILED } });
    throw new Error("No se encontró Director Operativo IA activo");
  }

  await prisma.agentTask.update({ where: { id: task.id }, data: { agentId: orchestrator.id, status: TaskStatus.ASSIGNED } });

  await createAgentLog({
    level: AgentLogLevel.INFO,
    message: `Agente asignado: ${orchestrator.name}`,
    metadata: { taskId: task.id, agentId: orchestrator.id },
  });

  try {
    await processTaskWithOrchestrator(task.id, orchestrator.id, sessionUser.id);
  } catch (err) {
    // processTaskWithOrchestrator already marks task/run as FAILED and logs internally,
    // so we swallow here to allow the redirect to proceed gracefully.
    console.error("[AgentOS] Error en generación (ya registrado en logs):", err instanceof Error ? err.message : err);
  }

  redirect("/platform/agents/tasks");
}

export async function approveOrRejectDraft(formData: FormData) {
  const sessionUser = await requirePlatformAdmin();
  const approvalId = formData.get("approvalId")?.toString();
  const decision = formData.get("decision")?.toString() as ApprovalStatus | null;
  const comments = formData.get("comments")?.toString() ?? "";

  if (!approvalId || !decision || !Object.values(ApprovalStatus).includes(decision)) {
    throw new Error("Decisión de aprobación inválida");
  }

  const approval = await prisma.agentApproval.findUnique({
    where: { id: approvalId },
    include: { task: true, run: true },
  });

  if (!approval) {
    throw new Error("Aprobación no encontrada");
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error("Esta aprobación ya fue procesada");
  }

  await prisma.agentApproval.update({
    where: { id: approvalId },
    data: {
      status: decision,
      comments: comments || null,
      decidedByUserId: sessionUser.id,
      decidedAt: new Date(),
    },
  });

  const draft = await prisma.contentDraft.findFirst({ where: { taskId: approval.taskId } });

  if (draft) {
    await prisma.contentDraft.update({
      where: { id: draft.id },
      data: {
        status: decision === ApprovalStatus.APPROVED ? DraftStatus.APPROVED : DraftStatus.REJECTED,
      },
    });
  }

  await prisma.agentTask.update({
    where: { id: approval.taskId },
    data: {
      status: decision === ApprovalStatus.APPROVED ? TaskStatus.COMPLETED : TaskStatus.FAILED,
    },
  });

  revalidatePath("/platform/agents/approvals");

  await createAgentLog({
    runId: approval.runId ?? undefined,
    level: AgentLogLevel.INFO,
    message: `Decisión registrada: Borrador ${decision === ApprovalStatus.APPROVED ? "aprobado" : "rechazado"} por ${sessionUser.fullName}`,
    metadata: { approvalId, decision, comments },
  });

  redirect("/platform/agents/approvals");
}

export async function toggleAgentStatus(orgSlug: string, agentId: string) {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const agent = await prisma.agent.findFirst({
    where: {
      id: agentId,
      organizationId: membership.organization.id,
    },
    select: { id: true, isActive: true },
  });

  if (!agent) {
    throw new Error("Agente no encontrado");
  }

  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      isActive: !agent.isActive,
    },
  });

  revalidatePath(`/${orgSlug}/agents`);
}

async function processTaskWithOrchestrator(taskId: string, orchestratorId: string, userId: string) {
  const task = await prisma.agentTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Tarea no encontrada");

  const orchestratorRun = await prisma.agentRun.create({
    data: {
      scope: "PLATFORM",
      organizationId: null,
      taskId,
      agentId: orchestratorId,
      status: RunStatus.RUNNING,
      input: { title: task.title, description: task.description, metadata: task.metadata },
    },
  });

  await createAgentLog({
    runId: orchestratorRun.id,
    level: AgentLogLevel.INFO,
    message: "Inicio de ejecución del Director Operativo IA",
    metadata: { taskId },
  });

  const platform = inferPlatform(task.description ?? "", (task.metadata as { platform?: string } | null)?.platform ?? null);
  const contentType = (task.metadata as { contentType?: string } | null)?.contentType ?? "post";

  await prisma.agentTask.update({
    where: { id: task.id },
    data: { metadata: { contentType, platform }, status: TaskStatus.IN_PROGRESS },
  });

  const marketingAgent = await getActiveAgentByType(AgentType.MARKETING);
  if (!marketingAgent) {
    await prisma.agentRun.update({ where: { id: orchestratorRun.id }, data: { status: RunStatus.FAILED, error: "Marketing agent no activo" } });
    await createAgentLog({
      runId: orchestratorRun.id,
      level: AgentLogLevel.ERROR,
      message: "No se encontró Agente de Marketing activo",
      metadata: { taskId },
    });
    await prisma.agentTask.update({ where: { id: task.id }, data: { status: TaskStatus.FAILED } });
    return;
  }

  try {
    const client = getOpenAIClient();
    const prompt = formatOpenAIPrompt({ title: task.title, description: task.description ?? "", platform });
    await createAgentLog({
      runId: orchestratorRun.id,
      level: AgentLogLevel.INFO,
      message: "Prompt enviado a OpenAI",
      metadata: { taskId, platform, contentType },
    });

    const completion = await Promise.race([
      client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 700,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("OpenAI timeout")), 30000)),
    ]) as { choices: Array<{ message: { content?: string } }> };

    const responseText = completion.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = parseMarketingResponse(responseText);

    const marketingRun = await prisma.agentRun.create({
      data: {
        scope: "PLATFORM",
        organizationId: null,
        taskId,
        agentId: marketingAgent.id,
        status: RunStatus.COMPLETED,
        input: { promptSummary: `Generar contenido para ${platform}` },
        output: { content: parsed.content, title: parsed.title, hashtags: parsed.hashtags },
      },
    });

    await prisma.contentDraft.create({
      data: {
        scope: "PLATFORM",
        organizationId: null,
        taskId,
        platform,
        type: contentType,
        title: parsed.title,
        content: parsed.content,
        hashtags: parsed.hashtags,
        imagePrompt: parsed.imagePrompt ?? null,
        status: DraftStatus.DRAFT,
      },
    });

    await prisma.agentApproval.create({
      data: {
        scope: "PLATFORM",
        organizationId: null,
        taskId,
        runId: marketingRun.id,
        requestedByAgentId: marketingAgent.id,
        status: ApprovalStatus.PENDING,
        requestedAt: new Date(),
      },
    });

    await prisma.agentRun.update({ where: { id: orchestratorRun.id }, data: { status: RunStatus.COMPLETED, completedAt: new Date() } });
    await prisma.agentTask.update({ where: { id: task.id }, data: { status: TaskStatus.APPROVAL_PENDING } });

    await createAgentLog({
      runId: marketingRun.id,
      level: AgentLogLevel.INFO,
      message: "Borrador generado por el Agente de Marketing y pendiente de aprobación",
      metadata: { taskId, draftPlatform: platform },
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);

    // Detect OpenAI 429 quota exceeded specifically
    const is429 =
      rawMessage.includes("429") ||
      rawMessage.includes("quota") ||
      rawMessage.includes("rate limit") ||
      rawMessage.includes("exceeded");

    const userMessage = is429
      ? "OpenAI rechazó la solicitud por cuota insuficiente. Revisá la configuración de API o intentá más tarde."
      : `Error durante la generación de contenido: ${rawMessage}`;

    await prisma.agentRun.update({
      where: { id: orchestratorRun.id },
      data: { status: RunStatus.FAILED, error: userMessage, completedAt: new Date() },
    });
    await createAgentLog({
      runId: orchestratorRun.id,
      level: AgentLogLevel.ERROR,
      message: userMessage,
      metadata: { taskId, error: rawMessage, isQuotaError: is429 },
    });
    await prisma.agentTask.update({ where: { id: task.id }, data: { status: TaskStatus.FAILED } });
  }
}

/**
 * ORGANIZATIONAL SCOPE (Tenant Agents)
 */

export async function createAgent(orgSlug: string, data: any) {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const agent = await prisma.aiAgent.create({
    data: {
      ...data,
      organizationId: membership.organization.id,
    },
  });

  revalidatePath(`/${orgSlug}/agents`);
  return { success: true, data: agent };
}

export async function updateAgent(orgSlug: string, agentId: string, data: any) {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const agent = await prisma.aiAgent.update({
    where: { id: agentId, organizationId: membership.organization.id },
    data,
  });

  revalidatePath(`/${orgSlug}/agents`);
  revalidatePath(`/${orgSlug}/agents/${agentId}`);
  return { success: true, data: agent };
}

export async function deleteAgent(orgSlug: string, agentId: string) {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  await prisma.aiAgent.delete({
    where: { id: agentId, organizationId: membership.organization.id },
  });

  revalidatePath(`/${orgSlug}/agents`);
}

/**
 * PLATFORM GOALS (AgentOS 2.3)
 */

export async function createGoalAction(formData: FormData) {
  const sessionUser = await requirePlatformAdmin();

  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const priority = formData.get("priority")?.toString() as AgentPriority;
  const type = formData.get("type")?.toString() as GoalType;
  const targetDateStr = formData.get("targetDate")?.toString();

  if (!title || !priority || !type) {
    throw new Error("Título, prioridad y tipo son obligatorios");
  }

  const goal = await createAgentGoal({
    title,
    description,
    priority,
    type,
    targetDate: targetDateStr ? new Date(targetDateStr) : undefined
  });

  revalidatePath("/platform/agents/goals");
  revalidatePath("/platform/agents");
  
  redirect(`/platform/agents/goals/${goal.id}`);
}

export async function suggestGoalTasksAction(goalId: string) {
  await requirePlatformAdmin();
  
  if (!goalId) throw new Error("ID de objetivo requerido");

  const suggestions = await suggestTasksForGoal(goalId);
  return { success: true, data: suggestions };
}

export async function createSuggestedTasksAction(goalId: string, tasks: { title: string; description: string }[]) {
  const sessionUser = await requirePlatformAdmin();

  const orchestrator = await getActiveAgentByType(AgentType.ORCHESTRATOR);
  
  for (const taskData of tasks) {
    const task = await prisma.agentTask.create({
      data: {
        scope: "PLATFORM",
        organizationId: null,
        goalId,
        agentId: orchestrator?.id || null,
        status: orchestrator ? TaskStatus.ASSIGNED : TaskStatus.PENDING,
        title: taskData.title,
        description: taskData.description,
        priority: "MEDIUM",
        createdById: sessionUser.id
      }
    });

    await createAgentLog({
      level: AgentLogLevel.INFO,
      message: `Tarea creada desde objetivo: ${task.title}`,
      metadata: { goalId, taskId: task.id }
    });
  }

  revalidatePath(`/platform/agents/goals/${goalId}`);
  revalidatePath("/platform/agents/tasks");
  
  return { success: true };
}

export async function createAutomationAction(formData: FormData) {
  const sessionUser = await requirePlatformAdmin();

  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const type = formData.get("type")?.toString() as AutomationType;
  const frequency = formData.get("frequency")?.toString() as AutomationFrequency;
  const agentId = formData.get("agentId")?.toString();
  const goalId = formData.get("goalId")?.toString();
  const dayOfWeek = formData.get("dayOfWeek") ? Number(formData.get("dayOfWeek")) : undefined;
  const timeOfDay = formData.get("timeOfDay")?.toString();

  if (!title || !type || !frequency) {
    throw new Error("Título, tipo y frecuencia son obligatorios");
  }

  await createAgentAutomation({
    title,
    description,
    type,
    frequency,
    agentId: agentId || undefined,
    goalId: goalId || undefined,
    dayOfWeek,
    timeOfDay,
    createdById: sessionUser.id
  });

  revalidatePath("/platform/agents/automations");
  revalidatePath("/platform/agents");
  
  redirect("/platform/agents/automations");
}

export async function runAutomationNowAction(automationId: string) {
  const sessionUser = await requirePlatformAdmin();
  
  await runAgentAutomationNow(automationId, sessionUser.id);
  
  revalidatePath("/platform/agents/automations");
  revalidatePath("/platform/agents/tasks");
  
  return { success: true };
}

export async function toggleAutomationAction(automationId: string, active: boolean) {
  await requirePlatformAdmin();
  
  await toggleAutomationStatus(automationId, active);
  
  revalidatePath("/platform/agents/automations");
  
  return { success: true };
}

