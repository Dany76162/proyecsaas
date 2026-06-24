/**
 * Static HTML parsing strategy — last resort fallback.
 *
 * Works for sites that render property listings server-side (no JS rendering).
 * Two passes:
 *   1. Repeating card/article containers (clases comunes inmobiliarias).
 *   2. Fallback: links candidatos a fichas de propiedad + parseo del contexto
 *      alrededor del link (para sitios con markup/clases no estándar).
 *
 * No reemplaza el comportamiento seguro: el endpoint sigue creando todo como
 * DRAFT + publicVisible:false. Esta estrategia solo DETECTA y extrae campos.
 */

import type { SyncProperty } from "../types";
import {
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

/** Diagnóstico seguro (sin HTML ni datos sensibles) para los logs del orquestador. */
export interface HtmlStaticDiagnostics {
  containerBlocks: number;
  candidateLinks: number;
  fallbackUsed: boolean;
  imported: number;
}

/**
 * Extrae bloques tipo "card" por contenedores repetidos. Lista de clases ampliada
 * para cubrir más temas (aviso/resultado/item/ficha/result/grid-item, etc.).
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
      if (text.length > 50) found.push(match[0]); // guardamos el HTML del bloque (para link/imagen)
    }
    if (found.length >= 3) return found;
  }

  return [];
}

/** Extrae la mejor imagen absoluta de un bloque HTML (src → data-src → srcset). */
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

/** Convierte texto de un bloque/contexto en SyncProperty. Requiere precio o superficie. */
function textBlockToProperty(text: string, link: string | null, sourceUrl: string): SyncProperty | null {
  const priceData = parsePrice(text);
  const surfaceM2 = parseSurfaceM2(text);
  // Necesita al menos precio o superficie para considerarse una propiedad (evita basura/nav).
  if (!priceData && !surfaceM2) return null;

  const lines = text.split(/\n|\./).map((l) => l.trim()).filter((l) => l.length > 10);
  const title = lines[0]?.slice(0, 200) ?? text.slice(0, 80);

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
    imageUrl: null,
    externalId,
  };
}

/** Patrón de href que parece una ficha de propiedad. */
const PROPERTY_HREF_RE =
  /(propiedad|propiedades|inmueble|inmuebles|ficha|aviso|avisos|emprendimiento|venta|alquiler|listing|\/\d{4,})/i;

/**
 * Fallback: detecta links candidatos a fichas y parsea una ventana de HTML
 * alrededor de cada uno (≈1200 chars a cada lado). Sirve para listados con
 * markup/clases no estándar donde los contenedores no se reconocen.
 */
function extractByCandidateLinks(
  html: string,
  sourceUrl: string,
): { properties: SyncProperty[]; candidateLinks: number } {
  const origin = new URL(sourceUrl).origin;
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  const candidates: Array<{ href: string; index: number }> = [];
  const seenPath = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = anchorRe.exec(html)) !== null) {
    let href = m[1];
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    let abs: URL;
    try {
      abs = new URL(href, sourceUrl);
    } catch {
      continue;
    }
    if (abs.origin !== origin) continue; // solo mismo dominio
    if (!PROPERTY_HREF_RE.test(abs.pathname)) continue;
    if (seenPath.has(abs.pathname)) continue;
    seenPath.add(abs.pathname);
    candidates.push({ href: abs.href, index: m.index });
  }

  const properties: SyncProperty[] = [];
  const seenId = new Set<string>();
  for (const c of candidates) {
    const win = html.slice(Math.max(0, c.index - 1200), c.index + 1200);
    const text = stripHtml(win);
    const prop = textBlockToProperty(text, c.href, sourceUrl);
    if (!prop) continue;
    if (seenId.has(prop.externalId)) continue;
    seenId.add(prop.externalId);
    properties.push({ ...prop, imageUrl: extractImageFromBlock(win) });
  }

  return { properties, candidateLinks: candidates.length };
}

/**
 * Extrae propiedades desde HTML estático. Devuelve null si no detecta al menos
 * 3 propiedades (ni por contenedores ni por links candidatos).
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

  // ── Pase 1: contenedores tipo card ──
  const seen = new Set<string>();
  const properties: SyncProperty[] = [];
  const blocks = extractPropertyBlocks(html);
  for (const block of blocks) {
    const link = extractLinkFromBlock(block, sourceUrl);
    const imageUrl = extractImageFromBlock(block);
    const prop = textBlockToProperty(stripHtml(block), link, sourceUrl);
    if (!prop) continue;
    if (seen.has(prop.externalId)) continue;
    seen.add(prop.externalId);
    properties.push({ ...prop, imageUrl });
  }

  let fallbackUsed = false;
  let candidateLinks = 0;
  // ── Pase 2: fallback por links candidatos (si los contenedores no alcanzaron) ──
  if (properties.length < 3) {
    fallbackUsed = true;
    const fb = extractByCandidateLinks(html, sourceUrl);
    candidateLinks = fb.candidateLinks;
    for (const prop of fb.properties) {
      if (seen.has(prop.externalId)) continue;
      seen.add(prop.externalId);
      properties.push(prop);
    }
  }

  const withPrice = properties.filter((p) => p.priceCents != null).length;
  console.info(
    `[property-sync][html-static] ${domain}: containerBlocks=${blocks.length} candidateLinks=${candidateLinks} fallback=${fallbackUsed} detected=${properties.length} withPrice=${withPrice} withoutPrice=${properties.length - withPrice}`,
  );

  return properties.length >= 3 ? properties : null;
}
