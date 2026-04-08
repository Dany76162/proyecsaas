"use server";

import { MembershipRole } from "@prisma/client";

import type { ActionResult } from "@/modules/types";
import { inviteUserSchema, updateMemberProfileSchema } from "@/modules/users/schemas";
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
          organizationId: membership.organization.id,
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

/**
 * Updates the operational profile of a team member within the organization.
 * Only ADMIN+ roles can call this. The target user must belong to the same org.
 */
export async function updateMemberProfileAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = updateMemberProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Datos inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Verify the target user belongs to this org
  const targetMembership = await prisma.membership.findFirst({
    where: {
      userId: parsed.data.userId,
      organizationId: membership.organization.id,
    },
  });

  if (!targetMembership) {
    return { success: false, message: "Usuario no encontrado en esta organización." };
  }

  try {
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        jobTitle: parsed.data.jobTitle || null,
        phone: parsed.data.phone || null,
        whatsapp: parsed.data.whatsapp || null,
        zone: parsed.data.zone || null,
        agentNotes: parsed.data.agentNotes || null,
        isActive: parsed.data.isActive,
      },
    });

    return { success: true, message: "Perfil actualizado correctamente." };
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2002") {
      return { success: false, message: "El email ya está en uso por otro usuario." };
    }
    console.error("[updateMemberProfileAction] Failed:", error);
    return { success: false, message: "Error al actualizar. Intentá nuevamente." };
  }
}
