import type { MembershipRole } from "@prisma/client";

export type OrganizationMember = {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  isActive: boolean;
  role: MembershipRole;
  phone: string | null;
  whatsapp: string | null;
  zone: string | null;
  agentNotes: string | null;
};

export type UserRoleBreakdown = {
  role: MembershipRole;
  count: number;
};
