import { ProspectSourceType } from "@prisma/client";
import { ProspectSourceAdapter, ProspectSearchParams, NormalizedProspect } from "./types";
import { GooglePlacesAdapter } from "./adapters/google-places";
import { SerperAdapter } from "./adapters/serper";

export class SourceEngine {
  // Registry de adaptadores
  private static readonly adapters: Partial<Record<ProspectSourceType, ProspectSourceAdapter>> = {
    [ProspectSourceType.GOOGLE_PLACES]: new GooglePlacesAdapter(),
    [ProspectSourceType.WEB_SEARCH]: new SerperAdapter(),
  };

  static getAdapter(sourceType: ProspectSourceType): ProspectSourceAdapter {
    const adapter = this.adapters[sourceType];
    if (!adapter) {
      throw new Error(`Fuente no soportada o no implementada: ${sourceType}`);
    }
    return adapter;
  }

  static async search(params: ProspectSearchParams): Promise<NormalizedProspect[]> {
    const adapter = this.getAdapter(params.sourceType);
    
    // Verificar salud del adaptador si es necesario
    const isHealthy = await adapter.healthCheck();
    if (!isHealthy) {
      throw new Error(`La fuente ${params.sourceType} no está configurada correctamente o no está disponible.`);
    }

    const results = await adapter.search(params);

    // Enriquecer los resultados normalizados con los parámetros de búsqueda (ciudad, país, etc.)
    return results.map(prospect => ({
      ...prospect,
      city: prospect.city || params.city,
      country: prospect.country || params.country,
      countryCode: prospect.countryCode || params.countryCode || null,
    }));
  }
}
