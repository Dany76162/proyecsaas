/**
 * Functional test for the multi-strategy property sync.
 * Tests the WordPress REST API strategy against Cappella Propiedades.
 * Run with: node scripts/test-sync-v2.mjs
 */

const SOURCE_URL = "https://cappellapropiedades.com/propiedades/";
const COMMON_SLUGS = ["propiedades", "properties", "inmuebles", "listings"];

// ── Field parsers (mirrors src/server/property-sync/field-parser.ts) ──────────

function parseAmountToCents(raw) {
  if (!raw) return null;
  const noSep = raw.replace(/[,.](?=(\d{3})+(?!\d))/g, "");
  const normalized = noSep.replace(",", ".");
  const amount = parseFloat(normalized);
  if (isNaN(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function parsePrice(text) {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ");
  const usdPrefix = t.match(/(?:USD?|U\$S|u\$s|dólar(?:es)?)\s*[:$]?\s*([\d.,]+)/i);
  if (usdPrefix) {
    const cents = parseAmountToCents(usdPrefix[1]);
    if (cents) return { cents, currency: "USD" };
  }
  const usdSuffix = t.match(/([\d.,]+)\s*(?:USD?|U\$S|u\$s|dólar(?:es)?)/i);
  if (usdSuffix) {
    const cents = parseAmountToCents(usdSuffix[1]);
    if (cents) return { cents, currency: "USD" };
  }
  const arsPrefix = t.match(/\$\s*([\d.,]+)/);
  if (arsPrefix) {
    const cents = parseAmountToCents(arsPrefix[1]);
    if (cents) return { cents, currency: "ARS" };
  }
  return null;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseSurfaceM2(text) {
  if (!text) return null;
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mt2|mts2|metros?(?:\s*cuadrados?)?)/i);
  if (!match) return null;
  return parseInt(match[1].replace(",", "."), 10) || null;
}

function parseRooms(text) {
  if (!text) return null;
  if (/monoambiente/i.test(text)) return 1;
  const match = text.match(/(\d+)\s*(?:ambientes?|amb\.?)/i);
  return match ? parseInt(match[1], 10) : null;
}

// ── WordPress API fetcher ──────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RaicesBot/1.0; +https://raicespilot.com/bot)",
  Accept: "application/json",
};

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) { console.log(`  [fetch] ${url} → HTTP ${res.status}`); return null; }
    return await res.json();
  } catch (e) {
    console.log(`  [fetch] ${url} → ${e.message}`);
    return null;
  }
}

async function discoverRestBase(origin) {
  console.log(`\n[WP] Checking /wp-json/wp/v2/types at ${origin}`);
  const types = await fetchJson(`${origin}/wp-json/wp/v2/types`);
  if (types) {
    for (const pt of Object.values(types)) {
      const slug = (pt.rest_base ?? "").toLowerCase();
      if (slug.includes("propiedad") || slug.includes("propert") || slug.includes("inmueble")) {
        console.log(`[WP] Found via types: rest_base="${pt.rest_base}" name="${pt.name}"`);
        return pt.rest_base;
      }
    }
  }

  for (const slug of COMMON_SLUGS) {
    const url = `${origin}/wp-json/wp/v2/${slug}?per_page=1`;
    console.log(`[WP] Trying ${url}`);
    const test = await fetchJson(url);
    if (Array.isArray(test)) {
      console.log(`[WP] Found via slug: "${slug}" (${test.length} items)`);
      return slug;
    }
  }
  return null;
}

async function fetchAllPosts(origin, restBase) {
  const all = [];
  let page = 1;
  while (all.length < 200) {
    const url = `${origin}/wp-json/wp/v2/${restBase}?_embed=1&per_page=50&page=${page}&status=publish`;
    const res = await fetchJson(url);
    if (!res || !Array.isArray(res) || res.length === 0) break;
    all.push(...res);
    console.log(`[WP] Page ${page}: fetched ${res.length} posts (total so far: ${all.length})`);
    if (res.length < 50) break;
    page++;
  }
  return all;
}

function wpPostToProperty(post) {
  const title = stripHtml(post.title?.rendered ?? "").trim();
  if (!title) return null;

  const textContent = stripHtml(post.content?.rendered ?? "");
  const allText = `${title} ${textContent}`;

  const termGroups = post._embedded?.["wp:term"] ?? [];
  const allTerms = termGroups.flat();

  const priceData = parsePrice(allText);
  const surfaceM2 = parseSurfaceM2(allText);
  const rooms = parseRooms(allText);

  const cityTerm = allTerms.find(
    (t) => t.taxonomy === "property-city" || t.taxonomy === "ciudad" || t.taxonomy === "localidad"
  )?.name ?? null;

  const typeTerm = allTerms.find(
    (t) => t.taxonomy === "property-type" || t.taxonomy === "tipo-propiedad"
  )?.name ?? null;

  const statusTerm = allTerms.find(
    (t) => t.taxonomy === "property-status" || t.taxonomy === "estado-propiedad"
  )?.name ?? null;

  return {
    title: title.slice(0, 100),
    ciudad: cityTerm ?? "-",
    tipo: typeTerm ?? "-",
    estado: statusTerm ?? "-",
    precio: priceData ? `${priceData.currency} ${(priceData.cents / 100).toLocaleString("es-AR")}` : "–",
    sup: surfaceM2 ? `${surfaceM2}m²` : "-",
    ambientes: rooms ?? "-",
    link: post.link,
    termTaxonomies: [...new Set(allTerms.map(t => t.taxonomy))].join(", "),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(65));
  console.log("SYNC V2 FUNCTIONAL TEST — Multi-strategy (WP REST API)");
  console.log("Source:", SOURCE_URL);
  console.log("=".repeat(65));

  const origin = new URL(SOURCE_URL).origin;
  const restBase = await discoverRestBase(origin);

  if (!restBase) {
    console.log("\n[FAIL] Could not discover WordPress REST base. Site may not be WordPress.");
    return;
  }

  console.log(`\n[OK] Discovered rest_base: "${restBase}"`);
  console.log("[FETCH] Fetching all posts...\n");

  const posts = await fetchAllPosts(origin, restBase);
  console.log(`\n[TOTAL] Fetched ${posts.length} posts`);

  if (posts.length === 0) {
    console.log("[FAIL] No posts returned.");
    return;
  }

  const properties = posts.map(wpPostToProperty).filter(Boolean);
  console.log(`[PARSE] Converted to ${properties.length} properties\n`);

  // Sample output — show first 10
  console.log("SAMPLE (first 10 properties):");
  console.log("-".repeat(65));
  properties.slice(0, 10).forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.title}`);
    console.log(`   Ciudad: ${p.ciudad} | Tipo: ${p.tipo} | Estado: ${p.estado}`);
    console.log(`   Precio: ${p.precio} | Sup: ${p.sup} | Ambientes: ${p.ambientes}`);
    console.log(`   Link: ${p.link}`);
    console.log(`   Taxonomías detectadas: ${p.termTaxonomies}`);
  });

  // Price statistics
  const withPrice = properties.filter(p => p.precio !== "–");
  const withCity = properties.filter(p => p.ciudad !== "-");
  const withType = properties.filter(p => p.tipo !== "-");
  const withSurface = properties.filter(p => p.sup !== "-");
  const withRooms = properties.filter(p => p.ambientes !== "-");

  console.log("\n" + "=".repeat(65));
  console.log("COVERAGE STATS:");
  console.log(`  Total: ${properties.length}`);
  console.log(`  Con precio:     ${withPrice.length}/${properties.length} (${Math.round(withPrice.length/properties.length*100)}%)`);
  console.log(`  Con ciudad:     ${withCity.length}/${properties.length} (${Math.round(withCity.length/properties.length*100)}%)`);
  console.log(`  Con tipo:       ${withType.length}/${properties.length} (${Math.round(withType.length/properties.length*100)}%)`);
  console.log(`  Con superficie: ${withSurface.length}/${properties.length} (${Math.round(withSurface.length/properties.length*100)}%)`);
  console.log(`  Con ambientes:  ${withRooms.length}/${properties.length} (${Math.round(withRooms.length/properties.length*100)}%)`);
  console.log("=".repeat(65));
}

main().catch((err) => { console.error("[ERROR]", err.message); process.exit(1); });
