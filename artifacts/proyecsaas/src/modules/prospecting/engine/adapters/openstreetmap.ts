import { ProspectSourceAdapter, ProspectSearchParams, NormalizedProspect } from "../types";

export class OpenStreetMapAdapter implements ProspectSourceAdapter {
  private readonly nominatimUrl = "https://nominatim.openstreetmap.org/search";
  private readonly overpassUrl = "https://overpass-api.de/api/interpreter";

  async search(params: ProspectSearchParams): Promise<NormalizedProspect[]> {
    if (!params.city) {
      throw new Error("La ciudad es obligatoria para OpenStreetMap.");
    }

    const maxLimit = Math.min(params.limit || 20, 20);
    const q = `${params.city}, ${params.country}`;

    // Paso A: Resolver zona con Nominatim
    const nominatimUrl = new URL(this.nominatimUrl);
    nominatimUrl.searchParams.append("q", q);
    nominatimUrl.searchParams.append("format", "json");
    nominatimUrl.searchParams.append("limit", "1");
    if (params.countryCode) {
      nominatimUrl.searchParams.append("countrycodes", params.countryCode.toLowerCase());
    }

    let nominatimData: any = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(nominatimUrl.toString(), {
        headers: {
          "User-Agent": "ProyecsaasProspecting/1.0 (contact@proyecsaas.com)",
          "Accept-Language": "es"
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }
      nominatimData = data[0];
    } catch (error: any) {
      throw new Error(`Fallo al resolver zona con Nominatim: ${error.message}`);
    }

    if (!nominatimData || !nominatimData.boundingbox) {
      return [];
    }

    // Nominatim boundingbox format: [latS, latN, lonW, lonE] (string[])
    const [latS, latN, lonW, lonE] = nominatimData.boundingbox;
    // Overpass boundingbox format: latS,lonW,latN,lonE
    const overpassBbox = `${latS},${lonW},${latN},${lonE}`;

    // Paso B: Consultar Overpass API
    const overpassQuery = `
[out:json][timeout:60];
(
  node["office"="estate_agent"](${overpassBbox});
  way["office"="estate_agent"](${overpassBbox});
  relation["office"="estate_agent"](${overpassBbox});
  node["shop"="estate_agent"](${overpassBbox});
  way["shop"="estate_agent"](${overpassBbox});
  relation["shop"="estate_agent"](${overpassBbox});
  node["name"~"inmobiliaria|propiedades|bienes raices|bienes raíces|real estate",i](${overpassBbox});
  way["name"~"inmobiliaria|propiedades|bienes raices|bienes raíces|real estate",i](${overpassBbox});
  relation["name"~"inmobiliaria|propiedades|bienes raices|bienes raíces|real estate",i](${overpassBbox});
);
out center;
`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(this.overpassUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "ProyecsaasProspecting/1.0 (contact@proyecsaas.com)"
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data.elements || !Array.isArray(data.elements)) {
        return [];
      }

      // Filtrar resultados:
      // - descartar los que no tengan nombre
      const validResults = data.elements.filter((el: any) => el.tags && el.tags.name);

      return validResults.slice(0, maxLimit).map((item: any) => this.normalize({ raw: item, searchParams: params }));
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Tiempo de espera agotado al consultar Overpass API.");
      }
      throw new Error(`Fallo al consultar Overpass API: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  normalize(data: any): NormalizedProspect {
    const raw = data.raw;
    const searchParams = data.searchParams || {};
    
    const tags = raw.tags || {};
    const companyName = tags.name || "Empresa Desconocida";
    
    // Website
    const website = tags.website || tags["contact:website"] || null;
    
    // Phone
    const phone = tags.phone || tags["contact:phone"] || null;
    
    // Email
    const email = tags.email || tags["contact:email"] || null;
    
    // Address format
    const street = tags["addr:street"] || "";
    const houseNumber = tags["addr:housenumber"] || "";
    const city = tags["addr:city"] || searchParams.city || null;
    const state = tags["addr:state"] || null;
    
    let formattedAddress = "";
    if (street && houseNumber) {
      formattedAddress = `${street} ${houseNumber}, ${city || ""}`;
    } else {
      formattedAddress = city || "";
    }

    const lat = raw.lat || (raw.center && raw.center.lat) || null;
    const lng = raw.lon || (raw.center && raw.center.lon) || null;

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
      city,
      stateProvince: state,
      country: searchParams.country || null,
      countryCode: searchParams.countryCode || null,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
      phone,
      website,
      email,
      sourceType: "API" as any,
      placeId: null,
      externalId: `${raw.type}/${raw.id}`,
      sourceUrl: `https://www.openstreetmap.org/${raw.type}/${raw.id}`,
      businessStatus: null,
      validationStatus: validationStatus as any,
      addressVerified: false,
      confidenceScore,
      rawSourceData: { ...raw, provider: "OPEN_STREET_MAP" },
    };
  }
}

