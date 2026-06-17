export type OrganizationSummary = {
  id: string;
  slug: string;
  name: string;
  city: string;
  planLabel: string;
  marketFocus: string;
  description: string;
  memberCount: number;
  leadCount: number;
  propertyCount: number;
};

export type OrganizationWorkspace = OrganizationSummary & {
  activeLeadCount: number;
  publicPropertyCount: number;
  availablePropertyCount: number;
};

export type WorkspaceNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  createdAt: string;
};

export type SetupChecklistStatus = {
  profileComplete: boolean;
  propertiesLoaded: boolean;
  agentConfigured: boolean;
  whatsappConnected: boolean;
  /** Listo para operar = los 4 pasos de setup. No incluye la prueba del agente. */
  readyToOperate: boolean;
  /** El usuario ya probó el agente (existe al menos una conversación). */
  tested: boolean;
  completedCount: number;
  totalCount: number;
  /** Onboarding 100% terminado = setup + prueba del agente (el WOW). */
  isComplete: boolean;
};
