import type { AiAgent, AiAgentStatus, AiAgentTone } from "@prisma/client";

export type { AiAgentStatus, AiAgentTone };

export type AgentSummary = {
  id: string;
  name: string;
  description: string | null;
  status: AiAgentStatus;
  tone: AiAgentTone;
  language: string;
  is24x7: boolean;
  zoneFilters: string[];
  propertyTypes: string[];
  minBudget: number | null;
  maxBudget: number | null;
  escalateAfterMessages: number;
  escalateOnKeywords: string[];
  humanHandoffMessage: string | null;
  persona: string | null;
  whatsappChannelId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentDetail = AgentSummary & {
  whatsappChannel?: {
    id: string;
    displayPhoneNumber: string | null;
    verifiedDisplayName: string | null;
    status: string;
  } | null;
};

export function buildAgentSummary(agent: AiAgent): AgentSummary {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    status: agent.status,
    tone: agent.tone,
    language: agent.language,
    is24x7: agent.is24x7,
    zoneFilters: agent.zoneFilters,
    propertyTypes: agent.propertyTypes,
    minBudget: agent.minBudget,
    maxBudget: agent.maxBudget,
    escalateAfterMessages: agent.escalateAfterMessages,
    escalateOnKeywords: agent.escalateOnKeywords,
    humanHandoffMessage: agent.humanHandoffMessage,
    persona: agent.persona,
    whatsappChannelId: agent.whatsappChannelId,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}

export const TONE_LABELS: Record<AiAgentTone, string> = {
  FORMAL: "Formal",
  FRIENDLY: "Cercano",
  NEUTRAL: "Neutro",
};

export const TONE_DESCRIPTIONS: Record<AiAgentTone, string> = {
  FORMAL: "\"Buenos días, con gusto lo asisto en su búsqueda.\"",
  FRIENDLY: "\"¡Hola! ¿Estás buscando algo especial? ¡Te ayudo!\"",
  NEUTRAL: "\"Hola, ¿en qué puedo ayudarte?\"",
};

export const STATUS_LABELS: Record<AiAgentStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  PAUSED: "Pausado",
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Departamento",
  HOUSE: "Casa",
  OFFICE: "Oficina",
  LAND: "Terreno",
  COMMERCIAL: "Local comercial",
  GARAGE: "Garaje / Cochera",
};
