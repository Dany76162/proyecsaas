/**
 * End-to-end DB import test using @prisma/client directly.
 * Validates the full sync flow without going through the HTTP server.
 *
 * Run: DATABASE_URL=postgresql://proyecsaas_user:1234@localhost:5432/proyecsaas node scripts/test-sync-v2-prisma.mjs
 */

import { PrismaClient } from "@prisma/client";

const SOURCE_URL = "https://cappellapropiedades.com/propiedades/";
const ORG_ID = "test_capelli_org_001";

const prisma = new PrismaClient();

// â”€â”€ Field parsers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  const usdPrefix = t.match(/(?:USD?|U\$S|u\$s|dÃ³lar(?:es)?)\s*[:$]?\s*([\d.,]+)/i);
  if (usdPrefix) { const c = parseAmountToCents(usdPrefix[1]); if (c) return { cents: c, currency: "USD" }; }
  const usdSuffix = t.match(/([\d.,]+)\s*(?:USD?|U\$S|u\$s|dÃ³lar(?:es)?)/i);
  if (usdSuffix) { const c = parseAmountToCents(usdSuffix[1]); if (c) return { cents: c, currency: "USD" }; }
  const arsPrefix = t.match(/\$\s*([\d.,]+)/);
  if (arsPrefix) { const c = parseAmountToCents(arsPrefix[1]); if (c) return { cents: c, currency: "ARS" }; }
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
  const match = text?.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|mÂ²|mt2|mts2|metros?(?:\s*cuadrados?)?)/i);
  return match ? parseInt(match[1], 10) || null : null;
}

function parseRooms(text) {
  if (/monoambiente/i.test(text)) return 1;
  const match = text?.match(/(\d+)\s*(?:ambientes?|amb\.?)/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseBedrooms(text) {
  const match = text?.match(/(\d+)\s*(?:dormitorios?|habitaciones?|dorm\.?|cuartos?)/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseBathrooms(text) {
  const match = text?.match(/(\d+)\s*(?:baÃ±os?|baths?)/i);
  return match ? parseInt(match[1], 10) : null;
}

function extractNeighborhoodFromTitle(title) {
  const dotSplit = title.match(/\.([^.]{3,40})$/);
  if (dotSplit) {
    const c = dotSplit[1].trim();
    if (/^[A-ZÃÃ‰ÃÃ“ÃšÃœÃ‘]/.test(c) && c.split(" ").length <= 4) return c;
  }
  const dashSplit = title.match(/[-â€“]\s*([A-ZÃÃ‰ÃÃ“ÃšÃœÃ‘][^-â€“]{2,30})$/);
  if (dashSplit) {
    const c = dashSplit[1].trim();
    if (c.split(" ").length <= 4) return c;
  }
  return null;
}

// â”€â”€ WP REST API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RaicesBot/1.0; +https://raicespilot.com/bot)",
  Accept: "application/json",
};

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchAllPosts(origin, restBase) {
  const all = [];
  let page = 1;
  while (all.length < 200) {
    const res = await fetchJson(
      `${origin}/wp-json/wp/v2/${restBase}?_embed=1&per_page=50&page=${page}&status=publish`
    );
    if (!res || !Array.isArray(res) || res.length === 0) break;
    all.push(...res);
    process.stdout.write(`\r  [WP] Fetched ${all.length} posts...`);
    if (res.length < 50) break;
    page++;
  }
  process.stdout.write("\n");
  return all;
}

function normalizeOperationType(s) {
  if (!s) return null;
  if (/alquiler.*temp/i.test(s)) return "Alquiler temporario";
  if (/alquiler/i.test(s)) return "Alquiler";
  if (/venta|sale|vende/i.test(s)) return "Venta";
  return s;
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
  const bedrooms = parseBedrooms(allText) ?? (rooms != null ? Math.max(0, rooms - 1) : null);
  const bathrooms = parseBathrooms(allText);

  const cityTerm = allTerms.find(
    t => t.taxonomy === "property-city" || t.taxonomy === "ciudad" || t.taxonomy === "localidad"
  )?.name ?? null;
  const typeTerm = allTerms.find(
    t => t.taxonomy === "property-type" || t.taxonomy === "tipo-propiedad"
  )?.name ?? null;
  const statusTerm = allTerms.find(
    t => t.taxonomy === "property-status" || t.taxonomy === "estado-propiedad"
  )?.name ?? null;
  const neighborhoodTerm = allTerms.find(
    t => t.taxonomy === "barrio" || t.taxonomy === "neighborhood"
  )?.name ?? extractNeighborhoodFromTitle(title);

  const externalId = post.link ? new URL(post.link).pathname : `wp-${post.id}`;
  const description = textContent.slice(0, 500) || null;

  return {
    title: title.slice(0, 200),
    description,
    city: cityTerm ?? null,
    neighborhood: neighborhoodTerm ?? null,
    propertyType: typeTerm ?? null,
    operationType: normalizeOperationType(statusTerm),
    priceCents: priceData?.cents ?? null,
    currency: priceData?.currency ?? "USD",
    bedrooms: bedrooms ?? null,
    bathrooms: bathrooms ?? null,
    surfaceM2: surfaceM2 ?? null,
    externalLink: post.link,
    externalId,
  };
}

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main() {
  console.log("=".repeat(65));
  console.log("SYNC V2 END-TO-END â€” Cappella Propiedades â†’ DB via Prisma");
  console.log("Org:", ORG_ID);
  console.log("=".repeat(65));

  const origin = new URL(SOURCE_URL).origin;

  console.log("\n[1] Fetching WP REST API posts...");
  const posts = await fetchAllPosts(origin, "propiedades");
  console.log(`    Total posts fetched: ${posts.length}`);

  if (posts.length === 0) {
    console.log("[FAIL] No posts returned from WP REST API.");
    await prisma.$disconnect();
    return;
  }

  console.log("\n[2] Parsing properties...");
  const properties = posts.map(wpPostToProperty).filter(Boolean);
  console.log(`    Parsed: ${properties.length} properties`);

  console.log("\n[3] Verifying org exists...");
  const org = await prisma.organization.findFirst({
    where: { id: ORG_ID },
    select: { id: true, name: true, propertySourceUrl: true }
  });
  if (!org) {
    console.log(`[FAIL] Org ${ORG_ID} not found in DB.`);
    await prisma.$disconnect();
    return;
  }
  console.log(`    Found: "${org.name}"`);

  console.log("\n[4] Upserting properties...");
  let created = 0, updated = 0;

  for (const prop of properties) {
    if (!prop.title) continue;

    const existing = await prisma.property.findFirst({
      where: { organizationId: ORG_ID, externalId: prop.externalId },
      select: { id: true }
    });

    const data = {
      organizationId: ORG_ID,
      title: prop.title,
      description: prop.description,
      address: prop.address ?? null,
      neighborhood: prop.neighborhood,
      city: prop.city,
      propertyType: prop.propertyType,
      operationType: prop.operationType,
      priceCents: prop.priceCents,
      currency: prop.currency ?? "USD",
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      surfaceM2: prop.surfaceM2,
      externalLink: prop.externalLink ?? SOURCE_URL,
      externalSourceUrl: SOURCE_URL,
      externalId: prop.externalId,
      status: "AVAILABLE",
      publicVisible: true,
    };

    if (existing) {
      await prisma.property.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.property.create({ data });
      created++;
    }

    process.stdout.write(`\r  Progress: ${created + updated}/${properties.length}`);
  }
  process.stdout.write("\n");

  await prisma.organization.update({
    where: { id: ORG_ID },
    data: {
      propertySourceStatus: "OK",
      propertySourceSyncedAt: new Date(),
    }
  });

  console.log("\n[5] Verifying DB state...");
  const total = await prisma.property.count({ where: { organizationId: ORG_ID } });
  const withPrice = await prisma.property.count({ where: { organizationId: ORG_ID, priceCents: { not: null } } });
  const withCity = await prisma.property.count({ where: { organizationId: ORG_ID, city: { not: null } } });
  const withNeighborhood = await prisma.property.count({ where: { organizationId: ORG_ID, neighborhood: { not: null } } });

  const sample = await prisma.property.findMany({
    where: { organizationId: ORG_ID },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { title: true, neighborhood: true, city: true, operationType: true, propertyType: true, priceCents: true, currency: true, surfaceM2: true, bedrooms: true }
  });

  console.log("\n" + "=".repeat(65));
  console.log("SYNC COMPLETO:");
  console.log(`  Nuevas:       ${created}`);
  console.log(`  Actualizadas: ${updated}`);
  console.log(`  Total en DB:  ${total}`);
  console.log("\nCOBERTURA:");
  console.log(`  Con precio:   ${withPrice}/${total} (${Math.round(withPrice/total*100)}%)`);
  console.log(`  Con ciudad:   ${withCity}/${total} (${Math.round(withCity/total*100)}%)`);
  console.log(`  Con barrio:   ${withNeighborhood}/${total} (${Math.round(withNeighborhood/total*100)}%)`);
  console.log("=".repeat(65));

  console.log("\nSAMPLE (5 mÃ¡s recientes en DB):");
  sample.forEach((r, i) => {
    const precio = r.priceCents ? `${r.currency} ${(r.priceCents / 100).toLocaleString("es-AR")}` : "â€“";
    console.log(`\n${i+1}. ${r.title}`);
    console.log(`   ${r.operationType ?? "?"} / ${r.propertyType ?? "?"} | Precio: ${precio}`);
    console.log(`   Barrio: ${r.neighborhood ?? "-"} | Ciudad: ${r.city ?? "-"} | ${r.surfaceM2 ?? "-"}mÂ² | ${r.bedrooms ?? "-"} dorm`);
  });

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[ERROR]", err.message);
  await prisma.$disconnect();
  process.exit(1);
});
