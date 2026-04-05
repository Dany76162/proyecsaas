"use server";

import crypto from "node:crypto";
import { MembershipRole, Prisma } from "@prisma/client";
import { z } from "zod";

import type { ActionResult } from "@/modules/types";
import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(100),
  slug: z
    .string()
    .trim()
    .min(2, "El slug debe tener al menos 2 caracteres.")
    .max(60, "El slug no puede superar los 60 caracteres.")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones."),
  city: z.string().trim().max(100).optional(),
  planLabel: z.string().trim().max(60).optional(),
});

/**
 * Superadmin Action: Creates a new tenant organization.
 */
export async function createOrganizationAction(input: unknown): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, slug, city, planLabel } = parsed.data;

  try {
    await prisma.organization.create({
      data: {
        name,
        slug,
        city: city || null,
        planLabel: planLabel || null,
        isActive: true,
      },
    });

    return {
      success: true,
      message: `Inmobiliaria "${name}" creada correctamente.`,
      data: { slug },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        message: `El slug "${slug}" ya está en uso. Elegí otro.`,
        fieldErrors: { slug: [`El slug "${slug}" ya está en uso.`] },
      };
    }
    console.error("[createOrganizationAction]", error);
    return { success: false, message: "Error al crear la inmobiliaria. Intentá nuevamente." };
  }
}

const generateInviteSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

/**
 * Superadmin Action: Removes all Memberships from a specific organization.
 * It strictly cuts human access but leaves the operational data intact.
 */
export async function clearOrganizationMembershipsAction(orgSlug: string): Promise<ActionResult> {
  await requirePlatformAdmin();

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
 * Superadmin Action: Deactivates an organization (soft delete / baja de cliente).
 * Sets isActive = false, preserving all data but blocking tenant access.
 */
export async function deactivateOrganizationAction(orgSlug: string): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, isActive: true },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    if (!org.isActive) {
      return { success: false, message: "Esta cuenta ya está desactivada." };
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: { isActive: false },
    });

    return {
      success: true,
      message: `La cuenta "${org.name}" fue dada de baja. Los usuarios ya no podrán acceder al workspace.`,
    };
  } catch (error) {
    console.error("[deactivateOrganizationAction] Falló:", error);
    return {
      success: false,
      message: "Hubo un error al desactivar la cuenta. Verifica los logs.",
    };
  }
}

/**
 * Superadmin Action: Reactivates a previously deactivated organization.
 * Restores workspace access for all existing members.
 */
export async function reactivateOrganizationAction(orgSlug: string): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, isActive: true },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    if (org.isActive) {
      return { success: false, message: "Esta cuenta ya está activa." };
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: { isActive: true },
    });

    return {
      success: true,
      message: `La cuenta "${org.name}" fue reactivada. Los usuarios ya pueden acceder al workspace.`,
    };
  } catch (error) {
    console.error("[reactivateOrganizationAction] Falló:", error);
    return {
      success: false,
      message: "Hubo un error al reactivar la cuenta. Verifica los logs.",
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
  await requirePlatformAdmin();

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

/**
 * Superadmin Action: Adjusts the AI agent quota for an org.
 * Called when an agency pays for additional agent slots.
 */
export async function setOrgAgentQuotaAction(
  orgSlug: string,
  quota: number,
  note: string,
): Promise<ActionResult> {
  await requirePlatformAdmin();

  if (!Number.isInteger(quota) || quota < 1 || quota > 20) {
    return { success: false, message: "La cuota debe ser un número entre 1 y 20." };
  }

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });

  if (!org) {
    return { success: false, message: "Organización no encontrada." };
  }

  const trimmedNote = note.trim();
  const timestamp = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const noteWithDate = trimmedNote ? `${timestamp} — ${trimmedNote}` : null;

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      maxAiAgents: quota,
      agentQuotaNote: noteWithDate,
    },
  });

  return { success: true, message: `Cuota actualizada a ${quota} agente${quota !== 1 ? "s" : ""}.` };
}
