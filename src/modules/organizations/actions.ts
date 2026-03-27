"use server";

import { MembershipRole } from "@prisma/client";

import type { ActionResult } from "@/modules/types";
import { updateOrganizationSchema } from "@/modules/organizations/schemas";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

/**
 * Updates the public profile of the given organization.
 *
 * Auth: requires active session + organization membership for `orgSlug`.
 * Minimum role: ADMIN.
 *
 * NOTE: Placeholder — auth and validation are wired but database persistence
 * is not yet connected. Returns success: false until persistence is implemented.
 */
export async function updateOrganizationProfileAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = updateOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Organization profile input is invalid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.organization.update({
    where: { slug: orgSlug },
    data: parsed.data,
  });

  return { success: true, message: "Organization profile updated." };
}
