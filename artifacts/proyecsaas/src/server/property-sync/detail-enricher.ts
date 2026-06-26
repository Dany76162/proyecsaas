import "server-only";

import {
  isCleanTitle,
  parseBathrooms,
  parseBedrooms,
  parseOperationType,
  parsePrice,
  parsePropertyType,
  parseRooms,
  parseSurfaceM2,
  stripHtml,
} from "./field-parser";
import type { SyncProperty } from "./types";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RaicesBot/1.0; +https://raicespilot.com/bot)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-AR,es;q=0.9",
};

export const MAX_GALLERY_IMAGES = 20;

export interface DetailEnrichment {
  images: string[];
  description: string | null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function isPropertyType(type: unknown): boolean {
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => /RealEstate|Apartment|House|Residence|Product|Offer|Place|Accommodation/i.test(String(t)));
}

/**
 * Abre la ficha detalle de una propiedad y extrae, SOLO desde datos estructurados:
 *  - galería: og:image, JSON-LD image[] / ImageObject (hasta 20).
 *  - descripción: JSON-LD description o meta description.
 * Conservador y fail-soft: devuelve null si la página no responde o no hay datos.
 * Nunca lanza (el llamador sigue con los datos del listado).
 */
export async function enrichFromDetailPage(detailUrl: string): Promise<DetailEnrichment | null> {
  let html: string;
  try {
    const res = await fetch(detailUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const images: string[] = [];
  const seen = new Set<string>();
  const pushImage = (raw: unknown) => {
    if (typeof raw !== "string" || !raw) return;
    try {
      const abs = new URL(raw, detailUrl).href;
      if (/^https?:\/\//.test(abs) && !seen.has(abs)) {
        seen.add(abs);
        images.push(abs);
      }
    } catch {
      /* ignore */
    }
  };

  // og:image (puede haber varias; soporta ambos órdenes de atributos)
  for (const m of html.matchAll(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/gi)) {
    pushImage(m[1]);
  }
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/gi)) {
    pushImage(m[1]);
  }

  // JSON-LD: imágenes + descripción
  let description: string | null = null;
  const collectImage = (img: unknown) => {
    if (!img) return;
    if (typeof img === "string") pushImage(img);
    else if (Array.isArray(img)) img.forEach((i) => collectImage(i));
    else if (typeof img === "object" && img !== null && "url" in img) pushImage((img as { url?: unknown }).url);
  };
  const walkNode = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.image) collectImage(n.image);
    if (!description && typeof n.description === "string" && isPropertyType(n["@type"])) {
      const d = stripHtml(decodeEntities(n.description)).trim();
      if (d.length >= 20) description = d;
    }
  };
  for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const nodes: unknown[] = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>)["@graph"])
          ? ((parsed as Record<string, unknown>)["@graph"] as unknown[])
          : [parsed];
      nodes.forEach(walkNode);
    } catch {
      /* ignore malformed JSON-LD */
    }
  }

  // Fallback de descripción: meta description.
  if (!description) {
    const m =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    if (m) {
      const d = decodeEntities(m[1]).trim();
      if (d.length >= 20) description = d;
    }
  }

  if (images.length === 0 && !description) return null;
  return { images: images.slice(0, MAX_GALLERY_IMAGES), description };
}

/**
 * Extrae una propiedad COMPLETA desde la URL de una ficha detalle (1 fetch).
 * Usado por la estrategia sitemap, donde cada URL ya es una propiedad.
 * Título: JSON-LD name → og:title → <title>. Precio/tipo/características: JSON-LD
 * offer o field-parser sobre el texto. Galería/descripción: og/JSON-LD/meta.
 * Conservador: si no hay título limpio, devuelve null (no inventa).
 */
export async function extractPropertyFromDetailUrl(detailUrl: string): Promise<SyncProperty | null> {
  let html: string;
  try {
    const res = await fetch(detailUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // Título: og:title → <title> (limpiado).
  let title: string | null = null;
  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogTitle) title = decodeEntities(ogTitle[1]);
  if (!title) {
    const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (t) title = decodeEntities(stripHtml(t[1]));
  }

  // JSON-LD: nombre, precio, descripción (prioridad sobre heurística).
  let priceCents: number | null = null;
  let currency = "USD";
  for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const nodes: unknown[] = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>)["@graph"])
          ? ((parsed as Record<string, unknown>)["@graph"] as unknown[])
          : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const n = node as Record<string, unknown>;
        if (!isPropertyType(n["@type"])) continue;
        if (!title && typeof n.name === "string") title = decodeEntities(n.name);
        const offers = n.offers as { price?: unknown; priceCurrency?: unknown } | undefined;
        if (offers?.price != null && priceCents == null) {
          const parsed2 = parsePrice(String(offers.price));
          if (parsed2) {
            priceCents = parsed2.cents;
            currency = parsed2.currency;
          } else {
            const num = parseFloat(String(offers.price).replace(/[^0-9.]/g, ""));
            if (!isNaN(num)) priceCents = Math.round(num * 100);
          }
          if (typeof offers.priceCurrency === "string") currency = offers.priceCurrency.includes("ARS") ? "ARS" : "USD";
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (!title || !isCleanTitle(title)) return null;

  // Texto visible para heurística de campos faltantes.
  const text = stripHtml(html).slice(0, 8000);
  if (priceCents == null) {
    const p = parsePrice(text);
    if (p) {
      priceCents = p.cents;
      currency = p.currency;
    }
  }

  const enrichment = await enrichFromDetailPage(detailUrl);
  const rooms = parseRooms(text);

  let externalId: string;
  try {
    externalId = new URL(detailUrl).pathname;
  } catch {
    externalId = detailUrl;
  }

  return {
    title: title.slice(0, 200),
    description: enrichment?.description ?? null,
    propertyType: parsePropertyType(text),
    operationType: parseOperationType(text),
    priceCents,
    currency,
    bedrooms: parseBedrooms(text) ?? (rooms != null ? Math.max(0, rooms - 1) : null),
    bathrooms: parseBathrooms(text),
    surfaceM2: parseSurfaceM2(text),
    externalLink: detailUrl,
    imageUrl: enrichment?.images[0] ?? null,
    imageUrls: enrichment?.images ?? null,
    externalId,
  };
}
