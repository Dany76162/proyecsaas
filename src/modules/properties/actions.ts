"use server";

import { MembershipRole } from "@prisma/client";

import type { ActionResult } from "@/modules/types";
import { createPropertySchema } from "@/modules/properties/schemas";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";

/**
 * Creates a new property under the given organization.
 *
 * Auth: requires active session + organization membership for `orgSlug`.
 * Minimum role: AGENT.
 *
 * NOTE: Placeholder — auth and validation are wired but database persistence
 * is not yet connected. Returns success: false until persistence is implemented.
 */
export async function createPropertyAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = createPropertySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Property input is invalid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  return {
    success: false,
    message: "Property creation is prepared and will be connected to persistence next.",
  };
}
