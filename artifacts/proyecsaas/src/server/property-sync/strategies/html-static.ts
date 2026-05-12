/**
 * Static HTML parsing strategy â€” last resort fallback.
 *
 * Works for simple sites that render property listings server-side
 * (no JavaScript rendering required). Looks for repeating card/article
 * patterns and extracts text per-block.
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

/**
 * Extracts property-like blocks from HTML using heuristics.
 * Looks for article, .property, .listing, .card, .inmueble elements.
 */
function extractPropertyBlocks(html: string): string[] {
  const blocks: string[] = [];

  // Try to split on common repeating containers
  const containerPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*(?:property|listing|inmueble|propiedad|card)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<li[^>]*class="[^"]*(?:property|listing|inmueble|propiedad)[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  ];

  for (const pattern of containerPatterns) {
    let match;
    const found: string[] = [];
    pattern.lastIndex = 0;
    while ((match = pattern.exec(html)) !== null) {
      const text = stripHtml(match[0]).trim();
      if (text.length > 50) found.push(text);
    }
    if (found.length >= 3) {
      blocks.push(...found);
      break;
    }
  }

  return blocks;
}

/**
 * Tries to find a URL within an HTML block.
 */
function extractLinkFromBlock(block: string): string | null {
  const match = block.match(/href=["'](https?:\/\/[^"']+)["']/i);
  return match ? match[1] : null;
}

/**
 * Extracts the best available image URL from an HTML block.
 * Priority: src → data-src → first srcset URL.
 * Only returns http(s) URLs â€” ignores data: URIs and relative paths.
 */
function extractImageFromBlock(block: string): string | null {
  // 1. Regular src attribute (absolute URL only)
  const srcMatch = block.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (srcMatch) return srcMatch[1];

  // 2. data-src (lazy-loading pattern)
  const dataSrcMatch = block.match(/<img[^>]+data-src=["'](https?:\/\/[^"']+)["']/i);
  if (dataSrcMatch) return dataSrcMatch[1];

  // 3. srcset â€” take the first absolute URL listed
  const srcsetMatch = block.match(/srcset=["']([^"']+)["']/i);
  if (srcsetMatch) {
    const firstCandidate = srcsetMatch[1].split(",")[0]?.trim().split(/\s+/)[0];
    if (firstCandidate?.startsWith("http")) return firstCandidate;
  }

  return null;
}

function textBlockToProperty(text: string, link: string | null, sourceUrl: string): SyncProperty | null {
  // Need at least a price or surface to be considered a property listing
  const priceData = parsePrice(text);
  const surfaceM2 = parseSurfaceM2(text);
  if (!priceData && !surfaceM2) return null;

  // Try to extract a title: first meaningful line or first 80 chars
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
    imageUrl: null,  // populated by caller using raw HTML block
    externalId,
  };
}

/**
 * Extracts properties from static HTML.
 * Returns null if the page has less than 3 detectable property blocks.
 */
export async function extractFromHtmlStatic(
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

  const blocks = extractPropertyBlocks(html);
  if (blocks.length < 3) return null;

  const seen = new Set<string>();
  const properties: SyncProperty[] = [];

  for (const block of blocks) {
    // Extract link and image from the raw HTML block before stripping
    const linkMatch = block.match(/href=["'](https?:\/\/[^"']+)["']/i);
    const link = linkMatch ? linkMatch[1] : null;
    const imageUrl = extractImageFromBlock(block);

    const prop = textBlockToProperty(block, link, sourceUrl);
    if (!prop) continue;
    if (seen.has(prop.externalId)) continue;
    seen.add(prop.externalId);
    // Inject the image extracted from the raw HTML
    properties.push({ ...prop, imageUrl });
  }

  return properties.length >= 3 ? properties : null;
}
