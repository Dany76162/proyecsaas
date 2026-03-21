import "server-only";

import { prisma } from "@/server/db/prisma";

import type { OrganizationMember, UserRoleBreakdown } from "@/modules/users/types";

export async function listOrganizationUsers(
  orgSlug: string,
): Promise<OrganizationMember[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      organization: {
        slug: orgSlug,
      },
    },
    include: {
      user: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return memberships
    .map((membership) => ({
      id: membership.user.id,
      fullName: membership.user.fullName,
      email: membership.user.email,
      jobTitle: membership.user.jobTitle ?? "Team member",
      isActive: membership.user.isActive,
      role: membership.role,
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName));
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
