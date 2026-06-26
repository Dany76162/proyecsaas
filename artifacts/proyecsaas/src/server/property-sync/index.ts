/**
 * Property sync orchestrator.
 *
 * Orden de resolución:
 *   0. Sitemap (si el tipo es SITEMAP o la URL es un sitemap.xml)
 *   0b. Adaptador específico por portal (si existe para el dominio)
 *   1. WordPress REST API
 *   2. JSON-LD
 *   3. Static HTML (cards delimitadas, fail-closed)
 *
 * Tras detectar propiedades en un LISTADO, se abre la ficha detalle de cada una
 * para traer galería completa + descripción (fail-soft). El sitemap ya extrae
 * de la ficha detalle, así que no se re-enriquece.
 */

import type { SyncProperty, SyncResult } from "./types";
import { extractFromWordPressApi } from "./strategies/wordpress-api";
import { extractFromJsonLd } from "./strategies/json-ld";
import { extractFromHtmlStatic } from "./strategies/html-static";
import { extractFromSitemap, looksLikeSitemap } from "./strategies/sitemap";
import { getAdapterForUrl } from "./adapters/portal-adapter";
import { enrichFromDetailPage } from "./detail-enricher";
import { isPublicHttpUrl } from "./url-guard";

export type { SyncProperty, SyncResult };

export interface SyncOptions {
  sourceType?: string | null;
}

// Tope de fichas detalle a abrir por sync (evita ser agresivo / lento).
const MAX_DETAIL_ENRICH = 60;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enriquece propiedades del listado abriendo su ficha detalle: galería completa
 * y descripción. Fail-soft: si la ficha falla, conserva lo del listado.
 */
async function enrichListingProperties(properties: SyncProperty[], sourceUrl: string): Promise<void> {
  let enriched = 0;
  for (const prop of properties) {
    if (enriched >= MAX_DETAIL_ENRICH) break;
    const link = prop.externalLink;
    if (!link || link === sourceUrl) continue;

    const detail = await enrichFromDetailPage(link);
    enriched++;
    if (detail) {
      if (detail.images.length > 0) {
        prop.imageUrls = detail.images;
        if (!prop.imageUrl) prop.imageUrl = detail.images[0];
      }
      if ((!prop.description || prop.description.length < 40) && detail.description) {
        prop.description = detail.description;
      }
    }
    await delay(150 + Math.floor(Math.random() * 150)); // 150-300ms entre fichas
  }
}

/**
 * Main entry point. Attempts to extract properties from the given URL
 * using the best available strategy, luego enriquece desde la ficha detalle.
 *
 * @throws Error if all strategies fail or URL is invalid
 */
export async function syncPropertiesFromUrl(
  sourceUrl: string,
  options?: SyncOptions,
): Promise<SyncResult> {
  let domain = "(url-inválida)";
  try {
    domain = new URL(sourceUrl).hostname;
  } catch {
    throw new Error(`URL inválida: "${sourceUrl}"`);
  }

  // Anti-SSRF: solo URLs públicas http/https (cubre wordpress/json-ld/html-static,
  // que hacen fetch de esta URL o de su mismo origin).
  if (!(await isPublicHttpUrl(sourceUrl))) {
    throw new Error(
      "URL no permitida: debe ser una URL pública http(s). Se bloquean direcciones internas/privadas.",
    );
  }

  console.info(`[property-sync] inicio dominio=${domain}`);

  // ── Sitemap (por tipo SITEMAP o URL .xml) ──────────────────────────────────
  if (looksLikeSitemap(sourceUrl, options?.sourceType)) {
    const sitemapProps = await extractFromSitemap(sourceUrl);
    if (sitemapProps && sitemapProps.length > 0) {
      // El sitemap ya extrae desde la ficha detalle (galería incluida).
      console.info(`[property-sync] ${domain}: estrategia=sitemap propiedades=${sitemapProps.length}`);
      return { strategy: "sitemap", properties: sitemapProps, totalFetched: sitemapProps.length };
    }
    console.warn(`[property-sync] ${domain}: sitemap sin resultados, probando estrategias genéricas`);
  }

  // ── Adaptador específico por portal ────────────────────────────────────────
  const adapter = getAdapterForUrl(sourceUrl);
  if (adapter) {
    const props = await adapter.extract(sourceUrl);
    if (props && props.length > 0) {
      await enrichListingProperties(props, sourceUrl);
      console.info(`[property-sync] ${domain}: estrategia=adapter:${adapter.id} propiedades=${props.length}`);
      return { strategy: `adapter:${adapter.id}`, properties: props, totalFetched: props.length };
    }
  }

  // ── Strategy 1: WordPress REST API ─────────────────────────────────────────
  const wpResult = await extractFromWordPressApi(sourceUrl);
  if (wpResult && wpResult.properties.length > 0) {
    await enrichListingProperties(wpResult.properties, sourceUrl);
    console.info(`[property-sync] ${domain}: estrategia=wordpress-api propiedades=${wpResult.properties.length}`);
    return { strategy: "wordpress-api", properties: wpResult.properties, totalFetched: wpResult.totalFetched };
  }

  // ── Strategy 2: JSON-LD ────────────────────────────────────────────────────
  const jsonLdProperties = await extractFromJsonLd(sourceUrl);
  if (jsonLdProperties && jsonLdProperties.length > 0) {
    await enrichListingProperties(jsonLdProperties, sourceUrl);
    console.info(`[property-sync] ${domain}: estrategia=json-ld propiedades=${jsonLdProperties.length}`);
    return { strategy: "json-ld", properties: jsonLdProperties, totalFetched: jsonLdProperties.length };
  }

  // ── Strategy 3: Static HTML ────────────────────────────────────────────────
  const htmlProperties = await extractFromHtmlStatic(sourceUrl);
  if (htmlProperties && htmlProperties.length > 0) {
    await enrichListingProperties(htmlProperties, sourceUrl);
    console.info(`[property-sync] ${domain}: estrategia=html-static propiedades=${htmlProperties.length}`);
    return { strategy: "html-static", properties: htmlProperties, totalFetched: htmlProperties.length };
  }

  console.warn(`[property-sync] ${domain}: ninguna estrategia detectó propiedades (sitemap/adapter/wp/json-ld/html-static)`);
  throw new Error(
    "No pudimos detectar propiedades con el conector actual. " +
      "Probá una URL de listado pública o solicitá soporte para adaptar este sitio.",
  );
}
