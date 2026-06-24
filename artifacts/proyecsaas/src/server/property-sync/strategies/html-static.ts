/**
 * Static HTML parsing strategy — last resort fallback.
 *
 * SOLO detecta propiedades dentro de contenedores/cards CLARAMENTE DELIMITADOS
 * (article / div|li|section con clase de listado). Cada propiedad se extrae de
 * UN bloque delimitado → nunca se mezclan datos entre cards vecinas.
 *
 * P0 integridad: se ELIMINÓ el fallback por "ventana de HTML alrededor del link"
 * (±N chars) porque capturaba texto de cards vecinas y mezclaba precio/título/IDs
 * de otra propiedad. Mejor no importar que importar mal (fail-closed).
 *
 * No cambia el comportamiento seguro: el endpoint sigue creando todo como
 * DRAFT + publicVisible:false. Esta estrategia solo DETECTA y extrae campos.
 */

import type { SyncProperty } from "../types";
import {
  countDistinctPrices,
  isCleanTitle,
  parseBathrooms,
  parseBedrooms,
  parseOperationType,
  parsePrice,
  parsePropertyType,
  parseRooms,
  parseSurfaceM2,
  stripHtml,
} from "../field-parser";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RaicesBot/1.0; +https://raicespilot.com/bot)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-AR,es;q=0.9",
};

/**
 * Extrae bloques tipo "card" por contenedores repetidos. Cada match es UN
 * contenedor delimitado (no una ventana arbitraria), así que su contenido
 * pertenece a una sola propiedad. Lista de clases ampliada para más temas.
 */
function extractPropertyBlocks(html: string): string[] {
  const classWords =
    "property|properties|listing|listings|inmueble|propiedad|propiedades|card|aviso|avisos|resultado|resultados|result|results|item|ficha|prop-|grid-item|search-result";
  const containerPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    new RegExp(`<div[^>]*class="[^"]*(?:${classWords})[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`, "gi"),
    new RegExp(`<li[^>]*class="[^"]*(?:${classWords})[^"]*"[^>]*>([\\s\\S]*?)<\\/li>`, "gi"),
    new RegExp(`<section[^>]*class="[^"]*(?:${classWords})[^"]*"[^>]*>([\\s\\S]*?)<\\/section>`, "gi"),
  ];

  for (const pattern of containerPatterns) {
    let match;
    const found: string[] = [];
    pattern.lastIndex = 0;
    while ((match = pattern.exec(html)) !== null) {
      const text = stripHtml(match[0]).trim();
      if (text.length > 50) found.push(match[0]); // HTML del bloque (para link/imagen)
    }
    if (found.length >= 3) return found;
  }

  return [];
}

/** Mejor imagen absoluta de un bloque (src → data-src → srcset). Misma card. */
function extractImageFromBlock(block: string): string | null {
  const srcMatch = block.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (srcMatch) return srcMatch[1];
  const dataSrcMatch = block.match(/<img[^>]+data-src=["'](https?:\/\/[^"']+)["']/i);
  if (dataSrcMatch) return dataSrcMatch[1];
  const srcsetMatch = block.match(/srcset=["']([^"']+)["']/i);
  if (srcsetMatch) {
    const firstCandidate = srcsetMatch[1].split(",")[0]?.trim().split(/\s+/)[0];
    if (firstCandidate?.startsWith("http")) return firstCandidate;
  }
  return null;
}

function extractLinkFromBlock(block: string, sourceUrl: string): string | null {
  const match = block.match(/href=["']([^"']+)["']/i);
  if (!match) return null;
  try {
    return new URL(match[1], sourceUrl).href;
  } catch {
    return null;
  }
}

/** Razón por la que un bloque se omitió (para diagnóstico). */
type SkipReason = "sin-precio-ni-superficie" | "titulo-sucio";

/**
 * Convierte un bloque DELIMITADO en SyncProperty con criterio conservador:
 *  - título debe ser "limpio" (si no, se omite: baja confianza).
 *  - requiere precio o superficie.
 *  - si hay MÁS de un precio distinto en el bloque, no se puede asociar con
 *    seguridad → precio vacío ("A consultar"), no se adivina.
 * Devuelve { prop } o { skip } con la razón.
 */
function textBlockToProperty(
  rawBlock: string,
  sourceUrl: string,
): { prop: SyncProperty } | { skip: SkipReason } {
  const text = stripHtml(rawBlock);

  // Título: primera línea con sentido. Debe ser limpio (evita datos mezclados).
  const lines = text.split(/\n|\./).map((l) => l.trim()).filter((l) => l.length > 10);
  const title = lines[0]?.slice(0, 200) ?? text.slice(0, 120);
  if (!isCleanTitle(title)) return { skip: "titulo-sucio" };

  const surfaceM2 = parseSurfaceM2(text);
  // Precio: solo si NO es ambiguo (un único importe en el bloque).
  const priceData = countDistinctPrices(text) <= 1 ? parsePrice(text) : null;
  if (!priceData && !surfaceM2) return { skip: "sin-precio-ni-superficie" };

  const link = extractLinkFromBlock(rawBlock, sourceUrl);
  const propertyType = parsePropertyType(text);
  const operationType = parseOperationType(text);
  const rooms = parseRooms(text);
  const bedrooms = parseBedrooms(text) ?? (rooms != null ? Math.max(0, rooms - 1) : null);
  const bathrooms = parseBathrooms(text);

  const externalLink = link ?? sourceUrl;
  const externalId = link
    ? new URL(link, sourceUrl).pathname
    : `html-${title.slice(0, 40).toLowerCase().replace(/\s+/g, "-")}`;

  return {
    prop: {
      title,
      description: text.slice(0, 300) || null,
      address: null,
      neighborhood: null,
      city: null,
      propertyType,
      operationType,
      priceCents: priceData?.cents ?? null,
      currency: priceData?.currency ?? "USD",
      bedrooms,
      bathrooms,
      surfaceM2,
      externalLink,
      imageUrl: extractImageFromBlock(rawBlock),
      externalId,
    },
  };
}

/**
 * Extrae propiedades desde HTML estático SOLO por contenedores delimitados.
 * Devuelve null si no detecta al menos 3 propiedades de alta/media confianza.
 */
export async function extractFromHtmlStatic(
  sourceUrl: string,
): Promise<SyncProperty[] | null> {
  const domain = (() => {
    try {
      return new URL(sourceUrl).hostname;
    } catch {
      return "(url-inválida)";
    }
  })();

  let html: string;
  try {
    const res = await fetch(sourceUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.warn(`[property-sync][html-static] ${domain}: fetch no-ok status=${res.status}`);
      return null;
    }
    html = await res.text();
  } catch (err) {
    console.warn(`[property-sync][html-static] ${domain}: fetch falló (${err instanceof Error ? err.name : "error"})`);
    return null;
  }

  const blocks = extractPropertyBlocks(html);
  const seen = new Set<string>();
  const properties: SyncProperty[] = [];
  let skippedDirty = 0;
  let skippedEmpty = 0;

  for (const block of blocks) {
    const result = textBlockToProperty(block, sourceUrl);
    if ("skip" in result) {
      if (result.skip === "titulo-sucio") skippedDirty++;
      else skippedEmpty++;
      continue;
    }
    const prop = result.prop;
    if (seen.has(prop.externalId)) continue;
    seen.add(prop.externalId);
    properties.push(prop);
  }

  const withPrice = properties.filter((p) => p.priceCents != null).length;
  console.info(
    `[property-sync][html-static] ${domain}: containerBlocks=${blocks.length} importadas=${properties.length} ` +
      `omitidasTituloSucio=${skippedDirty} omitidasSinDatos=${skippedEmpty} conPrecio=${withPrice} sinPrecio=${properties.length - withPrice}`,
  );

  return properties.length >= 3 ? properties : null;
}
