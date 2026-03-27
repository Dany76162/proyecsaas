"use server";

import { MembershipRole } from "@prisma/client";

import type { ActionResult } from "@/modules/types";
import { inviteUserSchema } from "@/modules/users/schemas";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

/**
 * Invites a new user to the given organization.
 *
 * Auth: requires active session + organization membership for `orgSlug`.
 * Minimum role: ADMIN.
 *
 * NOTE: Placeholder — auth and validation are wired but database persistence
 * is not yet connected. Returns success: false until persistence is implemented.
 */
export async function inviteUserAction(orgSlug: string, input: unknown): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = inviteUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "User invite input is invalid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await prisma.user.upsert({
    where: { email: parsed.data.email },
    create: {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      isActive: true,
    },
    update: {
      fullName: parsed.data.fullName,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: membership.organization.id,
      },
    },
    create: {
      userId: user.id,
      organizationId: membership.organization.id,
      role: parsed.data.role,
    },
    update: {
      role: parsed.data.role,
    },
  });

  return { success: true, message: "User invited." };
}
