export type WhatsAppChannelHealth = {
  status: string;
  displayPhoneNumber: string | null;
  lastErrorAt: string | null;
  lastErrorCode: string | null;
};

export type OrgHealthStatus = "ok" | "warning" | "critical";

export type OrgPlatformSummary = {
  id: string;
  name: string;
  slug: string;
  city: string;
  planLabel: string;
  isActive: boolean;
  memberCount: number;
  leadCount: number;
  propertyCount: number;
  recentLeadCount: number;
  pendingFollowUpCount: number;
  recentFailedDeliveries: number;
  lastActivityAt: string | null;
  whatsappChannel: WhatsAppChannelHealth | null;
  health: OrgHealthStatus;
  onboardingStatus: "Sin usuarios" | "Invitación pendiente" | "Onboarding iniciado" | "Operativa";
  maxAiAgents: number;
  aiAgentCount: number;
  agentQuotaNote: string | null;
  commercialStatus: string;
  commercialStatusLabel: string;
  commercialAccess: "allowed" | "blocked";
  commercialSource: "subscription" | "legacy" | "organization";
  billingMode: string | null;
  billingModeLabel: string | null;
  currentPeriodEnd: string | null;
  internalBillingNotes: string | null;
  planId: string | null;
};

export type PlatformPlanOption = {
  id: string;
  name: string;
};
