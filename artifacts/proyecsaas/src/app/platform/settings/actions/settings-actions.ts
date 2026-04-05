"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";

/**
 * Updates a global setting in the database.
 * Changes are reflected across the platform immediately via revalidation.
 */
export async function updateGlobalSetting(key: string, value: string) {
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

/**
 * Fetches all global settings or provides default values if not set.
 * Resilient to missing table specifically for initial deployment.
 */
export async function getGlobalSettings() {
  try {
    const settings = await prisma.globalSetting.findMany();
    
    return {
      waContact: settings.find(s => s.key === "PLATFORM_WHATSAPP_NUMBER")?.value || process.env.PLATFORM_WHATSAPP_CONTACT || "No configurado",
      basePrice: settings.find(s => s.key === "BASE_PLAN_PRICE_ARS")?.value || "0",
    };
  } catch (error) {
    // If table doesn't exist yet, return defaults from env
    console.warn("GlobalSetting table not found, using environment fallbacks.");
    return {
      waContact: process.env.PLATFORM_WHATSAPP_CONTACT || "No configurado",
      basePrice: "0",
    };
  }
}
