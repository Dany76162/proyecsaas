"use server";

import { requirePlatformAdmin } from "@/server/auth/access";
import { SourceEngine } from "./engine/source-engine";
import { createProspect, detectPotentialDuplicates, calculateProspectScores } from "./service";
import { revalidatePath } from "next/cache";
import { ProspectSourceType } from "@prisma/client";
import { NormalizedProspect } from "./engine/types";

export async function searchPlacesAction(params: {
  topic: string;
  country: string;
  countryCode: string;
  city: string;
  sourceType: ProspectSourceType;
  limit?: number;
}) {
  try {
    await requirePlatformAdmin();
    const { topic, country, countryCode, city, sourceType, limit } = params;
    
    if (!topic || !country || !city || !sourceType) {
      throw new Error("Rubro, país, ciudad y fuente son obligatorios.");
    }

    const places = await SourceEngine.search({
      query: topic,
      country,
      countryCode,
      city,
      sourceType,
      limit,
    });

    // Enrich with duplicate info
    const candidates = await Promise.all(
      places.map(async (place) => {
        const duplicates = await detectPotentialDuplicates(
          place.website || undefined, 
          place.website || undefined, 
          place.companyName, 
          place.placeId || undefined, 
          place.phone || undefined
        );
        
        return {
          ...place,
          isDuplicate: duplicates.length > 0,
          duplicateOfId: duplicates.length > 0 ? duplicates[0].id : null,
          selected: duplicates.length === 0, // Unselect by default if duplicate
        };
      })
    );

    return { success: true, candidates };
  } catch (err: any) {
    console.error("Error in searchPlacesAction:", err);
    return { success: false, error: err.message || "Error al buscar en el motor de fuentes." };
  }
}

export async function importPlacesBatchAction(candidates: (NormalizedProspect & { isDuplicate?: boolean, duplicateOfId?: string, selected?: boolean })[], countryCode: string, stateProvince: string, city: string) {
  try {
    const user = await requirePlatformAdmin();
    const results = [];
    const importBatchId = `batch_${Date.now()}`;

    for (const c of candidates) {
      if (!c.companyName) continue;

      const prospect = await createProspect({
        companyName: c.companyName,
        companyType: "OTHER_REAL_ESTATE", // Will map better in the future
        status: "NEEDS_REVIEW",
        manualStatus: "REVISAR",
        
        countryCode: countryCode,
        stateProvince: stateProvince,
        city: city,
        formattedAddress: c.formattedAddress || null,
        latitude: c.latitude || null,
        longitude: c.longitude || null,
        placeId: c.placeId || null,
        
        website: c.website || null,
        phone: c.phone || null,
        
        sourceType: c.sourceType,
        rawSourceData: c.rawSourceData ? JSON.parse(JSON.stringify(c.rawSourceData)) : null,
        addressVerified: c.addressVerified || false,
        validationStatus: c.validationStatus || "PENDING_ADDRESS",
        importBatchId: importBatchId,
        
        duplicateOfId: c.duplicateOfId || null,
      }, user.id);

      await calculateProspectScores(prospect.id);
      results.push(prospect.id);
    }

    revalidatePath("/platform/agents/prospecting");
    return { success: true, count: results.length };
  } catch (err: any) {
    console.error("Error in importPlacesBatchAction:", err);
    return { success: false, error: err.message || "Error al importar prospectos." };
  }
}
