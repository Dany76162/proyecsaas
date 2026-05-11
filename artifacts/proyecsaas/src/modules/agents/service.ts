import "server-only";

import OpenAI from "openai";
import { prisma } from "@/server/db/prisma";
import {
  AgentLogLevel,
  AgentType,
  ApprovalStatus,
  ContentPlatform,
  DraftStatus,
  Prisma,
  RunStatus,
  TaskStatus,
} from "@prisma/client";
import type { AgentCanvasActivity, AgentCanvasData, AgentCanvasMetric } from "@/modules/agents/types";

export const PLATFORM_SCOPE = "PLATFORM" as const;
export const OPENAI_TIMEOUT_MS = 30_000;
export const OPENAI_MODEL = "gpt-4o-mini" as const;

export type AgentDashboardSummary = {
  totalTasks: number;
  pendingApproval: number;
  draftCount: number;
  activeAgents: number;
};

export async function getAgentDashboardSummary(): Promise<AgentDashboardSummary> {
  // Each count is wrapped individually to gracefully handle tables
  // that may not exist yet in the database (e.g. fresh local dev).
  async function safeCount(fn: () => Promise<number>): Promise<number> {
    try {
      return await fn();
    } catch (err) {
      console.warn("[AgentOS] Count failed (table likely missing):", err instanceof Error ? err.message : String(err));
      return 0;
    }
  }

  const [totalTasks, pendingApproval, draftCount, activeAgents] = await Promise.all([
    safeCount(() => prisma.agentTask.count()),
    safeCount(() => prisma.agentApproval.count({ where: { status: ApprovalStatus.PENDING } })),
    safeCount(() => prisma.contentDraft.count()),
    safeCount(() => prisma.agent.count({ where: { scope: "PLATFORM", isActive: true } })),
  ]);

  return {
    totalTasks,
    pendingApproval,
    draftCount,
    activeAgents,
  };
}

export async function listAgentTasks() {
  return prisma.agentTask.findMany({
    where: { scope: "PLATFORM" },
    orderBy: { createdAt: "desc" },
    include: {
      agent: { select: { id: true, name: true, type: true } },
      approvals: { select: { status: true } },
      drafts: { select: { status: true, platform: true } },
      createdBy: { select: { fullName: true, email: true } },
    },
  });
}

export async function listAgentContentDrafts() {
  return prisma.contentDraft.findMany({
    where: { scope: "PLATFORM" },
    orderBy: { createdAt: "desc" },
    include: {
      task: { select: { title: true, status: true } },
    },
  });
}

export async function listAgentApprovals() {
  return prisma.agentApproval.findMany({
    where: { scope: "PLATFORM", status: ApprovalStatus.PENDING },
    orderBy: { requestedAt: "desc" },
    include: {
      task: { select: { title: true, description: true, status: true } },
      run: { select: { status: true, error: true } },
      requestedByAgent: { select: { name: true, type: true } },
    },
  });
}

export async function listAgentLogs() {
  return prisma.agentLog.findMany({
    where: { scope: "PLATFORM" },
    orderBy: { timestamp: "desc" },
    take: 200,
    include: {
      run: { select: { taskId: true, agentId: true } },
    },
  });
}

function countByKey<T extends string>(
  items: Array<{ status: T; _count: { status: number } }>,
  keys: readonly T[],
) {
  return keys.reduce<Record<T, number>>((acc, key) => {
    acc[key] = items.find((item) => item.status === key)?._count.status ?? 0;
    return acc;
  }, {} as Record<T, number>);
}

function buildMetrics<T extends string>(
  counts: Record<T, number>,
  labels: Record<T, string>,
  tones: Partial<Record<T, AgentCanvasMetric["tone"]>> = {},
): AgentCanvasMetric[] {
  return Object.entries(counts).map(([key, value]) => ({
    label: labels[key as T] ?? key,
    value: value as number,
    tone: tones[key as T] ?? "neutral",
  }));
}

function toActivity(log: { id: string; level: AgentLogLevel; message: string; timestamp: Date }): AgentCanvasActivity {
  return {
    id: log.id,
    level: log.level,
    message: log.message,
    timestamp: log.timestamp.toISOString(),
  };
}

export async function getAgentCanvasData(): Promise<AgentCanvasData> {
  const [
    agents,
    taskCountsRaw,
    draftCountsRaw,
    approvalCountsRaw,
    recentLogs,
    runStatusCountsRaw,
  ] = await Promise.all([
    prisma.agent.findMany({
      where: { scope: PLATFORM_SCOPE },
      select: { id: true, name: true, type: true, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agentTask.groupBy({
      by: ["status"],
      where: { scope: PLATFORM_SCOPE },
      _count: { status: true },
    }),
    prisma.contentDraft.groupBy({
      by: ["status"],
      where: { scope: PLATFORM_SCOPE },
      _count: { status: true },
    }),
    prisma.agentApproval.groupBy({
      by: ["status"],
      where: { scope: PLATFORM_SCOPE },
      _count: { status: true },
    }),
    prisma.agentLog.findMany({
      where: { scope: PLATFORM_SCOPE },
      orderBy: { timestamp: "desc" },
      take: 12,
      select: { id: true, level: true, message: true, timestamp: true },
    }),
    prisma.agentRun.groupBy({
      by: ["status"],
      where: { scope: PLATFORM_SCOPE },
      _count: { status: true },
    }),
  ]);

  const taskCounts = countByKey(taskCountsRaw, [
    TaskStatus.PENDING,
    TaskStatus.ASSIGNED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.APPROVAL_PENDING,
    TaskStatus.COMPLETED,
    TaskStatus.FAILED,
  ]);

  const draftCounts = countByKey(draftCountsRaw, [
    DraftStatus.DRAFT,
    DraftStatus.APPROVED,
    DraftStatus.REJECTED,
  ]);

  const approvalCounts = countByKey(approvalCountsRaw, [
    ApprovalStatus.PENDING,
    ApprovalStatus.APPROVED,
    ApprovalStatus.REJECTED,
  ]);

  const runCounts = countByKey(runStatusCountsRaw, [
    RunStatus.RUNNING,
    RunStatus.COMPLETED,
    RunStatus.FAILED,
  ]);

  const orchestrator = agents.find((agent) => agent.type === AgentType.ORCHESTRATOR);
  const marketing = agents.find((agent) => agent.type === AgentType.MARKETING);
  const recentActivities = recentLogs.map(toActivity);
  const recentErrors = recentLogs.filter((log) => log.level === AgentLogLevel.ERROR).length;
  const totalTasks = Object.values(taskCounts).reduce((sum, value) => sum + value, 0);
  const hasAttention =
    taskCounts.FAILED > 0 ||
    runCounts.FAILED > 0 ||
    approvalCounts.PENDING > 0 ||
    recentErrors > 0;

  return {
    generatedAt: new Date().toISOString(),
    systemStatus: totalTasks === 0 ? "empty" : hasAttention ? "attention" : "operational",
    nodes: {
      orchestrator: {
        id: "orchestrator",
        title: orchestrator?.name ?? "Director Operativo IA",
        subtitle: "Coordina tareas y asigna trabajo al equipo de agentes.",
        type: "ORCHESTRATOR",
        status: orchestrator?.isActive ? "Activo" : "Sin agente activo",
        description:
          "Punto de control del flujo AgentOS. Recibe tareas, prepara la ejecución y deriva el contenido al Agente de Marketing.",
        href: "/platform/agents/tasks",
        metrics: [
          { label: "Tareas asignadas", value: taskCounts.ASSIGNED + taskCounts.IN_PROGRESS + taskCounts.APPROVAL_PENDING, tone: "info" },
          { label: "Pendientes", value: taskCounts.PENDING, tone: "neutral" },
          { label: "Aprobaciones", value: approvalCounts.PENDING, tone: approvalCounts.PENDING > 0 ? "warning" : "success" },
        ],
        activities: recentActivities.slice(0, 3),
      },
      marketing: {
        id: "marketing",
        title: marketing?.name ?? "Agente de Marketing",
        subtitle: "Produce borradores de contenido para revisión humana.",
        type: "MARKETING",
        status: marketing?.isActive ? "Activo" : "Sin agente activo",
        description:
          "Genera copies y hashtags a partir de tareas aprobadas por el Director Operativo IA. No publica contenido automáticamente.",
        href: "/platform/agents/content",
        metrics: [
          { label: "Borradores", value: draftCounts.DRAFT + draftCounts.APPROVED + draftCounts.REJECTED, tone: "info" },
          { label: "Completadas", value: taskCounts.COMPLETED, tone: "success" },
          { label: "Errores recientes", value: recentErrors, tone: recentErrors > 0 ? "danger" : "success" },
        ],
        activities: recentActivities.slice(0, 3),
      },
      tasks: {
        id: "tasks",
        title: "Tareas",
        subtitle: "Estado operativo de solicitudes creadas en AgentOS.",
        type: "TASK_PIPELINE",
        status: totalTasks > 0 ? "Con actividad" : "Sin tareas",
        description: "Vista agregada de tareas por estado. Este MVP mantiene la creación desde el formulario actual.",
        href: "/platform/agents/tasks",
        metrics: buildMetrics(
          taskCounts,
          {
            PENDING: "Pendientes",
            ASSIGNED: "Asignadas",
            IN_PROGRESS: "En progreso",
            APPROVAL_PENDING: "Por aprobar",
            COMPLETED: "Completadas",
            FAILED: "Fallidas",
          },
          {
            IN_PROGRESS: "info",
            APPROVAL_PENDING: "warning",
            COMPLETED: "success",
            FAILED: "danger",
          },
        ),
        activities: recentActivities.slice(0, 4),
      },
      drafts: {
        id: "drafts",
        title: "Borradores",
        subtitle: "Contenido generado antes de cualquier uso manual.",
        type: "CONTENT_DRAFTS",
        status: draftCounts.DRAFT > 0 ? "Revisión disponible" : "Sin pendientes",
        description: "Agrupa los borradores producidos por AgentOS. No conecta con publicación automática.",
        href: "/platform/agents/content",
        metrics: buildMetrics(
          draftCounts,
          { DRAFT: "Borradores", APPROVED: "Aprobados", REJECTED: "Rechazados" },
          { DRAFT: "warning", APPROVED: "success", REJECTED: "danger" },
        ),
        activities: recentActivities.slice(0, 3),
      },
      approvals: {
        id: "approvals",
        title: "Aprobaciones",
        subtitle: "Control humano antes de utilizar cualquier borrador.",
        type: "HUMAN_REVIEW",
        status: approvalCounts.PENDING > 0 ? "Requiere revisión" : "Sin pendientes",
        description: "Concentra las decisiones de aprobar o rechazar contenido. No ejecuta publicaciones.",
        href: "/platform/agents/approvals",
        metrics: buildMetrics(
          approvalCounts,
          { PENDING: "Pendientes", APPROVED: "Aprobadas", REJECTED: "Rechazadas" },
          { PENDING: "warning", APPROVED: "success", REJECTED: "danger" },
        ),
        activities: recentActivities.slice(0, 3),
      },
      logs: {
        id: "logs",
        title: "Logs / Actividad",
        subtitle: "Eventos recientes del sistema AgentOS.",
        type: "AUDIT_TRAIL",
        status: recentLogs.length > 0 ? "Registrando eventos" : "Sin actividad",
        description: "Últimos eventos legibles del flujo. No expone secretos ni prompts completos en el canvas.",
        href: "/platform/agents/logs",
        metrics: [
          { label: "Eventos recientes", value: recentLogs.length, tone: "info" },
          { label: "Runs completos", value: runCounts.COMPLETED, tone: "success" },
          { label: "Runs fallidos", value: runCounts.FAILED, tone: runCounts.FAILED > 0 ? "danger" : "neutral" },
        ],
        activities: recentActivities,
      },
    },
  };
}

export async function getActiveAgentByType(type: AgentType) {
  return prisma.agent.findFirst({
    where: { scope: "PLATFORM", type, isActive: true },
  });
}

export async function createAgentLog({
  runId,
  level,
  message,
  metadata,
}: {
  runId?: string;
  level: AgentLogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.agentLog.create({
    data: {
      scope: "PLATFORM",
      organizationId: null,
      runId,
      level,
      message,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

/**
 * ORGANIZATIONAL SCOPE (Tenant Agents)
 */

export async function getAgentsForOrg(orgId: string) {
  const agents = await prisma.aiAgent.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "asc" },
  });

  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    description: null, // AiAgent doesn't have description field in schema yet
    status: a.status as any,
    tone: a.tone,
    isActive: a.isActive,
    is24x7: true,
    whatsappChannelId: a.whatsappChannelId,
    zoneFilters: a.zoneFilters,
  }));
}

export async function getAgentStatsForOrg(orgId: string) {
  const agents = await prisma.aiAgent.findMany({
    where: { organizationId: orgId },
    select: { status: true },
  });

  return {
    total: agents.length,
    active: agents.filter((a) => a.status === "ACTIVE").length,
    paused: agents.filter((a) => a.status === "PAUSED").length,
    draft: agents.filter((a) => a.status === "DRAFT").length,
  };
}

export async function getAgentDetail(orgId: string, agentId: string) {
  const agent = await prisma.aiAgent.findFirst({
    where: { id: agentId, organizationId: orgId },
  });

  if (!agent) return null;

  return {
    id: agent.id,
    name: agent.name,
    description: null,
    status: agent.status as any,
    tone: agent.tone,
    isActive: agent.isActive,
    is24x7: true,
    whatsappChannelId: agent.whatsappChannelId,
    zoneFilters: agent.zoneFilters,
    persona: agent.persona,
    language: agent.language,
    escalateOnKeywords: agent.escalateOnKeywords,
    humanHandoffMessage: agent.humanHandoffMessage,
    escalateAfterMessages: agent.escalateAfterMessages,
    propertyTypes: agent.propertyTypes,
    minBudget: agent.minBudget,
    maxBudget: agent.maxBudget,
  };
}

export async function getAvailableChannels(orgId: string) {
  return prisma.whatsAppChannel.findMany({
    where: { organizationId: orgId, isActive: true },
    select: {
      id: true,
      name: true,
      displayPhoneNumber: true,
      verifiedDisplayName: true,
      status: true,
    },
  });
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no encontrado en el runtime");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

export function formatOpenAIPrompt({
  title,
  description,
  platform,
}: {
  title: string;
  description: string;
  platform: ContentPlatform;
}) {
  return `
Crea un borrador de publicación para ${platform}.

Título del contenido: ${title}
Descripción breve: ${description}

Responde en español con un texto de copy claro y un conjunto de hashtags relevantes.
Incluye un título corto y un cuerpo de contenido adecuado para la plataforma.
Devuelve el texto completo en un solo bloque y lista hashtags separados por comas.
`;
}

export function buildPromptSummary({ title, platform }: { title: string; platform: ContentPlatform }) {
  return `Generar borrador para ${platform} con título: ${title}`;
}

export function parseMarketingResponse(raw: string) {
  const content = raw.trim();
  const hashtags = Array.from(new Set(content.match(/#[\p{L}0-9_-]+/giu) ?? [])).slice(0, 10);
  const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? "";
  return {
    title: firstLine,
    content,
    hashtags,
    imagePrompt: null,
  };
}

export function inferPlatform(description: string, requestedPlatform?: string | null): ContentPlatform {
  if (requestedPlatform) {
    const normalized = requestedPlatform.toUpperCase();
    if (Object.values(ContentPlatform).includes(normalized as ContentPlatform)) {
      return normalized as ContentPlatform;
    }
  }

  const text = description.toLowerCase();
  if (text.includes("instagram") || text.includes("reel") || text.includes("post")) return ContentPlatform.INSTAGRAM;
  if (text.includes("facebook")) return ContentPlatform.FACEBOOK;
  if (text.includes("linkedin")) return ContentPlatform.LINKEDIN;
  if (text.includes("whatsapp") || text.includes("mensaje")) return ContentPlatform.WHATSAPP_BUSINESS;
  return ContentPlatform.INSTAGRAM;
}
