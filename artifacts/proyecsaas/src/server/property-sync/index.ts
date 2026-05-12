/**
 * Property sync orchestrator.
 *
 * Tries strategies in order until one succeeds:
 *   1. WordPress REST API  â€” best quality, works with WP sites (very common in AR)
 *   2. JSON-LD             â€” works with any site using schema.org markup
 *   3. Static HTML         â€” last resort heuristic parsing
 *
 * Each strategy returns null if it can't handle the site, letting the
 * orchestrator fall through to the next one.
 */

import type { SyncProperty, SyncResult } from "./types";
import { extractFromWordPressApi } from "./strategies/wordpress-api";
import { extractFromJsonLd } from "./strategies/json-ld";
import { extractFromHtmlStatic } from "./strategies/html-static";

export type { SyncProperty, SyncResult };

/**
 * Main entry point. Attempts to extract properties from the given URL
 * using the best available strategy.
 *
 * @throws Error if all strategies fail or URL is invalid
 */
export async function syncPropertiesFromUrl(sourceUrl: string): Promise<SyncResult> {
  // Validate URL
  try {
    new URL(sourceUrl);
  } catch {
    throw new Error(`URL invÃ¡lida: "${sourceUrl}"`);
  }

  // â”€â”€ Strategy 1: WordPress REST API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const wpResult = await extractFromWordPressApi(sourceUrl);
  if (wpResult && wpResult.properties.length > 0) {
    return {
      strategy: "wordpress-api",
      properties: wpResult.properties,
      totalFetched: wpResult.totalFetched,
    };
  }

  // â”€â”€ Strategy 2: JSON-LD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const jsonLdProperties = await extractFromJsonLd(sourceUrl);
  if (jsonLdProperties && jsonLdProperties.length > 0) {
    return {
      strategy: "json-ld",
      properties: jsonLdProperties,
      totalFetched: jsonLdProperties.length,
    };
  }

  // â”€â”€ Strategy 3: Static HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const htmlProperties = await extractFromHtmlStatic(sourceUrl);
  if (htmlProperties && htmlProperties.length > 0) {
    return {
      strategy: "html-static",
      properties: htmlProperties,
      totalFetched: htmlProperties.length,
    };
  }

  throw new Error(
    "No se pudieron detectar propiedades en el sitio. " +
      "VerificÃ¡ que la URL apunte a la pÃ¡gina del listado de propiedades y que sea accesible pÃºblicamente."
  );
}
