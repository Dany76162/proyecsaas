import { ProspectCompanyType, ProspectSourceType, DataValidationStatus } from "@prisma/client";

const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";

export interface GooglePlaceCandidate {
  placeId: string;
  companyName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  website: string | null;
  phone: string | null;
  internationalPhone: string | null;
  businessStatus: string;
  types: string[];
  googleMapsUri: string;
  rawSourceData: any;
}

export async function searchPlacesByZone(
  topic: string,
  country: string,
  city: string,
  limit: number = 20
): Promise<GooglePlaceCandidate[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY no está configurada.");
  }

  const query = `${topic} en ${city}, ${country}`;
  
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
      textQuery: query,
      languageCode: "es",
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
    .map((p: any) => ({
      placeId: p.id,
      companyName: p.displayName?.text || "Desconocido",
      formattedAddress: p.formattedAddress || "",
      latitude: p.location?.latitude || 0,
      longitude: p.location?.longitude || 0,
      website: p.websiteUri || null,
      phone: p.nationalPhoneNumber || null,
      internationalPhone: p.internationalPhoneNumber || null,
      businessStatus: p.businessStatus,
      types: p.types || [],
      googleMapsUri: p.googleMapsUri || "",
      rawSourceData: p,
    }));
}
