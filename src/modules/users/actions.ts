"use server";

import { MembershipRole } from "@prisma/client";

import type { ActionResult } from "@/modules/types";
import { inviteUserSchema } from "@/modules/users/schemas";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
/**
 * Invites a user to the given organization and generates a one-time invite token.
 * 
 * Flow:
 * 1. Validates input schemas and admin roles.
 * 2. Atatomically upserts the user, ensures organization membership, and creates an invite token.
 * 3. Returns an absolute URL for the admin to share manually.
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

  const token = (await import("node:crypto")).randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72); // 72 hours

  try {
    const { inviteUrl } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
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

      await tx.membership.upsert({
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

      await tx.inviteToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteUrl = `${baseUrl}/invite/${token}`;

      return { inviteUrl };
    });

    return {
      success: true,
      message: "User invited successfully.",
      data: { inviteUrl },
    };
  } catch (error) {
    console.error("[inviteUserAction] Failed to create invitation transaction:", error);
    return {
      success: false,
      message: "Failed to create invitation. Please try again.",
    };
  }
}
