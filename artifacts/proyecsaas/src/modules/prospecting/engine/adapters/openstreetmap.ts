import { ProspectSourceAdapter, ProspectSearchParams, NormalizedProspect } from "../types";

export class OpenStreetMapAdapter implements ProspectSourceAdapter {
  private readonly baseUrl = "https://nominatim.openstreetmap.org/search";

  async search(params: ProspectSearchParams): Promise<NormalizedProspect[]> {
    if (!params.query || !params.city) {
      throw new Error("Query y ciudad son obligatorios para OpenStreetMap.");
    }

    const maxLimit = Math.min(params.limit || 20, 20);
    const q = `${params.query} en ${params.city}, ${params.country}`;

    const targetCity = params.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const url = new URL(this.baseUrl);
    url.searchParams.append("q", q);
    url.searchParams.append("format", "json");
    url.searchParams.append("addressdetails", "1");
    url.searchParams.append("extratags", "1");
    // Pedir más límite inicial para poder filtrar localmente sin quedarnos cortos
    url.searchParams.append("limit", "40");
    
    if (params.countryCode) {
      url.searchParams.append("countrycodes", params.countryCode.toLowerCase());
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "ProyecsaasProspecting/1.0 (contact@proyecsaas.com)",
          "Accept-Language": "es"
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Error HTTP en Nominatim/OSM: ${res.status}`);
      }

      const data = await res.json();
      
      if (!Array.isArray(data)) {
        return [];
      }

      // Filtrado estricto territorial
      const validResults = data.filter((item: any) => {
        const addr = item.address || {};
        const searchCorpus = [addr.city, addr.town, addr.village, addr.state, addr.county, addr.region]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        return searchCorpus.includes(targetCity);
      });

      return validResults.slice(0, maxLimit).map((item: any) => this.normalize({ raw: item, searchParams: params }));
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Tiempo de espera agotado al consultar OpenStreetMap.");
      }
      throw new Error(`Fallo al consultar OpenStreetMap: ${error.message}`);
    }
  }



  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}?q=test&format=json&limit=1`, {
        headers: { "User-Agent": "ProyecsaasProspecting/1.0" }
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  normalize(data: any): NormalizedProspect {
    const raw = data.raw || data;
    const searchParams = data.searchParams || {};
    
    const address = raw.address || {};
    const extratags = raw.extratags || {};

    const companyName = raw.name || address.shop || address.office || "Empresa Desconocida";
    
    // Website
    const website = extratags.website || extratags["contact:website"] || null;
    
    // Phone
    const phone = extratags.phone || extratags["contact:phone"] || null;
    
    // Email
    const email = extratags.email || extratags["contact:email"] || null;
    
    // Address format
    const street = address.road || "";
    const houseNumber = address.house_number || "";
    let formattedAddress = raw.display_name || "";
    if (street && houseNumber) {
      formattedAddress = `${street} ${houseNumber}, ${address.city || address.town || address.village || ""}, ${address.state || ""}`;
    }

    const lat = raw.lat ? parseFloat(raw.lat) : null;
    const lng = raw.lon ? parseFloat(raw.lon) : null;

    // Evaluate confidence
    let confidenceScore = 0;
    if (companyName !== "Empresa Desconocida") confidenceScore += 30;
    if (phone) confidenceScore += 30;
    if (website) confidenceScore += 20;
    if (street && houseNumber) confidenceScore += 20;

    let validationStatus = "PENDING_ADDRESS";
    if (confidenceScore < 50) {
      validationStatus = "AMBIGUOUS";
    }

    return {
      companyName,
      formattedAddress,
      city: address.city || address.town || address.village || searchParams.city || null,
      stateProvince: address.state || null,
      country: address.country || searchParams.country || null,
      countryCode: searchParams.countryCode || (address.country_code ? address.country_code.toUpperCase() : null),
      latitude: isNaN(lat!) ? null : lat,
      longitude: isNaN(lng!) ? null : lng,
      phone,
      website,
      email,
      sourceType: "API" as any,
      placeId: null,
      externalId: `${raw.osm_type}/${raw.osm_id}`,
      sourceUrl: `https://www.openstreetmap.org/${raw.osm_type}/${raw.osm_id}`,
      businessStatus: null,
      validationStatus: validationStatus as any,
      addressVerified: false,
      confidenceScore,
      rawSourceData: { ...raw, provider: "OPEN_STREET_MAP" },
    };
  }
}
