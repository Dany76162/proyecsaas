/**
 * Sitemap strategy.
 *
 * Descubre URLs de fichas detalle desde un sitemap.xml (con soporte de un nivel
 * de sitemapindex anidado) y extrae cada propiedad desde su ficha detalle.
 * Conservador y fail-soft: si una ficha falla, se omite (no rompe el resto).
 */
import type { SyncProperty } from "../types";
import { extractPropertyFromDetailUrl } from "../detail-enricher";
import { isPublicHttpUrl } from "../url-guard";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RaicesBot/1.0; +https://raicespilot.com/bot)",
  Accept: "application/xml,text/xml,*/*",
  "Accept-Language": "es-AR,es;q=0.9",
};

const MAX_PROPERTY_URLS = 50;
const MAX_CHILD_SITEMAPS = 5;

// Heurística: paths que parecen una ficha de propiedad.
const PROPERTY_PATH_RE =
  /(propiedad|propiedades|inmueble|inmuebles|departamento|casa|venta|alquiler|\bph\b|terreno|local|oficina|cochera|ficha|aviso|emprendimiento)/i;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchXml(url: string): Promise<string | null> {
  if (!(await isPublicHttpUrl(url))) return null; // anti-SSRF
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    locs.push(m[1].trim());
  }
  return locs;
}

export function looksLikeSitemap(url: string, sourceType?: string | null): boolean {
  if (sourceType && sourceType.toUpperCase() === "SITEMAP") return true;
  return /sitemap[^/]*\.xml(\?|$)/i.test(url);
}

export async function extractFromSitemap(sourceUrl: string): Promise<SyncProperty[] | null> {
  const domain = (() => {
    try {
      return new URL(sourceUrl).hostname;
    } catch {
      return "(url-inválida)";
    }
  })();

  const rootXml = await fetchXml(sourceUrl);
  if (!rootXml) {
    console.warn(`[property-sync][sitemap] ${domain}: no se pudo leer el sitemap`);
    return null;
  }

  let locs = extractLocs(rootXml);

  // Sitemapindex: si los <loc> apuntan a otros .xml, bajar un nivel.
  const childSitemaps = locs.filter((u) => /\.xml(\?|$)/i.test(u)).slice(0, MAX_CHILD_SITEMAPS);
  if (childSitemaps.length > 0 && childSitemaps.length === locs.length) {
    const collected: string[] = [];
    for (const child of childSitemaps) {
      const childXml = await fetchXml(child);
      if (childXml) collected.push(...extractLocs(childXml));
      await delay(200);
    }
    locs = collected;
  }

  // Filtrar a URLs de propiedad (mismo dominio) y deduplicar.
  let origin = "";
  try {
    origin = new URL(sourceUrl).origin;
  } catch {
    /* noop */
  }
  const seen = new Set<string>();
  const propertyUrls = locs
    .filter((u) => {
      try {
        const parsed = new URL(u, sourceUrl);
        if (origin && parsed.origin !== origin) return false;
        if (!PROPERTY_PATH_RE.test(parsed.pathname)) return false;
        if (seen.has(parsed.href)) return false;
        seen.add(parsed.href);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, MAX_PROPERTY_URLS);

  if (propertyUrls.length === 0) {
    console.warn(`[property-sync][sitemap] ${domain}: sin URLs de propiedad detectables (de ${locs.length} locs)`);
    return null;
  }

  const properties: SyncProperty[] = [];
  for (const url of propertyUrls) {
    const prop = await extractPropertyFromDetailUrl(url);
    if (prop) properties.push(prop);
    await delay(150 + Math.floor(Math.random() * 150)); // 150-300ms, no agresivo
  }

  const withPrice = properties.filter((p) => p.priceCents != null).length;
  console.info(
    `[property-sync][sitemap] ${domain}: urls=${propertyUrls.length} importables=${properties.length} conPrecio=${withPrice}`,
  );

  return properties.length > 0 ? properties : null;
}
