"use server";

import { requirePlatformAdmin } from "@/server/auth/access";
import { searchPlacesByZone, GooglePlaceCandidate } from "./places-service";
import { createProspect, detectPotentialDuplicates, calculateProspectScores } from "./service";
import { revalidatePath } from "next/cache";

export async function searchPlacesAction(params: {
  topic: string;
  country: string;
  city: string;
  limit?: number;
}) {
  try {
    await requirePlatformAdmin();
    const { topic, country, city, limit } = params;
    
    if (!topic || !country || !city) {
      throw new Error("Rubro, país y ciudad son obligatorios.");
    }

    const places = await searchPlacesByZone(topic, country, city, limit);

    // Enrich with duplicate info
    const candidates = await Promise.all(
      places.map(async (place) => {
        // Also check by placeId and phone in detectPotentialDuplicates (needs to be added in service)
        const duplicates = await detectPotentialDuplicates(
          place.website || undefined, 
          place.website || undefined, 
          place.companyName, 
          place.placeId, 
          place.phone || place.internationalPhone || undefined
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
    return { success: false, error: err.message || "Error al buscar en Google Places." };
  }
}

export async function importPlacesBatchAction(candidates: any[], countryCode: string, stateProvince: string, city: string) {
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
        phone: c.phone || c.internationalPhone || null,
        
        sourceType: "GOOGLE_PLACES",
        rawSourceData: c.rawSourceData || null,
        addressVerified: false,
        validationStatus: "PENDING_ADDRESS",
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
