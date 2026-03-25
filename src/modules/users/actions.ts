"use server";

import { MembershipRole } from "@prisma/client";

import type { ActionResult } from "@/modules/types";
import { inviteUserSchema } from "@/modules/users/schemas";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";

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

  return {
    success: false,
    message: "User invitations are prepared at the action layer and will be persisted next.",
  };
}
