/**
 * JSON-LD structured data strategy.
 *
 * Many real estate sites embed schema.org/RealEstateListing or
 * schema.org/Product JSON-LD in their pages. This strategy extracts it.
 */

import type { SyncProperty } from "../types";
import { parsePrice } from "../field-parser";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RaicesBot/1.0; +https://raicespilot.com/bot)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-AR,es;q=0.9",
};

interface JsonLdGraph {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  url?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
  } | string;
  offers?: {
    price?: number | string;
    priceCurrency?: string;
  };
  numberOfRooms?: number | string;
  floorSize?: { value?: number | string };
  image?: string | string[] | { url?: string };
}

function extractJsonLdBlocks(html: string): JsonLdGraph[] {
  const results: JsonLdGraph[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      // Handle @graph arrays
      if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
        results.push(...parsed["@graph"]);
      } else if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return results;
}

function isPropertyType(type: string | string[] | undefined): boolean {
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) =>
    /RealEstate|Apartment|House|Residence|Product|Offer|accommodation/i.test(t)
  );
}

function jsonLdToProperty(item: JsonLdGraph, sourceUrl: string): SyncProperty | null {
  if (!item.name) return null;
  if (!isPropertyType(item["@type"])) return null;

  const title = String(item.name).slice(0, 200);

  let address: string | null = null;
  let city: string | null = null;
  if (typeof item.address === "string") {
    address = item.address;
  } else if (item.address && typeof item.address === "object") {
    address = item.address.streetAddress ?? null;
    city = item.address.addressLocality ?? item.address.addressRegion ?? null;
  }

  let priceCents: number | null = null;
  let currency = "USD";
  if (item.offers?.price) {
    const raw = String(item.offers.price);
    const parsed = parsePrice(raw);
    if (parsed) {
      priceCents = parsed.cents;
      currency = parsed.currency;
    } else {
      const num = parseFloat(raw.replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) priceCents = Math.round(num * 100);
    }
    if (item.offers.priceCurrency) {
      currency = item.offers.priceCurrency.includes("ARS") ? "ARS" : "USD";
    }
  }

  const surfaceM2 = item.floorSize?.value ? parseInt(String(item.floorSize.value), 10) : null;
  const bedrooms = item.numberOfRooms ? parseInt(String(item.numberOfRooms), 10) : null;

  let imageUrl: string | null = null;
  if (typeof item.image === "string") {
    imageUrl = item.image;
  } else if (Array.isArray(item.image)) {
    imageUrl = typeof item.image[0] === "string" ? item.image[0] : null;
  } else if (item.image && typeof item.image === "object") {
    imageUrl = item.image.url ?? null;
  }

  const externalLink = item.url ?? sourceUrl;
  const externalId = externalLink ? new URL(externalLink, sourceUrl).pathname : `jsonld-${title.slice(0, 40)}`;

  return {
    title,
    description: item.description?.slice(0, 500) ?? null,
    address,
    city,
    neighborhood: null,
    propertyType: null,
    operationType: null,
    priceCents,
    currency,
    bedrooms: isNaN(bedrooms!) ? null : bedrooms,
    bathrooms: null,
    surfaceM2: isNaN(surfaceM2!) ? null : surfaceM2,
    externalLink,
    imageUrl,
    externalId,
  };
}

/**
 * Extracts properties from JSON-LD structured data in an HTML page.
 * Returns null if no relevant JSON-LD is found.
 */
export async function extractFromJsonLd(
  sourceUrl: string
): Promise<SyncProperty[] | null> {
  let html: string;
  try {
    const res = await fetch(sourceUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const blocks = extractJsonLdBlocks(html);
  const properties = blocks
    .map((b) => jsonLdToProperty(b, sourceUrl))
    .filter((p): p is SyncProperty => p !== null);

  return properties.length > 0 ? properties : null;
}
