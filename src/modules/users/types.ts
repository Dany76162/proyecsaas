import type { MembershipRole } from "@prisma/client";

export type OrganizationMember = {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  isActive: boolean;
  role: MembershipRole;
};

export type UserRoleBreakdown = {
  role: MembershipRole;
  count: number;
};
