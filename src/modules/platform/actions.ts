"use server";

import crypto from "node:crypto";
import { MembershipRole } from "@prisma/client";
import { z } from "zod";

import type { ActionResult } from "@/modules/types";
import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

const generateInviteSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

/**
 * Superadmin Action: Removes all Memberships from a specific organization.
 * It strictly cuts human access but leaves the operational data intact.
 */
export async function clearOrganizationMembershipsAction(orgSlug: string): Promise<ActionResult> {
  const adminId = await requirePlatformAdmin();

  if (!adminId) {
    return {
      success: false,
      message: "No tienes permisos de plataforma para ejecutar esta acción.",
    };
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    const result = await prisma.membership.deleteMany({
      where: { organizationId: org.id },
    });

    return {
      success: true,
      message: `Membresías limpiadas correctamente de "${org.name}". Se eliminaron ${result.count} accesos.`,
    };
  } catch (error) {
    console.error("[clearOrganizationMembershipsAction] Falló:", error);
    return {
      success: false,
      message: "Hubo un error al intentar limpiar las membresías. Verifica los logs.",
    };
  }
}

/**
 * Superadmin Action: Bootstraps the first user (OWNER) for an organization
 * and generates a direct invite link for them to set their password.
 */
export async function generateInitialAdminInviteAction(
  orgSlug: string,
  input: { email: string; fullName: string }
): Promise<ActionResult> {
  const adminId = await requirePlatformAdmin();

  if (!adminId) {
    return {
      success: false,
      message: "No tienes permisos de plataforma para ejecutar esta acción.",
    };
  }

  const parsed = generateInviteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Datos de usuario inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, _count: { select: { memberships: true } } },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    if (org._count.memberships > 0) {
      return {
        success: false,
        message: "Esta inmobiliaria ya posee usuarios asignados. No se puede generar el primer acceso.",
      };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 168); // 7 días de validez para el 1º acceso

    const { inviteUrl } = await prisma.$transaction(async (tx) => {
      // 1. Crear o actualizar el registro del User global (por si era un invite abandonado)
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

      // 2. Anclarlo a la organización con permisos absolutos (OWNER)
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: MembershipRole.OWNER,
        },
      });

      // 3. Generar token de invitación
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
      message: "Primer acceso admin generado correctamente.",
      data: { inviteUrl },
    };
  } catch (error) {
    console.error("[generateInitialAdminInviteAction] Falló:", error);
    return {
      success: false,
      message: "Hubo un error al generar la invitación. Intenta nuevamente.",
    };
  }
}
