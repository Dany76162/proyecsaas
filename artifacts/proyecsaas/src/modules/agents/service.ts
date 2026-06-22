import "server-only";

import OpenAI from "openai";
import { getOpenAIClient as getSharedOpenAIClient } from "@/lib/ai/openai";
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
import { getManualContextForAI } from "@/modules/manuals/content";
import { getOperationalAlerts } from "@/server/health/operational-alerts";
import { getOperationalObservabilitySnapshot } from "@/server/health/operational-observability";
import { getPlatformActivationSnapshot } from "@/modules/platform/activation-service";
import { getAiUsageSummary } from "@/app/platform/ai-operations/ai-cost";
import { getPlatformWhatsAppStatus } from "@/server/whatsapp/platform-channel-status";

export const PLATFORM_SCOPE = "PLATFORM" as const;
export const OPENAI_TIMEOUT_MS = 30_000;
export const OPENAI_MODEL = "gpt-4o-mini" as const;

export type AgentDashboardSummary = {
  totalTasks: number;
  pendingApproval: number;
  draftCount: number;
  activeAgents: number;
  // Métricas 2.2
  completedLast7Days: number;
  approvedCount: number;
  rejectedCount: number;
  recentErrors: number;
  avgApprovalTimeMinutes: number | null;
  approvalRate: number;
  hasOpenAIQuotaError: boolean;
  totalGoals: number;
  activeGoals: number;
  totalAutomations: number;
  activeAutomations: number;
  scheduledContent: number;
  unscheduledApproved: number;
  isMetaConnected: boolean;
  metaPagesCount: number;
  metaStatus: string | null;
};

export async function getAgentDashboardSummary(): Promise<AgentDashboardSummary> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  async function safeCount(fn: () => Promise<number>): Promise<number> {
    try {
      return await fn();
    } catch (err) {
      return 0;
    }
  }

  const [
    totalTasks, 
    pendingApproval, 
    draftCount, 
    activeAgents,
    completedLast7Days,
    approvedCount,
    rejectedCount,
    recentErrors,
    quotaErrorLog,
    approvalsWithTime,
    totalGoals,
    activeGoals,
    totalAutomations,
    activeAutomations,
    scheduledContent,
    unscheduledApproved,
    metaIntegration
  ] = await Promise.all([
    safeCount(() => prisma.agentTask.count()),
    safeCount(() => prisma.agentApproval.count({ where: { status: ApprovalStatus.PENDING } })),
    safeCount(() => prisma.contentDraft.count()),
    safeCount(() => prisma.agent.count({ where: { scope: "PLATFORM", isActive: true } })),
    safeCount(() => prisma.agentTask.count({ 
      where: { status: TaskStatus.COMPLETED, updatedAt: { gte: sevenDaysAgo } } 
    })),
    safeCount(() => prisma.agentApproval.count({ where: { status: ApprovalStatus.APPROVED } })),
    safeCount(() => prisma.agentApproval.count({ where: { status: ApprovalStatus.REJECTED } })),
    safeCount(() => prisma.agentLog.count({ 
      where: { level: AgentLogLevel.ERROR, timestamp: { gte: sevenDaysAgo } } 
    })),
    prisma.agentLog.findFirst({
      where: { 
        OR: [
          { message: { contains: "429" } },
          { message: { contains: "quota" } },
          { message: { contains: "limit" } }
        ],
        timestamp: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } // Últimas 6 horas
      }
    }),
    prisma.agentApproval.findMany({
      where: { 
        status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] },
        decidedAt: { not: null }
      },
      select: { requestedAt: true, decidedAt: true },
      take: 50,
      orderBy: { decidedAt: 'desc' }
    }),
    safeCount(() => prisma.agentGoal.count()),
    safeCount(() => prisma.agentGoal.count({ where: { status: { not: "COMPLETED" } } })),
    safeCount(() => prisma.agentAutomation.count()),
    safeCount(() => prisma.agentAutomation.count({ where: { isActive: true } })),
    safeCount(() => prisma.contentDraft.count({ where: { calendarStatus: "SCHEDULED" } })),
    safeCount(() => prisma.contentDraft.count({ where: { status: "APPROVED", calendarStatus: "UNSCHEDULED" } })),
    prisma.metaIntegration.findUnique({ 
      where: { id: "platform-meta-default" },
      include: { _count: { select: { pages: true } } }
    })
  ]);

  const totalDecided = approvedCount + rejectedCount;
  const approvalRate = totalDecided > 0 ? (approvedCount / totalDecided) * 100 : 0;

  let avgApprovalTimeMinutes = null;
  if (approvalsWithTime.length > 0) {
    const times = approvalsWithTime.map(a => {
      const start = new Date(a.requestedAt).getTime();
      const end = new Date(a.decidedAt!).getTime();
      return (end - start) / (1000 * 60);
    });
    avgApprovalTimeMinutes = times.reduce((a, b) => a + b, 0) / times.length;
  }

  return {
    totalTasks,
    pendingApproval,
    draftCount,
    activeAgents,
    completedLast7Days,
    approvedCount,
    rejectedCount,
    recentErrors,
    avgApprovalTimeMinutes,
    approvalRate,
    hasOpenAIQuotaError: !!quotaErrorLog,
    totalGoals,
    activeGoals,
    totalAutomations,
    activeAutomations,
    scheduledContent,
    unscheduledApproved,
    isMetaConnected: metaIntegration?.status === "CONNECTED",
    metaPagesCount: metaIntegration?._count?.pages ?? 0,
    metaStatus: metaIntegration?.status ?? null
  };
}

export async function getAgentLibraryData() {
  const agents = await prisma.agent.findMany({
    where: { scope: "PLATFORM" },
    orderBy: { createdAt: "asc" }
  });

  // Agentes "virtuales" o futuros que no están en DB aún
  const predefined = [
    {
      id: "orchestrator",
      name: "Director Operativo IA",
      role: "Orquesta objetivos, tareas y agentes.",
      type: "ORCHESTRATOR",
      status: "ACTIVE",
      isActive: agents.some(a => a.type === "ORCHESTRATOR" && a.isActive),
      capabilities: ["Planificación", "Asignación", "Seguimiento"],
      availability: "24/7"
    },
    {
      id: "marketing",
      name: "Agente de Marketing",
      role: "Genera contenido, campañas y borradores.",
      type: "MARKETING",
      status: "ACTIVE",
      isActive: agents.some(a => a.type === "MARKETING" && a.isActive),
      capabilities: ["Copywriting", "Hashtags", "Ads"],
      availability: "24/7"
    },
    {
      id: "commercial",
      name: "Agente Comercial",
      role: "Analiza solicitudes de demo y oportunidades comerciales.",
      type: "COMMERCIAL",
      status: "INACTIVE",
      isActive: false,
      capabilities: ["Calificación", "Ventas", "Prospectos"],
      availability: "Próximamente"
    },
    {
      id: "onboarding",
      name: "Agente de Onboarding",
      role: "Ayuda a preparar altas de inmobiliarias y configuración inicial.",
      type: "ONBOARDING",
      status: "INACTIVE",
      isActive: false,
      capabilities: ["Setup", "Configuración", "Migración"],
      availability: "Próximamente"
    },
    {
      id: "qa",
      name: "Agente QA",
      role: "Audita logs, errores y calidad operativa.",
      type: "QA",
      status: "INACTIVE",
      isActive: false,
      capabilities: ["Auditoría", "Testing", "Alertas"],
      availability: "Próximamente"
    },
    {
      id: "financial",
      name: "Agente Financiero",
      role: "Resume métricas de facturación y uso.",
      type: "FINANCIAL",
      status: "INACTIVE",
      isActive: false,
      capabilities: ["Facturación", "Pagos", "Métricas"],
      availability: "Próximamente"
    }
  ];

  return predefined;
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
      task: { 
        include: {
          approvals: {
            select: { id: true, status: true }
          }
        }
      },
      publications: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
  });
}

export async function listAgentApprovals(status?: ApprovalStatus) {
  return prisma.agentApproval.findMany({
    where: { 
      scope: "PLATFORM", 
      ...(status ? { status } : {})
    },
    orderBy: { requestedAt: "desc" },
    include: {
      task: { 
        select: { 
          id: true, 
          title: true, 
          description: true, 
          status: true,
          drafts: {
            select: {
              id: true,
              platform: true,
              type: true,
              content: true,
              hashtags: true
            }
          }
        } 
      },
      run: { select: { status: true, error: true } },
      requestedByAgent: { select: { name: true, type: true } },
      decidedByUser: { select: { fullName: true } },
    },
  });
}

export async function listAgentLogs(level?: AgentLogLevel) {
  return prisma.agentLog.findMany({
    where: { 
      scope: "PLATFORM",
      ...(level ? { level } : {})
    },
    orderBy: { timestamp: "desc" },
    take: 200,
    include: {
      run: { 
        select: { 
          taskId: true, 
          agentId: true,
          agent: { select: { name: true } },
          task: { select: { title: true } }
        } 
      },
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
    activeGoalsRaw,
    automationsRaw,
    scheduledCount,
    unscheduledApproved,
    usedManually,
    metaIntegration,
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
    prisma.agentGoal.findMany({
      where: { status: { not: "COMPLETED" } },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { title: true, progress: true }
    }),
    prisma.agentAutomation.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { title: true, nextRunAt: true }
    }),
    prisma.contentDraft.count({ where: { calendarStatus: "SCHEDULED" } }),
    prisma.contentDraft.count({ where: { status: "APPROVED", calendarStatus: "UNSCHEDULED" } }),
    prisma.contentDraft.count({ where: { calendarStatus: "USED_MANUALLY" } }),
    prisma.metaIntegration.findUnique({
      where: { id: "platform-meta-default" },
      include: { _count: { select: { pages: true } } }
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
          "Punto de control ejecutivo de Raíces Pilot. Analiza operación, clientes, soporte, costos IA, activación y riesgos. Sugiere prioridades bajo supervisión humana.",
        href: "/platform/agents/tasks",
        metrics: [
          { label: "Tareas asignadas", value: taskCounts.ASSIGNED + taskCounts.IN_PROGRESS + taskCounts.APPROVAL_PENDING, tone: "info" },
          { label: "Pendientes", value: taskCounts.PENDING, tone: "neutral" },
          { label: "Aprobaciones", value: approvalCounts.PENDING, tone: approvalCounts.PENDING > 0 ? "warning" : "success" },
        ],
        activities: recentActivities.slice(0, 5),
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
        activities: recentActivities.slice(0, 5),
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
        activities: recentActivities.slice(0, 5),
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
        activities: recentActivities.slice(0, 5),
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
      calendar: {
        id: "calendar",
        title: "Calendario de Contenido",
        subtitle: "Planificación interna para uso manual.",
        type: "PLANNING",
        status: scheduledCount > 0 ? `${scheduledCount} Programados` : "Sin programación",
        description: "Organiza borradores aprobados. Permite marcar como usados manualmente para trazabilidad.",
        href: "/platform/agents/calendar",
        metrics: [
          { label: "Programados", value: scheduledCount, tone: "info" },
          { label: "Por Planificar", value: unscheduledApproved, tone: unscheduledApproved > 0 ? "warning" : "neutral" },
          { label: "Usados", value: usedManually, tone: "success" },
        ],
        activities: [],
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
      goals: {
        id: "goals",
        title: "Objetivos Estratégicos",
        subtitle: "Metas de alto nivel que el sistema debe cumplir.",
        type: "GOALS",
        status: activeGoalsRaw.length > 0 ? `${activeGoalsRaw.length} Activos` : "Sin metas activas",
        description: "Representa el 'por qué' de las tareas asignadas. El Director Operativo IA desglosa estos objetivos en tareas accionables.",
        href: "/platform/agents/goals",
        metrics: activeGoalsRaw.map(g => ({ label: g.title, value: g.progress, tone: "info" })),
        activities: [],
      },
      library: {
        id: "library",
        title: "Biblioteca de Agentes",
        subtitle: "Capacidades de IA disponibles para la plataforma.",
        type: "AGENTS_LIBRARY",
        status: `${agents.length} Agentes DB / 6 Perfiles`,
        description: "Catálogo de agentes activos e inactivos. Define roles, capacidades y disponibilidad del equipo IA.",
        href: "/platform/agents/library",
        metrics: [
          { label: "Activos", value: agents.filter(a => a.isActive).length, tone: "success" },
          { label: "Disponibles", value: 6, tone: "info" }
        ],
        activities: [],
      },
      automations: {
        id: "automations",
        title: "Automatizaciones",
        subtitle: "Reglas de generación de tareas programadas.",
        type: "AUTOMATION_RULES",
        status: automationsRaw.length > 0 ? `${automationsRaw.length} Activas` : "Sin reglas activas",
        description: "Define cuándo y cómo se deben crear tareas internas automáticamente. Todo resultado está sujeto a revisión humana.",
        href: "/platform/agents/automations",
        metrics: automationsRaw.map(a => ({ 
          label: a.title, 
          value: a.nextRunAt ? new Date(a.nextRunAt).toLocaleDateString() : "Manual", 
          tone: "info" 
        })),
        activities: [],
      },
      meta: {
        id: "meta",
        title: "Meta Read-Only",
        subtitle: "Integración con Facebook e Instagram.",
        type: "EXTERNAL_INTEGRATION",
        status: metaIntegration?.status === "CONNECTED" ? "Conectado" : "No conectado",
        description: "Valida cuentas y permisos para futura publicación manual. No realiza acciones de escritura.",
        href: "/platform/agents/integrations/meta",
        metrics: [
          { label: "Cuentas", value: metaIntegration?._count?.pages ?? 0, tone: "info" },
          { label: "Estado", value: metaIntegration?.status ?? "N/A", tone: metaIntegration?.status === "CONNECTED" ? "success" : "neutral" },
          { label: "Último Sync", value: metaIntegration?.lastSyncAt ? new Date(metaIntegration.lastSyncAt).toLocaleDateString() : "Nunca", tone: "info" },
        ],
        activities: [],
      },
      governance: {
        id: "governance",
        title: "Gobernanza & Budget",
        subtitle: "Límites operativos y autonomía.",
        type: "GOVERNANCE",
        status: "Operativo",
        description: "Regula el consumo de recursos de los agentes (Budget Guard) y define niveles de autonomía.",
        href: "/platform/agents/governance",
        metrics: [
          { label: "Límites", value: "Activos", tone: "success" },
          { label: "H-i-T-L", value: "Requerido", tone: "info" }
        ],
        activities: [],
      },
      readiness: {
        id: "readiness",
        title: "Readiness Center",
        subtitle: "Validación de producción.",
        type: "READINESS",
        status: "Checked",
        description: "Checklist crítico pre-deploy y validación de variables de entorno.",
        href: "/platform/agents/readiness",
        metrics: [
          { label: "Pre-deploy", value: "Validado", tone: "success" }
        ],
        activities: [],
      },
      orgchart: {
        id: "orgchart",
        title: "Estructura Operativa",
        subtitle: "Jerarquía de Agentes.",
        type: "ORG_CHART",
        status: "Definida",
        description: "Organigrama real y jerarquía de reporteo del ecosistema AgentOS.",
        href: "/platform/agents/org-chart",
        metrics: [
          { label: "Niveles", value: 2, tone: "info" },
          { label: "Agentes", value: 4, tone: "info" }
        ],
        activities: [],
      }
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
    select: { status: true, whatsappChannelId: true },
  });

  return {
    total: agents.length,
    active: agents.filter((a) => a.status === "ACTIVE").length,
    operational: agents.filter((a) => a.status === "ACTIVE" && !!a.whatsappChannelId).length,
    pendingWhatsApp: agents.filter((a) => a.status === "ACTIVE" && !a.whatsappChannelId).length,
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
  try {
    return await prisma.whatsAppChannel.findMany({
      where: { organizationId: orgId, isActive: true },
      select: {
        id: true,
        name: true,
        provider: true,
        displayPhoneNumber: true,
        verifiedDisplayName: true,
        status: true,
      },
    });
  } catch (error) {
    console.error("[getAvailableChannels] Error with isActive filter, trying without it:", error);
    try {
      return await prisma.whatsAppChannel.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          provider: true,
          displayPhoneNumber: true,
          verifiedDisplayName: true,
          status: true,
        },
      });
    } catch (finalError) {
      console.error("[getAvailableChannels] Final failure:", finalError);
      return [];
    }
  }
}

export function getOpenAIClient() {
  return getSharedOpenAIClient();
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

// ─── Director Operativo IA — Fase 4A ─────────────────────────────────────────

export type DirectorAgentStatus = {
  exists: boolean;
  isActive: boolean;
  agentId?: string;
  autonomyLevel?: string;
  isPaused?: boolean;
  lastDiagnosisAt?: string | null;
};

export async function getDirectorAgentStatus(): Promise<DirectorAgentStatus> {
  try {
    const agent = await prisma.agent.findFirst({
      where: { type: AgentType.ORCHESTRATOR, scope: PLATFORM_SCOPE },
      include: { governance: true },
      orderBy: { createdAt: "asc" },
    });

    if (!agent) return { exists: false, isActive: false };

    const lastDiagnosisLog = await prisma.agentLog.findFirst({
      where: { message: { contains: "Diagnóstico operativo generado" } },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    });

    return {
      exists: true,
      isActive: agent.isActive,
      agentId: agent.id,
      autonomyLevel: (agent.governance?.autonomyLevel as string) ?? "REQUIRE_APPROVAL",
      isPaused: agent.governance?.isPaused ?? false,
      lastDiagnosisAt: lastDiagnosisLog?.timestamp.toISOString() ?? null,
    };
  } catch {
    return { exists: false, isActive: false };
  }
}

// ── AgentOS Fase 1.2 — Tarjetas ejecutivas con datos ESTRUCTURADOS ──
// Estas métricas alimentan las tarjetas superiores de /platform/agents. Se
// calculan SIEMPRE desde servicios/consultas reales (las mismas fuentes que ya
// alimentan el diagnóstico), NUNCA parseando el texto del LLM. Cuando una fuente
// no está disponible, el campo queda en null y la UI muestra "Sin dato
// estructurado" en vez de inventar un valor.
export type ExecutiveOperationalStatus = "VERDE" | "AMARILLO" | "ROJO" | "SIN_DATO";

export type ExecutiveMetrics = {
  firstWowPendingCount: number | null;
  openB2BTicketsCount: number | null;
  monthlyAiCostUsd: number | null;
  failedJobsCount: number | null;
  operationalStatus: ExecutiveOperationalStatus;
  operationalStatusReason: string;
  nextBestActionSummary: string;
  lastUpdatedAt: string;
};

export async function getExecutiveMetrics(): Promise<ExecutiveMetrics> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const supportOrgId = process.env.WHATSAPP_ORGANIZATION_ID;

  const [
    activationSnapshot,
    aiCostSummary,
    openB2BTicketsCount,
    failedJobsCount,
    quotaErrorLog,
    alerts,
  ] = await Promise.all([
    getPlatformActivationSnapshot().catch(() => null),
    getAiUsageSummary().catch(() => null),
    // Tickets B2B = conversaciones abiertas de la org plataforma de soporte.
    // Si la env no está configurada, no inventamos un 0: devolvemos null (sin dato).
    supportOrgId
      ? prisma.conversation
          .count({ where: { organizationId: supportOrgId, status: "OPEN" } })
          .catch(() => null)
      : Promise.resolve<number | null>(null),
    prisma.agentAutomation.count({ where: { status: "FAILED" } }).catch(() => null),
    prisma.agentLog
      .findFirst({
        where: {
          level: "ERROR",
          OR: [{ message: { contains: "429" } }, { message: { contains: "quota" } }],
          timestamp: { gte: sixHoursAgo },
        },
        orderBy: { timestamp: "desc" },
      })
      .catch(() => null),
    getOperationalAlerts().catch(() => [] as Awaited<ReturnType<typeof getOperationalAlerts>>),
  ]);

  const firstWowPendingCount = activationSnapshot
    ? Math.max(0, activationSnapshot.summary.totalOrganizations - activationSnapshot.summary.firstLeadCount)
    : null;
  const monthlyAiCostUsd = aiCostSummary ? aiCostSummary.totalCostUsd : null;
  const hasQuotaError = Boolean(quotaErrorLog);
  const hasCriticalAlert = (alerts ?? []).some((a) => a.severity === "critical");

  // ¿Hay suficiente dato estructurado para evaluar el semáforo?
  const hasStructuredData =
    firstWowPendingCount !== null ||
    failedJobsCount !== null ||
    monthlyAiCostUsd !== null ||
    openB2BTicketsCount !== null;

  let operationalStatus: ExecutiveOperationalStatus;
  let operationalStatusReason: string;

  if (!hasStructuredData) {
    operationalStatus = "SIN_DATO";
    operationalStatusReason = "Sin datos estructurados suficientes para evaluar.";
  } else if (hasQuotaError || hasCriticalAlert) {
    operationalStatus = "ROJO";
    operationalStatusReason = hasQuotaError
      ? "Error de cuota de IA (OpenAI) en las últimas 6h."
      : "Alerta crítica operativa activa.";
  } else if ((failedJobsCount ?? 0) > 0 || (firstWowPendingCount ?? 0) > 0 || (openB2BTicketsCount ?? 0) > 0) {
    const reasons: string[] = [];
    if ((failedJobsCount ?? 0) > 0) reasons.push(`${failedJobsCount} jobs fallidos`);
    if ((firstWowPendingCount ?? 0) > 0) reasons.push(`${firstWowPendingCount} sin First WOW`);
    if ((openB2BTicketsCount ?? 0) > 0) reasons.push(`${openB2BTicketsCount} tickets abiertos`);
    operationalStatus = "AMARILLO";
    operationalStatusReason = reasons.join(" · ");
  } else {
    operationalStatus = "VERDE";
    operationalStatusReason = "Sin alertas, jobs fallidos, tickets ni First WOW pendientes.";
  }

  // Próxima mejor acción — calculada desde datos estructurados, por prioridad.
  let nextBestActionSummary: string;
  if (hasQuotaError || hasCriticalAlert) {
    nextBestActionSummary = "Revisar consumo IA y alertas críticas en Operaciones IA / QA.";
  } else if ((failedJobsCount ?? 0) > 0) {
    nextBestActionSummary = "Revisar jobs fallidos en QA Operativo.";
  } else if ((firstWowPendingCount ?? 0) > 0) {
    nextBestActionSummary = "Contactar inmobiliarias pendientes de First WOW.";
  } else if ((openB2BTicketsCount ?? 0) > 0) {
    nextBestActionSummary = "Priorizar tickets B2B abiertos.";
  } else if (!hasStructuredData) {
    nextBestActionSummary = "Solicitá un diagnóstico para evaluar el estado operativo.";
  } else {
    nextBestActionSummary = "Mantener monitoreo operativo.";
  }

  return {
    firstWowPendingCount,
    openB2BTicketsCount,
    monthlyAiCostUsd,
    failedJobsCount,
    operationalStatus,
    operationalStatusReason,
    nextBestActionSummary,
    lastUpdatedAt: new Date().toISOString(),
  };
}

// ── AgentOS Fase 2A — Especialistas de diagnóstico READ-ONLY ──
// Cada especialista es un módulo de análisis del Director IA: lee fuentes reales
// ya existentes y devuelve un informe estructurado (estado + hallazgos +
// recomendación). NO ejecuta acciones, NO escribe en DB, NO envía mensajes, NO
// persiste agentes. Todo SUGGEST_ONLY / HITL. Si falta la fuente estructurada,
// el informe sale en estado "SIN_DATO" de forma honesta.
export type AgentSpecialistStatus = "OK" | "ATENCION" | "CRITICO" | "SIN_DATO";

export type AgentSpecialistReport = {
  id: string;
  name: string;
  area: string;
  status: AgentSpecialistStatus;
  summary: string;
  findings: string[];
  recommendation: string;
  source: string;
  lastUpdatedAt: string;
};

export async function getOnboardingSpecialistReport(): Promise<AgentSpecialistReport> {
  const base = {
    id: "onboarding",
    name: "Especialista de Onboarding",
    area: "Activación / First WOW",
    source: "getPlatformActivationSnapshot()",
    lastUpdatedAt: new Date().toISOString(),
  };
  const snap = await getPlatformActivationSnapshot().catch(() => null);
  if (!snap) {
    return {
      ...base,
      status: "SIN_DATO",
      summary: "Falta la fuente estructurada de activación.",
      findings: ["No se pudo leer el snapshot de activación."],
      recommendation: "Reintentar el diagnóstico más tarde.",
    };
  }
  const { totalOrganizations, firstLeadCount, onboardingViewedCount } = snap.summary;
  const pending = Math.max(0, totalOrganizations - firstLeadCount);
  const findings = [
    `${totalOrganizations} organizaciones totales`,
    `${firstLeadCount} con su primer lead (First WOW)`,
    `${pending} sin First WOW`,
    `${onboardingViewedCount} vieron el onboarding`,
  ];
  if (pending > 0) {
    return {
      ...base,
      status: "ATENCION",
      summary: `${pending} inmobiliarias todavía no alcanzaron su First WOW.`,
      findings,
      recommendation: "Contactar inmobiliarias pendientes de First WOW.",
    };
  }
  return {
    ...base,
    status: "OK",
    summary: "Todas las organizaciones alcanzaron su First WOW.",
    findings,
    recommendation: "Mantener el monitoreo de activación.",
  };
}

export async function getSupportB2BSpecialistReport(): Promise<AgentSpecialistReport> {
  const base = {
    id: "support-b2b",
    name: "Especialista de Soporte B2B",
    area: "Soporte / Tickets B2B",
    source: "conversaciones abiertas (org de soporte)",
    lastUpdatedAt: new Date().toISOString(),
  };
  const supportOrgId = process.env.WHATSAPP_ORGANIZATION_ID;
  if (!supportOrgId) {
    return {
      ...base,
      status: "SIN_DATO",
      summary: "Falta la organización de soporte configurada.",
      findings: ["Sin WHATSAPP_ORGANIZATION_ID no se pueden contar tickets B2B."],
      recommendation: "Configurar la organización de soporte para habilitar el conteo.",
    };
  }
  const open = await prisma.conversation
    .count({ where: { organizationId: supportOrgId, status: "OPEN" } })
    .catch(() => null);
  if (open === null) {
    return {
      ...base,
      status: "SIN_DATO",
      summary: "No se pudo leer el conteo de tickets.",
      findings: ["Error al consultar conversaciones de soporte."],
      recommendation: "Reintentar más tarde.",
    };
  }
  const findings = [`${open} conversaciones de soporte abiertas`];
  if (open === 0) {
    return {
      ...base,
      status: "OK",
      summary: "No hay tickets B2B abiertos.",
      findings,
      recommendation: "Mantener el monitoreo de soporte.",
    };
  }
  return {
    ...base,
    status: open >= 20 ? "CRITICO" : "ATENCION",
    summary: `${open} tickets B2B abiertos esperando respuesta.`,
    findings,
    recommendation: "Priorizar tickets B2B abiertos.",
  };
}

export async function getQASpecialistReport(): Promise<AgentSpecialistReport> {
  const base = {
    id: "qa",
    name: "Especialista de QA / Producción",
    area: "Calidad / Salud operativa",
    source: "jobs fallidos + alertas operativas + log de cuota",
    lastUpdatedAt: new Date().toISOString(),
  };
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const [failedJobs, alerts, quotaLog] = await Promise.all([
    prisma.agentAutomation.count({ where: { status: "FAILED" } }).catch(() => null),
    getOperationalAlerts().catch(() => [] as Awaited<ReturnType<typeof getOperationalAlerts>>),
    prisma.agentLog
      .findFirst({
        where: {
          level: "ERROR",
          OR: [{ message: { contains: "429" } }, { message: { contains: "quota" } }],
          timestamp: { gte: sixHoursAgo },
        },
        orderBy: { timestamp: "desc" },
      })
      .catch(() => null),
  ]);
  const criticalAlerts = (alerts ?? []).filter((a) => a.severity === "critical").length;
  const findings = [
    `${failedJobs ?? "s/d"} jobs/automatizaciones fallidas`,
    `${(alerts ?? []).length} alertas activas (${criticalAlerts} críticas)`,
    `Error de cuota OpenAI (6h): ${quotaLog ? "sí" : "no"}`,
  ];
  if (failedJobs === null) {
    return { ...base, status: "SIN_DATO", summary: "Sin fuente estructurada de salud operativa.", findings, recommendation: "Reintentar el diagnóstico más tarde." };
  }
  if (criticalAlerts > 0 || quotaLog) {
    return { ...base, status: "CRITICO", summary: "Hay alertas críticas o error de cuota de IA activos.", findings, recommendation: "Revisar alertas críticas y consumo de IA en QA / Operaciones IA." };
  }
  if (failedJobs > 0) {
    return { ...base, status: "ATENCION", summary: `${failedJobs} jobs fallidos requieren revisión.`, findings, recommendation: "Revisar jobs fallidos en QA Operativo." };
  }
  return { ...base, status: "OK", summary: "Sin jobs fallidos ni alertas críticas.", findings, recommendation: "Mantener el monitoreo de QA." };
}

export async function getFinanceSpecialistReport(): Promise<AgentSpecialistReport> {
  const base = {
    id: "finance",
    name: "Especialista de Finanzas / Costos IA",
    area: "Costos de IA",
    source: "getAiUsageSummary() + log de cuota",
    lastUpdatedAt: new Date().toISOString(),
  };
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const [aiCost, quotaLog] = await Promise.all([
    getAiUsageSummary().catch(() => null),
    prisma.agentLog
      .findFirst({
        where: {
          level: "ERROR",
          OR: [{ message: { contains: "429" } }, { message: { contains: "quota" } }],
          timestamp: { gte: sixHoursAgo },
        },
        orderBy: { timestamp: "desc" },
      })
      .catch(() => null),
  ]);
  if (!aiCost) {
    return { ...base, status: "SIN_DATO", summary: "Sin fuente estructurada de costos de IA.", findings: ["No se pudo leer el resumen de uso de IA."], recommendation: "Reintentar más tarde." };
  }
  const findings = [
    `Costo IA del mes: $${aiCost.totalCostUsd.toFixed(2)}`,
    `Error de cuota OpenAI (6h): ${quotaLog ? "sí" : "no"}`,
  ];
  if (quotaLog) {
    return { ...base, status: "CRITICO", summary: "Hay un error de cuota de IA (OpenAI) reciente.", findings, recommendation: "Revisar consumo y límites de IA en Operaciones IA." };
  }
  return { ...base, status: "OK", summary: `Costo de IA del mes en $${aiCost.totalCostUsd.toFixed(2)}.`, findings, recommendation: "Mantener el monitoreo del consumo de IA." };
}

export async function getIntegrationsSpecialistReport(): Promise<AgentSpecialistReport> {
  const base = {
    id: "integrations",
    name: "Especialista de Integraciones",
    area: "WhatsApp / Meta / APIs",
    source: "getPlatformWhatsAppStatus()",
    lastUpdatedAt: new Date().toISOString(),
  };
  const status = await getPlatformWhatsAppStatus().catch(() => null);
  if (!status) {
    return { ...base, status: "SIN_DATO", summary: "Sin fuente estructurada del estado de integraciones.", findings: ["No se pudo leer el estado de WhatsApp/Meta."], recommendation: "Reintentar más tarde." };
  }
  const findings = [
    `Número de plataforma: ${status.platformPhone ? "configurado" : "sin configurar"}`,
    `Meta WhatsApp: ${status.metaStatus}`,
    `Integración activa: ${status.fullyActive ? "sí" : "no"}`,
  ];
  if (!status.platformPhone) {
    return { ...base, status: "SIN_DATO", summary: "No hay número de WhatsApp de plataforma configurado.", findings, recommendation: "Configurar el número de WhatsApp de la plataforma." };
  }
  if (!status.fullyActive) {
    return { ...base, status: "ATENCION", summary: "La integración de WhatsApp/Meta no está totalmente activa.", findings, recommendation: "Revisar la conexión de Meta WhatsApp en Integraciones." };
  }
  return { ...base, status: "OK", summary: "Integración de WhatsApp/Meta activa.", findings, recommendation: "Mantener el monitoreo de integraciones." };
}

export async function getProductSpecialistReport(): Promise<AgentSpecialistReport> {
  const base = {
    id: "product",
    name: "Especialista de Producto",
    area: "Mejoras de producto",
    source: "getExecutiveMetrics() (señales estructuradas)",
    lastUpdatedAt: new Date().toISOString(),
  };
  const m = await getExecutiveMetrics().catch(() => null);
  if (!m) {
    return { ...base, status: "SIN_DATO", summary: "Sin señales estructuradas para priorizar mejoras.", findings: ["No se pudieron leer las métricas ejecutivas."], recommendation: "Reintentar más tarde." };
  }
  const findings = [
    `First WOW pendientes: ${m.firstWowPendingCount ?? "s/d"}`,
    `Tickets B2B abiertos: ${m.openB2BTicketsCount ?? "s/d"}`,
    `Jobs fallidos: ${m.failedJobsCount ?? "s/d"}`,
  ];
  // Prioriza UNA mejora según la señal más fuerte. No crea tarea ni roadmap.
  if ((m.firstWowPendingCount ?? 0) > 0) {
    return { ...base, status: "ATENCION", summary: "El mayor cuello hoy es la activación (First WOW).", findings, recommendation: "Priorizar mejoras de onboarding para acelerar el First WOW." };
  }
  if ((m.openB2BTicketsCount ?? 0) > 0) {
    return { ...base, status: "ATENCION", summary: "El volumen de soporte sugiere fricción de producto.", findings, recommendation: "Priorizar mejoras de autoservicio para reducir tickets B2B." };
  }
  if ((m.failedJobsCount ?? 0) > 0) {
    return { ...base, status: "ATENCION", summary: "Hay jobs fallidos que afectan la confiabilidad.", findings, recommendation: "Priorizar la estabilización de los jobs de automatización." };
  }
  return { ...base, status: "OK", summary: "Sin señales fuertes de fricción; producto estable.", findings, recommendation: "Explorar mejoras incrementales de valor." };
}

export async function getAgentSpecialistReports(): Promise<AgentSpecialistReport[]> {
  return Promise.all([
    getOnboardingSpecialistReport(),
    getSupportB2BSpecialistReport(),
    getQASpecialistReport(),
    getFinanceSpecialistReport(),
    getIntegrationsSpecialistReport(),
    getProductSpecialistReport(),
  ]);
}

export async function generateOperativeDiagnosis(): Promise<{
  success: boolean;
  diagnosis?: string;
  error?: string;
  isQuotaError?: boolean;
}> {
  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const [
      alerts,
      observability,
      pendingApprovals,
      pendingTasks,
      failedAutomations,
      trialingOrgs,
      quotaErrorLog,
      activationSnapshot,
      aiCostSummary,
      openSupportTickets,
    ] = await Promise.all([
      getOperationalAlerts().catch(() => [] as Awaited<ReturnType<typeof getOperationalAlerts>>),
      getOperationalObservabilitySnapshot().catch(() => null),
      prisma.agentApproval.count({ where: { status: "PENDING" } }).catch(() => null),
      prisma.agentTask.count({ where: { status: { in: ["PENDING", "APPROVAL_PENDING"] } } }).catch(() => null),
      prisma.agentAutomation.count({ where: { status: "FAILED" } }).catch(() => null),
      prisma.organization.count({ where: { subscription: { status: "TRIALING" }, isActive: true } }).catch(() => null),
      prisma.agentLog
        .findFirst({
          where: {
            level: "ERROR",
            OR: [{ message: { contains: "429" } }, { message: { contains: "quota" } }],
            timestamp: { gte: sixHoursAgo },
          },
          orderBy: { timestamp: "desc" },
        })
        .catch(() => null),
      getPlatformActivationSnapshot().catch(() => null),
      getAiUsageSummary().catch(() => null),
      prisma.conversation.count({
        where: {
          organizationId: process.env.WHATSAPP_ORGANIZATION_ID || "not-set",
          status: "OPEN"
        }
      }).catch(() => 0),
    ]);

    const manualContext = getManualContextForAI();

    const contextBlock = `SNAPSHOT OPERATIVO (${new Date().toISOString()}):
- Tareas Operativas en cola: ${pendingTasks ?? "N/D"}
- Aprobaciones pendientes (Borradores Nivel 2): ${pendingApprovals ?? "N/D"}
- Tickets de Soporte Abiertos: ${openSupportTickets ?? 0}
- Organizaciones en período de prueba (Trial): ${trialingOrgs ?? "N/D"}
- Inmobiliarias trabadas sin su First WOW: ${activationSnapshot ? (activationSnapshot.summary.totalOrganizations - activationSnapshot.summary.firstLeadCount) : "N/D"}
- Costo de IA consumido en el mes: $${aiCostSummary?.totalCostUsd?.toFixed(2) ?? "N/D"}
- Error crítico de cuota OpenAI (6h): ${quotaErrorLog ? "SÍ" : "No"}
- Fallos en automatizaciones (Jobs): ${failedAutomations ?? "N/D"}
${observability ? `- Observabilidad: ${JSON.stringify(observability, null, 2)}` : ""}
${alerts && alerts.length > 0 ? `- Alertas activas (${alerts.length}):\n${alerts.map((a: any) => `  • [${a.level ?? a.severity ?? "INFO"}] ${a.message ?? a.title ?? JSON.stringify(a)}`).join("\n")}` : "- Sin alertas activas detectadas."}`;

    const systemPrompt = `Eres el Director IA / CEO IA B2B de RaicesPilot (modo SUPERVISADO).
Tu rol es analizar el estado de toda la plataforma y generar un diagnóstico ejecutivo estructurado para el Superadmin humano. Eres un director general de producto, soporte y métricas, no un simple agente de redes sociales.

REGLAS CRÍTICAS DE SEGURIDAD:
1. NUNCA reveles secretos del sistema, tokens de API, contraseñas, URLs de base de datos ni variables de entorno.
2. NUNCA accedas ni menciones datos de tenants o clientes específicos por nombre real.
3. NUNCA ejecutes ni propongas acciones autónomas — solo diagnostica y sugiere.
4. HITL estricto: toda sugerencia debe ser revisada y aprobada por el operador humano antes de ejecutarse.
5. Si detectas una situación que supera el alcance técnico, propone derivar con el equipo de ingeniería.
6. Prioriza problemas de activación (First WOW), cuotas de IA (OpenAI), fallos en sistema y soporte pendiente B2B.

CONOCIMIENTO DEL SISTEMA:
${manualContext}`;

    const userPrompt = `${contextBlock}

Por favor genera un Diagnóstico Operativo completo con las siguientes secciones:

1. **Resumen Ejecutivo** — estado general de la plataforma B2B en 2-3 oraciones.
2. **Activación y First WOW** — análisis de tenants estancados en el onboarding y sugerencias para activarlos.
3. **Soporte B2B** — estado de tickets abiertos, criticidad y sugerencias de resolución.
4. **Presupuesto y Costos IA** — análisis del costo consumido en el mes, límites y errores de cuota (OpenAI).
5. **Cola Operativa y Automatizaciones** — tareas retenidas, aprobaciones pendientes y cron jobs fallidos.
6. **Salud del Sistema (QA)** — resumen de alertas activas y métricas del servidor.
7. **Próxima Mejor Acción (Next Best Action)** — las 3 acciones más urgentes que el Superadmin debe ejecutar HOY.
8. **Semáforo Operativo** — evalúa el estado general como: 🟢 NOMINAL / 🟡 ATENCIÓN / 🔴 CRÍTICO con justificación breve.
9. **Nota HITL** — recordatorio fijo: "Este diagnóstico es informativo. Ninguna acción se ejecuta automáticamente. Requiere aprobación."

Responde en español castellano profesional, claro y directo como el CEO IA de la plataforma. No uses saludos ni cierres innecesarios.`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create(
      {
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1800,
      },
      { timeout: OPENAI_TIMEOUT_MS }
    );

    const diagnosis = completion.choices[0]?.message?.content?.trim() ?? "";
    return { success: true, diagnosis };
  } catch (error: any) {
    const isQuotaError =
      error?.status === 429 ||
      error?.code === "insufficient_quota" ||
      (typeof error?.message === "string" && error.message.includes("429"));

    return {
      success: false,
      isQuotaError,
      error: isQuotaError
        ? "Cuota de OpenAI agotada. El diagnóstico no está disponible temporalmente. Reintenta en unos minutos."
        : "Error al generar el diagnóstico operativo. El motor de IA no respondió correctamente.",
    };
  }
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
