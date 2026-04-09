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
  "User-Agent": "Mozilla/5.0 (compatible; RaicesBot/1.0)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-AR,es;q=0.9",
};

interface HtmlBlock {
  text: string;
  rawHtml: string;
}

function extractPropertyBlocks(html: string): HtmlBlock[] {
  const blocks: HtmlBlock[] = [];
  const containerPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*(?:property|listing|inmueble|propiedad|card)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<li[^>]*class="[^"]*(?:property|listing|inmueble|propiedad)[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  ];

  for (const pattern of containerPatterns) {
    const found: HtmlBlock[] = [];
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const text = stripHtml(match[0]).trim();
      if (text.length > 50) found.push({ text, rawHtml: match[0] });
    }
    if (found.length >= 3) {
      blocks.push(...found);
      break;
    }
  }

  return blocks;
}

function extractOgImage(html: string): string | null {
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return ogMatch?.[1] ?? null;
}

function extractImageFromBlock(rawHtml: string, sourceUrl: string): string | null {
  const imgMatch = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!imgMatch) return null;
  const src = imgMatch[1];
  try {
    return new URL(src, sourceUrl).href;
  } catch {
    return null;
  }
}

function textBlockToProperty(text: string, link: string | null, imageUrl: string | null, sourceUrl: string): SyncProperty | null {
  const priceData = parsePrice(text);
  const surfaceM2 = parseSurfaceM2(text);
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
    imageUrl,
    externalId,
  };
}

export async function extractFromHtmlStatic(sourceUrl: string): Promise<SyncProperty[] | null> {
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

  // Extract og:image as a fallback image for all properties on this page
  const ogImage = extractOgImage(html);

  const seen = new Set<string>();
  const properties: SyncProperty[] = [];

  for (const block of blocks) {
    const linkMatch = block.rawHtml.match(/href=["'](https?:\/\/[^"']+)["']/i);
    const link = linkMatch ? linkMatch[1] : null;
    const blockImage = extractImageFromBlock(block.rawHtml, sourceUrl);
    const imageUrl = blockImage ?? ogImage;
    const prop = textBlockToProperty(block.text, link, imageUrl, sourceUrl);
    if (!prop) continue;
    if (seen.has(prop.externalId)) continue;
    seen.add(prop.externalId);
    properties.push(prop);
  }

  return properties.length >= 3 ? properties : null;
}
