"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requirePlatformAdmin } from "@/server/auth/access";

export async function updateGlobalSetting(key: string, value: string) {
  await requirePlatformAdmin();
  try {
    await prisma.globalSetting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value, updatedAt: new Date() },
    });
    revalidatePath("/platform/settings");
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
      settings.find((s) => s.key === key)?.value ?? fallback;

    return {
      waContact: get("PLATFORM_WHATSAPP_NUMBER", process.env.PLATFORM_WHATSAPP_CONTACT ?? "No configurado"),
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
  if (!user) return { success: false, error: "Usuario no encontrado en el sistema" };
  if (user.isPlatformAdmin) return { success: false, error: "Este usuario ya es administrador" };
  await prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: true } });
  revalidatePath("/platform/settings");
  return { success: true };
}

export async function revokeAdminAccess(userId: string) {
  const currentUser = await requirePlatformAdmin();
  if (userId === currentUser.id) return { success: false, error: "No podés revocar tu propio acceso" };
  await prisma.user.update({ where: { id: userId }, data: { isPlatformAdmin: false } });
  revalidatePath("/platform/settings");
  return { success: true };
}
