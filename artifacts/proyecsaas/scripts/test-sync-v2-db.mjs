/**
 * End-to-end DB import test for sync v2 (WP REST API strategy).
 * Imports Cappella Propiedades properties into test_capelli_org_001.
 * Run with: node scripts/test-sync-v2-db.mjs
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const DATABASE_URL = "postgresql://proyecsaas_user:1234@localhost:5432/proyecsaas";
const SOURCE_URL = "https://cappellapropiedades.com/propiedades/";
const ORG_ID = "test_capelli_org_001";

// ── Field parsers ──────────────────────────────────────────────────────────────

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
  if (usdPrefix) { const c = parseAmountToCents(usdPrefix[1]); if (c) return { cents: c, currency: "USD" }; }
  const usdSuffix = t.match(/([\d.,]+)\s*(?:USD?|U\$S|u\$s|dólar(?:es)?)/i);
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
  const match = text?.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mt2|mts2|metros?(?:\s*cuadrados?)?)/i);
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
  const match = text?.match(/(\d+)\s*(?:baños?|baths?)/i);
  return match ? parseInt(match[1], 10) : null;
}

function extractNeighborhoodFromTitle(title) {
  const dotSplit = title.match(/\.([^.]{3,40})$/);
  if (dotSplit) {
    const c = dotSplit[1].trim();
    if (/^[A-ZÁÉÍÓÚÜÑ]/.test(c) && c.split(" ").length <= 4) return c;
  }
  const dashSplit = title.match(/[-–]\s*([A-ZÁÉÍÓÚÜÑ][^-–]{2,30})$/);
  if (dashSplit) {
    const c = dashSplit[1].trim();
    if (c.split(" ").length <= 4) return c;
  }
  return null;
}

// ── WP REST API ────────────────────────────────────────────────────────────────

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

  const normalizeStatus = (s) => {
    if (!s) return null;
    if (/alquiler.*temp/i.test(s)) return "Alquiler temporario";
    if (/alquiler/i.test(s)) return "Alquiler";
    if (/venta|sale|vende/i.test(s)) return "Venta";
    return s;
  };

  const externalId = post.link ? new URL(post.link).pathname : `wp-${post.id}`;
  const description = textContent.slice(0, 500) || null;

  return {
    title: title.slice(0, 200),
    description,
    city: cityTerm,
    neighborhood: neighborhoodTerm,
    propertyType: typeTerm,
    operationType: normalizeStatus(statusTerm),
    priceCents: priceData?.cents ?? null,
    currency: priceData?.currency ?? "USD",
    bedrooms,
    bathrooms,
    surfaceM2,
    externalLink: post.link,
    externalId,
  };
}

// ── DB insert ─────────────────────────────────────────────────────────────────

async function upsertProperties(properties) {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  let created = 0, updated = 0;

  for (const prop of properties) {
    if (!prop.title) continue;

    const existing = await client.query(
      `SELECT id FROM "Property" WHERE "organizationId" = $1 AND "externalId" = $2 LIMIT 1`,
      [ORG_ID, prop.externalId]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE "Property" SET
          title=$1, description=$2, address=$3, neighborhood=$4, city=$5,
          "propertyType"=$6, "operationType"=$7, "priceCents"=$8, currency=$9,
          bedrooms=$10, bathrooms=$11, "surfaceM2"=$12, "externalLink"=$13,
          "externalSourceUrl"=$14, "externalId"=$15, status=$16, "publicVisible"=$17,
          "updatedAt"=NOW()
        WHERE id=$18`,
        [prop.title, prop.description, prop.address ?? null, prop.neighborhood ?? null,
         prop.city ?? null, prop.propertyType ?? null, prop.operationType ?? null,
         prop.priceCents ?? null, prop.currency ?? "USD",
         prop.bedrooms ?? null, prop.bathrooms ?? null, prop.surfaceM2 ?? null,
         prop.externalLink ?? SOURCE_URL, SOURCE_URL, prop.externalId,
         "AVAILABLE", true, existing.rows[0].id]
      );
      updated++;
    } else {
      const newId = `sync_cap2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await client.query(
        `INSERT INTO "Property" (
          id, "organizationId", title, description, address, neighborhood, city,
          "propertyType", "operationType", "priceCents", currency,
          bedrooms, bathrooms, "surfaceM2", "externalLink", "externalSourceUrl",
          "externalId", status, "publicVisible", "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW())`,
        [newId, ORG_ID, prop.title, prop.description, prop.address ?? null,
         prop.neighborhood ?? null, prop.city ?? null, prop.propertyType ?? null,
         prop.operationType ?? null, prop.priceCents ?? null, prop.currency ?? "USD",
         prop.bedrooms ?? null, prop.bathrooms ?? null, prop.surfaceM2 ?? null,
         prop.externalLink ?? SOURCE_URL, SOURCE_URL, prop.externalId, "AVAILABLE", true]
      );
      created++;
    }
  }

  await client.query(
    `UPDATE "Organization" SET "propertySourceStatus"='OK', "propertySourceSyncedAt"=NOW(), "updatedAt"=NOW() WHERE id=$1`,
    [ORG_ID]
  );

  const count = await client.query(`SELECT COUNT(*) FROM "Property" WHERE "organizationId"=$1`, [ORG_ID]);
  await client.end();
  return { created, updated, totalInDb: parseInt(count.rows[0].count) };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(65));
  console.log("SYNC V2 END-TO-END DB IMPORT — Cappella Propiedades");
  console.log("Org:", ORG_ID);
  console.log("=".repeat(65));

  const origin = new URL(SOURCE_URL).origin;

  console.log("\n[1] Discovering WordPress REST base...");
  // Already known: "propiedades"
  const restBase = "propiedades";
  console.log(`    rest_base = "${restBase}"`);

  console.log("\n[2] Fetching all posts...");
  const posts = await fetchAllPosts(origin, restBase);
  console.log(`    Fetched ${posts.length} posts`);

  console.log("\n[3] Parsing properties...");
  const properties = posts.map(wpPostToProperty).filter(Boolean);
  console.log(`    Parsed ${properties.length} properties`);

  console.log("\n[4] Upserting into DB...");
  const { created, updated, totalInDb } = await upsertProperties(properties);

  console.log("\n" + "=".repeat(65));
  console.log(`SYNC COMPLETO:`);
  console.log(`  Nuevas:       ${created}`);
  console.log(`  Actualizadas: ${updated}`);
  console.log(`  Total en DB:  ${totalInDb}`);
  console.log("=".repeat(65));

  // Show sample of what's in DB with neighborhood
  const { Client } = require("pg");
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const sample = await client.query(
    `SELECT title, neighborhood, city, "operationType", "propertyType", "priceCents", currency, "surfaceM2", bedrooms
     FROM "Property" WHERE "organizationId"=$1
     ORDER BY "createdAt" DESC LIMIT 10`,
    [ORG_ID]
  );
  await client.end();

  console.log("\nSAMPLE (10 more recent in DB):");
  sample.rows.forEach((r, i) => {
    const price = r.priceCents ? `${r.currency} ${(r.priceCents / 100).toLocaleString("es-AR")}` : "–";
    console.log(`${i+1}. ${r.title}`);
    console.log(`   ${r.operationType ?? "?"} / ${r.propertyType ?? "?"} | Precio: ${price}`);
    console.log(`   Barrio: ${r.neighborhood ?? "-"} | Ciudad: ${r.city ?? "-"} | ${r.surfaceM2 ?? "-"}m² | ${r.bedrooms ?? "-"} dorm`);
  });
}

main().catch(e => { console.error("[ERROR]", e.message); process.exit(1); });
