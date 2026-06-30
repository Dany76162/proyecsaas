import { ProspectSourceAdapter, ProspectSearchParams, NormalizedProspect } from "../types";
import { ProspectSourceType, DataValidationStatus } from "@prisma/client";

export class SerperAdapter implements ProspectSourceAdapter {
  async healthCheck(): Promise<boolean> {
    const apiKey = process.env.SERPER_API_KEY;
    return !!apiKey;
  }

  async search(params: ProspectSearchParams): Promise<NormalizedProspect[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      throw new Error("SERPER_API_KEY no está configurada.");
    }

    const query = `${params.query} en ${params.city}, ${params.country}`;
    const limit = params.limit || 20;

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: query,
        num: limit,
        gl: params.countryCode?.toLowerCase() || "ar",
        hl: params.language || "es"
      })
    });

    if (!response.ok) {
      throw new Error(`Error en Serper API: ${response.statusText}`);
    }

    const data = await response.json();
    
    // We use organic results
    const organicResults: any[] = data.organic || [];
    
    // Sometimes there are 'places' results inside a normal search
    const placesResults: any[] = data.places || [];

    // Prioritize places if available, otherwise organic
    const results = placesResults.length > 0 ? placesResults : organicResults;

    // Limit the results
    return results.slice(0, limit).map(result => this.normalize(result));
  }

  normalize(rawData: any): NormalizedProspect {
    // If it's a place result, it has 'title' and 'address'
    // If organic, it has 'title', 'link', 'snippet'
    const companyName = rawData.title || "Empresa Desconocida";
    const website = rawData.link || rawData.website || null;
    const formattedAddress = rawData.address || rawData.snippet || null;
    
    return {
      companyName,
      website,
      phone: null,
      email: null,
      formattedAddress,
      city: null, 
      stateProvince: null,
      country: null, 
      countryCode: null, 
      latitude: null,
      longitude: null,
      sourceType: ProspectSourceType.WEB_SEARCH,
      rawSourceData: rawData,
      placeId: null,
      externalId: website, // Link acts as a good external ID if available
      sourceUrl: website,
      businessStatus: null,
      validationStatus: rawData.address ? DataValidationStatus.PENDING_ADDRESS : DataValidationStatus.AMBIGUOUS,
      addressVerified: false,
      confidenceScore: 0.6
    };
  }
}
