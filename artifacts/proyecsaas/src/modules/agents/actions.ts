"use server";
import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getOpenAIClient,
  createAgentLog,
  getActiveAgentByType,
  inferPlatform,
  formatOpenAIPrompt,
  parseMarketingResponse,
  OPENAI_MODEL,
  generateOperativeDiagnosis,
  getDirectorAgentStatus,
  isSpecialistAgent,
  ensureSpecialistAgents,
} from "@/modules/agents/service";
import { prisma } from "@/server/db/prisma";
import {
  assertMinimumRole,
  requireOrganizationMembership,
  requirePlatformAdmin,
} from "@/server/auth/access";
import {
  ApprovalStatus,
  AgentType,
  AgentAutonomyLevel,
  AgentLogLevel,
  TaskStatus,
  RunStatus,
  DraftStatus,
  MembershipRole,
  GoalType,
  GoalStatus,
} from "@prisma/client";
import type { ContentPlatform, AgentPriority } from "@prisma/client";
import { createAgentGoal, suggestTasksForGoal } from "./goals-service";
import {
  createAgentAutomation,
  runAgentAutomationNow,
  toggleAutomationStatus,
  runDueAgentAutomations,
} from "./automations-service";
import {
  AutomationType,
  AutomationFrequency,
  ContentCalendarStatus,
} from "@prisma/client";
import { getSessionUser } from "@/server/auth/session";

export async function createAgentTask(formData: FormData) {
  const sessionUser = await requirePlatformAdmin();

  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const priority = formData.get("priority")?.toString() as AgentPriority | null;
  const platform = formData
    .get("platform")
    ?.toString() as ContentPlatform | null;
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
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: TaskStatus.FAILED },
    });
    throw new Error("No se encontró Director Operativo IA activo");
  }

  await prisma.agentTask.update({
    where: { id: task.id },
    data: { agentId: orchestrator.id, status: TaskStatus.ASSIGNED },
  });

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
    console.error(
      "[AgentOS] Error en generación (ya registrado en logs):",
      err instanceof Error ? err.message : err,
    );
  }

  redirect("/platform/agents/tasks");
}

export async function approveOrRejectDraft(formData: FormData) {
  const sessionUser = await requirePlatformAdmin();
  const approvalId = formData.get("approvalId")?.toString();
  const decision = formData
    .get("decision")
    ?.toString() as ApprovalStatus | null;
  const comments = formData.get("comments")?.toString() ?? "";

  if (
    !approvalId ||
    !decision ||
    !Object.values(ApprovalStatus).includes(decision)
  ) {
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

  const draft = await prisma.contentDraft.findFirst({
    where: { taskId: approval.taskId },
  });

  if (draft) {
    await prisma.contentDraft.update({
      where: { id: draft.id },
      data: {
        status:
          decision === ApprovalStatus.APPROVED
            ? DraftStatus.APPROVED
            : DraftStatus.REJECTED,
      },
    });
  }

  await prisma.agentTask.update({
    where: { id: approval.taskId },
    data: {
      status:
        decision === ApprovalStatus.APPROVED
          ? TaskStatus.COMPLETED
          : TaskStatus.FAILED,
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

async function processTaskWithOrchestrator(
  taskId: string,
  orchestratorId: string,
  userId: string,
) {
  const task = await prisma.agentTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Tarea no encontrada");

  const orchestratorRun = await prisma.agentRun.create({
    data: {
      scope: "PLATFORM",
      organizationId: null,
      taskId,
      agentId: orchestratorId,
      status: RunStatus.RUNNING,
      input: {
        title: task.title,
        description: task.description,
        metadata: task.metadata,
      },
    },
  });

  await createAgentLog({
    runId: orchestratorRun.id,
    level: AgentLogLevel.INFO,
    message: "Inicio de ejecución del Director Operativo IA",
    metadata: { taskId },
  });

  const platform = inferPlatform(
    task.description ?? "",
    (task.metadata as { platform?: string } | null)?.platform ?? null,
  );
  const contentType =
    (task.metadata as { contentType?: string } | null)?.contentType ?? "post";

  await prisma.agentTask.update({
    where: { id: task.id },
    data: {
      metadata: { contentType, platform },
      status: TaskStatus.IN_PROGRESS,
    },
  });

  const isMarketing =
    contentType === "post" ||
    contentType === "ad" ||
    contentType === "copy" ||
    task.title.toLowerCase().includes("marketing") ||
    task.title.toLowerCase().includes("publicación");

  if (!isMarketing) {
    // Tarea B2B general (activación, QA, soporte, finanzas, operaciones)
    await prisma.agentRun.update({
      where: { id: orchestratorRun.id },
      data: { status: RunStatus.COMPLETED, completedAt: new Date() },
    });
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: TaskStatus.ASSIGNED },
    });
    await createAgentLog({
      runId: orchestratorRun.id,
      level: AgentLogLevel.INFO,
      message:
        "Tarea retenida en Director Operativo IA para evaluación ejecutiva (HITL). No derivada a Marketing.",
      metadata: { taskId, isMarketing: false },
    });
    return;
  }

  const marketingAgent = await getActiveAgentByType(AgentType.MARKETING);
  if (!marketingAgent) {
    await prisma.agentRun.update({
      where: { id: orchestratorRun.id },
      data: { status: RunStatus.FAILED, error: "Marketing agent no activo" },
    });
    await createAgentLog({
      runId: orchestratorRun.id,
      level: AgentLogLevel.ERROR,
      message: "No se encontró Agente de Marketing activo",
      metadata: { taskId },
    });
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: TaskStatus.FAILED },
    });
    return;
  }

  try {
    const client = getOpenAIClient();
    const prompt = formatOpenAIPrompt({
      title: task.title,
      description: task.description ?? "",
      platform,
    });
    await createAgentLog({
      runId: orchestratorRun.id,
      level: AgentLogLevel.INFO,
      message: "Prompt enviado a OpenAI",
      metadata: { taskId, platform, contentType },
    });

    const completion = (await Promise.race([
      client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 700,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OpenAI timeout")), 30000),
      ),
    ])) as { choices: Array<{ message: { content?: string } }> };

    const responseText =
      completion.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = parseMarketingResponse(responseText);

    const marketingRun = await prisma.agentRun.create({
      data: {
        scope: "PLATFORM",
        organizationId: null,
        taskId,
        agentId: marketingAgent.id,
        status: RunStatus.COMPLETED,
        input: { promptSummary: `Generar contenido para ${platform}` },
        output: {
          content: parsed.content,
          title: parsed.title,
          hashtags: parsed.hashtags,
        },
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

    await prisma.agentRun.update({
      where: { id: orchestratorRun.id },
      data: { status: RunStatus.COMPLETED, completedAt: new Date() },
    });
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: TaskStatus.APPROVAL_PENDING },
    });

    await createAgentLog({
      runId: marketingRun.id,
      level: AgentLogLevel.INFO,
      message:
        "Borrador generado por el Agente de Marketing y pendiente de aprobación",
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
      data: {
        status: RunStatus.FAILED,
        error: userMessage,
        completedAt: new Date(),
      },
    });
    await createAgentLog({
      runId: orchestratorRun.id,
      level: AgentLogLevel.ERROR,
      message: userMessage,
      metadata: { taskId, error: rawMessage, isQuotaError: is429 },
    });
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: TaskStatus.FAILED },
    });
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
      organizationId: membership.organization.id,
      name: data.name,
      status: data.status || "ACTIVE",
      tone: data.tone || "FRIENDLY",
      persona: data.persona,
      language: data.language || "Spanish",
      whatsappChannelId: data.whatsappChannelId,
      zoneFilters: data.zoneFilters || [],
      propertyTypes: data.propertyTypes || [],
      minBudget: data.minBudget,
      maxBudget: data.maxBudget,
      escalateAfterMessages: data.escalateAfterMessages || 5,
      escalateOnKeywords: data.escalateOnKeywords || [],
      humanHandoffMessage: data.humanHandoffMessage,
      isActive: data.isActive ?? true,
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
    data: {
      name: data.name,
      status: data.status,
      tone: data.tone,
      persona: data.persona,
      language: data.language,
      whatsappChannelId: data.whatsappChannelId,
      zoneFilters: data.zoneFilters,
      propertyTypes: data.propertyTypes,
      minBudget: data.minBudget,
      maxBudget: data.maxBudget,
      escalateAfterMessages: data.escalateAfterMessages,
      escalateOnKeywords: data.escalateOnKeywords,
      humanHandoffMessage: data.humanHandoffMessage,
      isActive: data.isActive,
    },
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
    targetDate: targetDateStr ? new Date(targetDateStr) : undefined,
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

export async function createSuggestedTasksAction(
  goalId: string,
  tasks: { title: string; description: string }[],
) {
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
        createdById: sessionUser.id,
      },
    });

    await createAgentLog({
      level: AgentLogLevel.INFO,
      message: `Tarea creada desde objetivo: ${task.title}`,
      metadata: { goalId, taskId: task.id },
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
  const frequency = formData
    .get("frequency")
    ?.toString() as AutomationFrequency;
  const agentId = formData.get("agentId")?.toString();
  const goalId = formData.get("goalId")?.toString();
  const dayOfWeek = formData.get("dayOfWeek")
    ? Number(formData.get("dayOfWeek"))
    : undefined;
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
    createdById: sessionUser.id,
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

export async function toggleAutomationAction(
  automationId: string,
  active: boolean,
) {
  await requirePlatformAdmin();

  await toggleAutomationStatus(automationId, active);

  revalidatePath("/platform/agents/automations");

  return { success: true };
}

export async function runDueAutomationsAction() {
  await requirePlatformAdmin();
  const sessionUser = await getSessionUser();
  const results = await runDueAgentAutomations(sessionUser?.id);
  revalidatePath("/platform/agents/automations");
  revalidatePath("/platform/agents");
  return results;
}

// CALENDAR ACTIONS
export async function scheduleContentDraftAction(
  draftId: string,
  data: { date: Date; platform?: ContentPlatform; notes?: string },
) {
  await requirePlatformAdmin();

  await prisma.contentDraft.update({
    where: { id: draftId },
    data: {
      scheduledFor: data.date,
      plannedPlatform: data.platform,
      notes: data.notes,
      calendarStatus: "SCHEDULED",
    },
  });

  revalidatePath("/platform/agents/calendar");
  revalidatePath("/platform/agents/content");
  return { success: true };
}

export async function updateCalendarStatusAction(
  draftId: string,
  status: ContentCalendarStatus,
) {
  await requirePlatformAdmin();

  await prisma.contentDraft.update({
    where: { id: draftId },
    data: { calendarStatus: status },
  });

  revalidatePath("/platform/agents/calendar");
  return { success: true };
}

// ─── Director Operativo IA — Fase 4A ─────────────────────────────────────────

export async function activateDirectorAgentAction(): Promise<{
  success: boolean;
  message: string;
  agentId?: string;
  alreadyExisted?: boolean;
}> {
  const sessionUser = await requirePlatformAdmin();

  // Excluir especialistas (config.kind="specialist"): el Director core es el
  // ORCHESTRATOR más antiguo que NO es especialista.
  const orchestrators = await prisma.agent.findMany({
    where: {
      type: AgentType.ORCHESTRATOR,
      scope: "PLATFORM",
      organizationId: null,
    },
    include: { governance: true },
    orderBy: { createdAt: "asc" },
  });
  const existing = orchestrators.find((a) => !isSpecialistAgent(a));

  if (existing) {
    // Ensure governance policy exists
    if (!existing.governance) {
      await prisma.agentGovernancePolicy.create({
        data: {
          agentId: existing.id,
          scope: "PLATFORM",
          autonomyLevel: AgentAutonomyLevel.REQUIRE_APPROVAL,
          maxTasksPerDay: 10,
          maxRunsPerDay: 50,
          isPaused: false,
        },
      });
    }
    revalidatePath("/platform/agents");
    return {
      success: true,
      message: "El Director Operativo IA ya está activo en el sistema.",
      agentId: existing.id,
      alreadyExisted: true,
    };
  }

  const agent = await prisma.agent.create({
    data: {
      scope: "PLATFORM",
      organizationId: null,
      name: "Director Operativo IA",
      type: AgentType.ORCHESTRATOR,
      isActive: true,
      config: { version: "4A" },
    },
  });

  await prisma.agentGovernancePolicy.create({
    data: {
      agentId: agent.id,
      scope: "PLATFORM",
      autonomyLevel: AgentAutonomyLevel.REQUIRE_APPROVAL,
      maxTasksPerDay: 10,
      maxRunsPerDay: 50,
      isPaused: false,
    },
  });

  await createAgentLog({
    level: AgentLogLevel.INFO,
    message: "Director Operativo IA activado (Fase 4A)",
    metadata: {
      agentId: agent.id,
      autonomyLevel: "REQUIRE_APPROVAL",
      activatedBy: sessionUser.id,
    },
  });

  // Bypass strict AuditEvent type — "agent.director_activated" is a platform-internal event
  await prisma.auditLog
    .create({
      data: {
        event: "agent.director_activated",
        actorId: sessionUser.id,
        actorEmail: sessionUser.email,
        entityType: "Agent",
        entityId: agent.id,
        entityName: "Director Operativo IA",
        metadata: {
          type: "ORCHESTRATOR",
          scope: "PLATFORM",
          autonomyLevel: "REQUIRE_APPROVAL",
        },
      },
    })
    .catch(() => {});

  revalidatePath("/platform/agents");
  return {
    success: true,
    message:
      "Director Operativo IA activado correctamente en modo SUPERVISADO.",
    agentId: agent.id,
    alreadyExisted: false,
  };
}

export async function requestOperativeDiagnosisAction(): Promise<{
  success: boolean;
  diagnosis?: string;
  error?: string;
  isQuotaError?: boolean;
  agentId?: string;
}> {
  const sessionUser = await requirePlatformAdmin();

  const status = await getDirectorAgentStatus();

  if (!status.exists || !status.isActive) {
    return {
      success: false,
      error:
        "El Director Operativo IA no está activo. Actívalo primero desde este panel.",
    };
  }

  const result = await generateOperativeDiagnosis();

  if (result.success && result.diagnosis) {
    await createAgentLog({
      level: AgentLogLevel.INFO,
      message: "Diagnóstico operativo generado",
      metadata: {
        agentId: status.agentId,
        requestedBy: sessionUser.id,
        type: "OPERATIVE_DIAGNOSIS",
        diagnosisLength: result.diagnosis.length,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          event: "agent.director_diagnosis_requested",
          actorId: sessionUser.id,
          actorEmail: sessionUser.email,
          entityType: "Agent",
          entityId: status.agentId ?? "",
          entityName: "Director Operativo IA",
          metadata: { type: "OPERATIVE_DIAGNOSIS" },
        },
      })
      .catch(() => {});
  } else {
    await createAgentLog({
      level: AgentLogLevel.ERROR,
      message: `Error al generar diagnóstico operativo: ${result.error ?? "desconocido"}`,
      metadata: {
        agentId: status.agentId,
        requestedBy: sessionUser.id,
        isQuotaError: result.isQuotaError ?? false,
      },
    });
  }

  return {
    success: result.success,
    diagnosis: result.diagnosis,
    error: result.error,
    isQuotaError: result.isQuotaError,
    agentId: status.agentId,
  };
}

// AgentOS Fase 2B.2 — Sincronización MANUAL de los 6 especialistas como filas
// Agent (idempotente, config.slug). Solo Superadmin, nunca automática. No toca
// AgentType, AiAgent, worker, WhatsApp ni pagos. No ejecuta acciones de agente.
export async function ensureSpecialistAgentsAction(): Promise<{
  success: boolean;
  created?: number;
  updated?: number;
  message: string;
}> {
  const sessionUser = await requirePlatformAdmin();

  try {
    const { created, updated } = await ensureSpecialistAgents();

    await createAgentLog({
      level: AgentLogLevel.INFO,
      message: `Especialistas sincronizados (${created} creados, ${updated} actualizados)`,
      metadata: { requestedBy: sessionUser.id, created, updated, type: "SPECIALISTS_SYNC" },
    });

    revalidatePath("/platform/agents/library");
    revalidatePath("/platform/agents");
    return {
      success: true,
      created,
      updated,
      message: `Especialistas sincronizados: ${created} creados, ${updated} actualizados.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudieron sincronizar los especialistas.",
    };
  }
}
