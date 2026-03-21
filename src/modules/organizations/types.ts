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
