/**
 * Property sync orchestrator.
 * Tries strategies in order: WordPress REST API → JSON-LD → Static HTML.
 */

import type { SyncProperty, SyncResult } from "./types";
import { extractFromWordPressApi } from "./strategies/wordpress-api";
import { extractFromJsonLd } from "./strategies/json-ld";
import { extractFromHtmlStatic } from "./strategies/html-static";

export type { SyncProperty, SyncResult };

export async function syncPropertiesFromUrl(sourceUrl: string): Promise<SyncResult> {
  try {
    new URL(sourceUrl);
  } catch {
    throw new Error(`URL inválida: "${sourceUrl}"`);
  }

  const wpResult = await extractFromWordPressApi(sourceUrl);
  if (wpResult && wpResult.properties.length > 0) {
    return { strategy: "wordpress-api", properties: wpResult.properties, totalFetched: wpResult.totalFetched };
  }

  const jsonLdProperties = await extractFromJsonLd(sourceUrl);
  if (jsonLdProperties && jsonLdProperties.length > 0) {
    return { strategy: "json-ld", properties: jsonLdProperties, totalFetched: jsonLdProperties.length };
  }

  const htmlProperties = await extractFromHtmlStatic(sourceUrl);
  if (htmlProperties && htmlProperties.length > 0) {
    return { strategy: "html-static", properties: htmlProperties, totalFetched: htmlProperties.length };
  }

  throw new Error(
    "No se pudieron detectar propiedades en el sitio. " +
      "Verificá que la URL apunte al listado de propiedades y sea accesible públicamente."
  );
}
