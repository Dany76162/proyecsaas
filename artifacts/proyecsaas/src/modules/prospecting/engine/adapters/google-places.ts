import { NormalizedProspect, ProspectSearchParams, ProspectSourceAdapter } from "../types";
import { ProspectSourceType, DataValidationStatus } from "@prisma/client";

const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";

export class GooglePlacesAdapter implements ProspectSourceAdapter {
  async search(params: ProspectSearchParams): Promise<NormalizedProspect[]> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY no está configurada.");
    }

    const { query, country, city, limit = 20 } = params;
    const searchQuery = `${query} en ${city}, ${country}`;
    
    // Strict field mask to keep costs down (Pro SKU)
    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.types",
      "places.websiteUri",
      "places.nationalPhoneNumber",
      "places.internationalPhoneNumber",
      "places.businessStatus",
      "places.googleMapsUri"
    ].join(",");

    const response = await fetch(PLACES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        languageCode: params.language || "es",
        maxResultCount: Math.min(limit, 20), // Hardcap as requested
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Google Places API error:", text);
      throw new Error("Error al consultar Google Places API.");
    }

    const data = await response.json();
    if (!data.places || !Array.isArray(data.places)) {
      return [];
    }

    return data.places
      .filter((p: any) => p.businessStatus === "OPERATIONAL")
      .map((p: any) => this.normalize(p));
  }

  normalize(rawData: any): NormalizedProspect {
    return {
      companyName: rawData.displayName?.text || "Desconocido",
      website: rawData.websiteUri || null,
      phone: rawData.nationalPhoneNumber || rawData.internationalPhoneNumber || null,
      email: null,
      formattedAddress: rawData.formattedAddress || null,
      city: null, // Should be inferred or assigned by the engine/caller
      stateProvince: null,
      country: null,
      countryCode: null,
      latitude: rawData.location?.latitude || null,
      longitude: rawData.location?.longitude || null,
      sourceType: ProspectSourceType.GOOGLE_PLACES,
      rawSourceData: rawData,
      placeId: rawData.id || null,
      externalId: rawData.id || null,
      sourceUrl: rawData.googleMapsUri || null,
      businessStatus: rawData.businessStatus || null,
      validationStatus: DataValidationStatus.PENDING_ADDRESS,
      addressVerified: false,
      confidenceScore: null,
    };
  }

  async healthCheck(): Promise<boolean> {
    return !!process.env.GOOGLE_PLACES_API_KEY;
  }
}
