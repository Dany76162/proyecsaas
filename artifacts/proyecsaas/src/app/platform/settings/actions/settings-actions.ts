"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";
import { requirePlatformAdmin } from "@/server/auth/access";
import { getSessionUser } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";

export async function updateGlobalSetting(key: string, value: string) {
  const actor = await requirePlatformAdmin();

  try {
    await prisma.globalSetting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value, updatedAt: new Date() },
    });

    revalidatePath("/platform/settings");

    await logAudit({
      event: "settings.updated",
      actorId: actor.id,
      actorEmail: actor.email,
      entityType: "GlobalSetting",
      entityId: key,
      metadata: { key },
    });

    return { success: true };
  } catch (error) {
    console.error(`Error updating global setting ${key}:`, error);
    throw new Error("Failed to update global setting");
  }
}

export async function getGlobalSettings() {
  try {
    const settings = await prisma.globalSetting.findMany();
    const get = (key: string, fallback = "") =>
      settings.find((setting) => setting.key === key)?.value ?? fallback;

    return {
      waContact:
        get("PLATFORM_WHATSAPP_NUMBER", process.env.PLATFORM_WHATSAPP_CONTACT ?? "No configurado"),
      basePrice: get("BASE_PLAN_PRICE_ARS", "0"),
      operatorName: get("OPERATOR_NAME"),
      operatorLastName: get("OPERATOR_LASTNAME"),
      operatorCuid: get("OPERATOR_CUID"),
      operatorCompany: get("OPERATOR_COMPANY"),
    };
  } catch {
    console.warn("GlobalSetting table not found, using environment fallbacks.");
    return {
      waContact: process.env.PLATFORM_WHATSAPP_CONTACT ?? "No configurado",
      basePrice: "0",
      operatorName: "",
      operatorLastName: "",
      operatorCuid: "",
      operatorCompany: "",
    };
  }
}

export async function getDelegatedAdmins() {
  const currentUser = await requirePlatformAdmin();

  try {
    return await prisma.user.findMany({
      where: { isPlatformAdmin: true, id: { not: currentUser.id } },
      select: { id: true, fullName: true, email: true },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return [];
  }
}

export async function grantAdminAccess(email: string) {
  await requirePlatformAdmin();

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { success: false, error: "Usuario no encontrado en el sistema" };
  }

  if (user.isPlatformAdmin) {
    return { success: false, error: "Este usuario ya es administrador" };
  }

  const actor = await requirePlatformAdmin();

  await prisma.user.update({
    where: { id: user.id },
    data: { isPlatformAdmin: true },
  });

  revalidatePath("/platform/settings");

  await logAudit({
    event: "admin.access_granted",
    actorId: actor.id,
    actorEmail: actor.email,
    entityType: "User",
    entityId: user.id,
    entityName: user.email,
  });

  return { success: true };
}

export async function revokeAdminAccess(userId: string) {
  const currentUser = await requirePlatformAdmin();

  if (userId === currentUser.id) {
    return { success: false, error: "No podés revocar tu propio acceso" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { isPlatformAdmin: false },
  });

  revalidatePath("/platform/settings");

  await logAudit({
    event: "admin.access_revoked",
    actorId: currentUser.id,
    actorEmail: currentUser.email,
    entityType: "User",
    entityId: userId,
    entityName: user?.email,
  });

  return { success: true };
}

export async function deleteUserCompletely(userId: string) {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.isPlatformAdmin) {
    return { success: false, error: "No autorizado para eliminar usuarios." };
  }

  if (sessionUser.id === userId) {
    return { success: false, error: "No podés eliminar tu propio usuario." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      _count: {
        select: {
          createdVisits: true,
        },
      },
    },
  });

  if (!user) {
    return { success: false, error: "Usuario no encontrado." };
  }

  if (user._count.createdVisits > 0) {
    return {
      success: false,
      error:
        "No se puede eliminar definitivamente este usuario porque tiene visitas creadas asociadas.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.inviteToken.deleteMany({
        where: { userId },
      });

      await tx.membership.deleteMany({
        where: { userId },
      });

      await tx.availabilitySlot.deleteMany({
        where: { userId },
      });

      await tx.lead.updateMany({
        where: { ownerId: userId },
        data: { ownerId: null },
      });

      await tx.user.delete({
        where: { id: userId },
      });
    });

    revalidatePath("/platform/settings");

    await logAudit({
      event: "user.deleted_completely",
      actorId: sessionUser.id,
      actorEmail: sessionUser.email,
      entityType: "User",
      entityId: user.id,
      entityName: user.email,
      metadata: {
        fullName: user.fullName,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[deleteUserCompletely] Failed:", error);
    return {
      success: false,
      error: "No se pudo eliminar el usuario definitivamente.",
    };
  }
}
