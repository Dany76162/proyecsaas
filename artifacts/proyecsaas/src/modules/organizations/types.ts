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
  readyToOperate: boolean;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
};
