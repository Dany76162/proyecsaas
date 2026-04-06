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

const COMMON_SLUGS = ["propiedades", "properties", "inmuebles", "listings", "propiedades-en-venta"];

interface WpPostType {
  rest_base: string;
  name: string;
}

interface WpPost {
  id: number;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt?: { rendered: string };
  _embedded?: {
    "wp:term"?: Array<Array<{ name: string; taxonomy: string }>>;
    "wp:featuredmedia"?: Array<{ source_url: string }>;
  };
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RaicesBot/1.0)",
  Accept: "application/json",
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function discoverPropertyRestBase(origin: string): Promise<string | null> {
  const apiIndex = await fetchJson<{ namespaces?: string[] }>(`${origin}/wp-json/`);
  if (apiIndex) {
    const types = await fetchJson<Record<string, WpPostType>>(`${origin}/wp-json/wp/v2/types`);
    if (types) {
      for (const pt of Object.values(types)) {
        const slug = pt.rest_base?.toLowerCase() ?? "";
        if (slug.includes("propiedad") || slug.includes("propert") || slug.includes("inmueble") || slug.includes("listing")) {
          return pt.rest_base;
        }
      }
    }
  }
  for (const slug of COMMON_SLUGS) {
    const test = await fetchJson<unknown[]>(`${origin}/wp-json/wp/v2/${slug}?per_page=1`);
    if (Array.isArray(test) && test.length >= 0) return slug;
  }
  return null;
}

async function fetchAllPosts(origin: string, restBase: string): Promise<WpPost[]> {
  const all: WpPost[] = [];
  let page = 1;
  const perPage = 50;
  while (all.length < 200) {
    const url = `${origin}/wp-json/wp/v2/${restBase}?_embed=1&per_page=${perPage}&page=${page}&status=publish`;
    const res = await fetchJson<WpPost[]>(url);
    if (!res || !Array.isArray(res) || res.length === 0) break;
    all.push(...res);
    if (res.length < perPage) break;
    page++;
  }
  return all;
}

function extractNeighborhoodFromTitle(title: string): string | null {
  const dotSplit = title.match(/\.([^.]{3,40})$/);
  if (dotSplit) {
    const candidate = dotSplit[1].trim();
    if (/^[A-ZÁÉÍÓÚÜÑ]/.test(candidate) && candidate.split(" ").length <= 4) return candidate;
  }
  const dashSplit = title.match(/[-–]\s*([A-ZÁÉÍÓÚÜÑ][^-–]{2,30})$/);
  if (dashSplit) {
    const candidate = dashSplit[1].trim();
    if (candidate.split(" ").length <= 4) return candidate;
  }
  return null;
}

function normalizePropertyType(raw: string): string {
  const t = raw.toLowerCase();
  if (/departamento|depto|dpto/.test(t)) return "Departamento";
  if (/\bph\b|penthouse/.test(t)) return "PH";
  if (/casa|chalet|villa/.test(t)) return "Casa";
  if (/terreno|lote/.test(t)) return "Terreno";
  if (/local/.test(t)) return "Local";
  if (/oficina/.test(t)) return "Oficina";
  if (/cochera|garaje/.test(t)) return "Cochera";
  return raw;
}

function normalizeOperationType(raw: string): string {
  const t = raw.toLowerCase();
  if (/temporario|temp/.test(t)) return "Alquiler temporario";
  if (/alquiler|rent/.test(t)) return "Alquiler";
  if (/venta|sale|vende/.test(t)) return "Venta";
  return raw;
}

function wpPostToProperty(post: WpPost): SyncProperty | null {
  const rawTitle = post.title?.rendered ?? "";
  const title = stripHtml(rawTitle).trim();
  if (!title) return null;

  const rawContent = post.content?.rendered ?? "";
  const textContent = stripHtml(rawContent);
  const excerpt = stripHtml(post.excerpt?.rendered ?? "");
  const allText = `${title} ${textContent}`;

  const termGroups = post._embedded?.["wp:term"] ?? [];
  const allTerms = termGroups.flat();

  const imageUrl = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;

  const priceData = parsePrice(allText);
  const surfaceM2 = parseSurfaceM2(allText);
  const rooms = parseRooms(allText);
  const bedrooms = parseBedrooms(allText) ?? (rooms != null ? Math.max(0, rooms - 1) : null);
  const bathrooms = parseBathrooms(allText);

  const typeFromTerm = allTerms.find((t) =>
    t.taxonomy === "property-type" || t.taxonomy === "tipo-propiedad" || t.taxonomy === "tipo_propiedad"
  )?.name ?? null;
  const propertyType = typeFromTerm ? normalizePropertyType(typeFromTerm) : parsePropertyType(allText);

  const opFromTerm = allTerms.find((t) =>
    t.taxonomy === "property-status" || t.taxonomy === "tipo-operacion" || t.taxonomy === "operacion"
  )?.name ?? null;
  const operationType = opFromTerm ? normalizeOperationType(opFromTerm) : parseOperationType(allText);

  const cityFromTerm = allTerms.find((t) =>
    t.taxonomy === "property-city" || t.taxonomy === "ciudad" || t.taxonomy === "localidad"
  )?.name ?? null;

  const neighborhoodFromTerm = allTerms.find((t) =>
    t.taxonomy === "barrio" || t.taxonomy === "neighborhood" || t.taxonomy === "property-neighborhood"
  )?.name ?? null;
  const neighborhood = neighborhoodFromTerm ?? extractNeighborhoodFromTitle(title);

  const description = (excerpt || textContent.slice(0, 300)).slice(0, 500) || null;

  return {
    title: title.slice(0, 200),
    description,
    city: cityFromTerm ?? null,
    neighborhood: neighborhood ?? null,
    propertyType,
    operationType,
    priceCents: priceData?.cents ?? null,
    currency: priceData?.currency ?? "USD",
    bedrooms,
    bathrooms,
    surfaceM2,
    externalLink: post.link,
    imageUrl,
    externalId: post.link ? new URL(post.link).pathname : `wp-${post.id}`,
  };
}

export interface WordPressApiResult {
  properties: SyncProperty[];
  restBase: string;
  totalFetched: number;
}

export async function extractFromWordPressApi(sourceUrl: string): Promise<WordPressApiResult | null> {
  let origin: string;
  try {
    origin = new URL(sourceUrl).origin;
  } catch {
    return null;
  }

  const restBase = await discoverPropertyRestBase(origin);
  if (!restBase) return null;

  const posts = await fetchAllPosts(origin, restBase);
  if (posts.length === 0) return null;

  const properties = posts.map(wpPostToProperty).filter((p): p is SyncProperty => p !== null);
  return { properties, restBase, totalFetched: posts.length };
}
