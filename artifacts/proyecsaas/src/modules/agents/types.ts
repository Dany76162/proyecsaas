export type AgentTaskSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  agentName: string | null;
  createdAt: string;
};

export type ContentDraftSummary = {
  id: string;
  title: string | null;
  platform: string;
  status: string;
  createdAt: string;
};

export type AgentApprovalSummary = {
  id: string;
  taskTitle: string;
  agentName: string | null;
  requestedAt: string;
  status: string;
};

export type AgentLogSummary = {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  runId: string | null;
};

export type AgentCanvasMetric = {
  label: string;
  value: number | string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

export type AgentCanvasActivity = {
  id: string;
  level: string;
  message: string;
  timestamp: string;
};

export type AgentCanvasNode = {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  status: string;
  description: string;
  href?: string;
  metrics: AgentCanvasMetric[];
  activities: AgentCanvasActivity[];
};

export type AgentCanvasData = {
  generatedAt: string;
  systemStatus: "operational" | "attention" | "empty";
  nodes: {
    orchestrator: AgentCanvasNode;
    marketing: AgentCanvasNode;
    tasks: AgentCanvasNode;
    drafts: AgentCanvasNode;
    approvals: AgentCanvasNode;
    logs: AgentCanvasNode;
  };
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  DRAFT: "En borrador",
};

export const TONE_LABELS: Record<string, string> = {
  FORMAL: "Formal",
  FRIENDLY: "Amigable",
  NEUTRAL: "Neutral",
};

export const TONE_DESCRIPTIONS: Record<string, string> = {
  FORMAL: "Profesional y respetuoso, usa 'usted'.",
  FRIENDLY: "Cálido y cercano, usa 'vos/tú'.",
  NEUTRAL: "Conciso y directo, sin vueltas.",
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  HOUSE: "Casa",
  APARTMENT: "Departamento",
  LAND: "Terreno",
  COMMERCIAL: "Local/Oficina",
  OTHER: "Otro",
};

export type AiAgentStatus = "ACTIVE" | "PAUSED" | "DRAFT";

export type AgentSummary = {
  id: string;
  name: string;
  description: string | null;
  status: AiAgentStatus;
  tone: string;
  isActive: boolean;
  is24x7: boolean;
  whatsappChannelId: string | null;
  zoneFilters: string[];
};

export type AgentDetail = AgentSummary & {
  persona: string | null;
  language: string;
  escalateOnKeywords: string[];
  humanHandoffMessage: string | null;
  escalateAfterMessages: number;
  propertyTypes: string[];
  minBudget: number | null;
  maxBudget: number | null;
};
