"use server";

import { MembershipRole } from "@prisma/client";

import type { ActionResult } from "@/modules/types";
import { updateOrganizationSchema, updatePropertySourceSchema } from "@/modules/organizations/schemas";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

/**
 * Updates the public profile and contact info of the given organization.
 * Auth: active session + org membership. Minimum role: ADMIN.
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
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Convert empty strings to null so optional fields clear correctly.
  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, typeof v === "string" && v === "" ? null : v]),
  );

  await prisma.organization.update({
    where: { slug: orgSlug },
    data,
  });

  return { success: true, message: "Cambios guardados correctamente." };
}

/**
 * Saves the property source URL and type for future sync.
 * Auth: active session + org membership. Minimum role: ADMIN.
 */
export async function updatePropertySourceAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = updatePropertySourceSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: "Datos de fuente inválidos." };
  }

  await prisma.organization.update({
    where: { slug: orgSlug },
    data: {
      propertySourceUrl: parsed.data.propertySourceUrl || null,
      propertySourceType: parsed.data.propertySourceType || null,
    },
  });

  return { success: true, message: "Fuente de propiedades guardada." };
}

/**
 * Marks all notifications for the organization as read (readAt = now) safely.
 * Auth: active session + org membership. Minimum role: AGENT.
 */
export async function clearWorkspaceNotificationsAction(
  orgSlug: string,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  await prisma.notification.updateMany({
    where: {
      organizationId: membership.organization.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return { success: true, message: "Notificaciones archivadas correctamente." };
}

