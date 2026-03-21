import "server-only";

import { getDemoOrganizationBySlug, listDemoUsersByOrganization } from "@/server/demo/workspace-store";

import type { OrganizationMember, UserRoleBreakdown } from "@/modules/users/types";

export async function listOrganizationUsers(
  orgSlug: string,
): Promise<OrganizationMember[]> {
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return [];
  }

  return listDemoUsersByOrganization(organization.id);
}

export async function getUserRoleBreakdown(
  orgSlug: string,
): Promise<UserRoleBreakdown[]> {
  const users = await listOrganizationUsers(orgSlug);
  const counts = new Map<string, number>();

  for (const user of users) {
    counts.set(user.role, (counts.get(user.role) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([role, count]) => ({
    role: role as UserRoleBreakdown["role"],
    count,
  }));
}
