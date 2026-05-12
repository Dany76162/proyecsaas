/**
 * Script de prueba funcional: sincronizaciÃ³n de propiedades
 * Inmobiliaria: Alberto Capelli Propiedades (test_capelli_org_001)
 * Fuente: https://cappellapropiedades.com/propiedades/
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const DATABASE_URL = "postgresql://proyecsaas_user:1234@localhost:5432/proyecsaas";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ORG_ID = "test_capelli_org_001";
const SOURCE_URL = "https://cappellapropiedades.com/propiedades/";

// â”€â”€ 1. Fetch page content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchPageContent(url) {
  console.log(`\n[FETCH] Fetching: ${url}`);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RaicesBot/1.0; +https://raicespilot.com/bot)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-AR,es;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al acceder a ${url}`);
  }

  const html = await response.text();
  console.log(`[FETCH] Raw HTML size: ${html.length} chars`);

  // Strip HTML (same logic as the route)
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 24000);

  console.log(`[FETCH] Stripped text size: ${stripped.length} chars`);
  console.log(`[FETCH] Text preview (first 300 chars):\n${stripped.slice(0, 300)}\n`);
  return stripped;
}

// â”€â”€ 2. Extract with AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function extractPropertiesWithAI(pageContent, sourceUrl) {
  console.log("[AI] Calling OpenAI to extract properties...");

  const prompt = `AnalizÃ¡ el siguiente contenido de texto extraÃ­do de un sitio web inmobiliario argentino.
ExtraÃ© TODAS las propiedades que encuentres y devolvÃ© un JSON array. Cada propiedad debe tener:

{
  "title": "DescripciÃ³n corta (ej: Departamento 2 ambientes en Palermo)",
  "address": "DirecciÃ³n si estÃ¡ disponible",
  "neighborhood": "Barrio",
  "city": "Ciudad",
  "propertyType": "Departamento | Casa | PH | Local | Oficina | Terreno | Cochera | Otro",
  "operationType": "Venta | Alquiler | Alquiler temporario",
  "priceCents": 12500000,
  "currency": "USD | ARS",
  "bedrooms": nÃºmero o null,
  "bathrooms": nÃºmero o null,
  "surfaceM2": nÃºmero en m2 o null,
  "description": "DescripciÃ³n corta de hasta 200 caracteres",
  "externalLink": "URL completa de la propiedad si hay un link directo"
}

Si no podÃ©s identificar propiedades claras, devolvÃ© [].
DevolvÃ© SOLO el JSON array, sin texto adicional ni markdown.

URL de origen: ${sourceUrl}

CONTENIDO:
${pageContent}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "[]";

  console.log(`[AI] Raw response (first 500 chars):\n${raw.slice(0, 500)}\n`);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    console.log(`[AI] Extracted ${parsed.length} properties`);
    return parsed;
  } catch {
    console.log("[AI] JSON parse error");
    return [];
  }
}

// â”€â”€ 3. Insert into DB via REST (using node-postgres) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function insertProperties(properties) {
  // Use pg via require since it's a CommonJS package
  const { Client } = require('pg');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  let created = 0;
  let updated = 0;
  const results = [];

  for (const prop of properties) {
    if (!prop.title) continue;

    const externalId = prop.externalLink
      ? new URL(prop.externalLink, SOURCE_URL).pathname
      : `${prop.title}-${prop.address ?? ""}`.toLowerCase().replace(/\s+/g, "-").slice(0, 100);

    // Check if exists
    const existing = await client.query(
      `SELECT id FROM "Property" WHERE "organizationId" = $1 AND "externalId" = $2 LIMIT 1`,
      [ORG_ID, externalId]
    );

    const data = {
      organizationId: ORG_ID,
      title: prop.title.slice(0, 200),
      description: prop.description?.slice(0, 500) ?? null,
      address: prop.address ?? null,
      neighborhood: prop.neighborhood ?? null,
      city: prop.city ?? null,
      propertyType: prop.propertyType ?? null,
      operationType: prop.operationType ?? null,
      priceCents: prop.priceCents ?? null,
      currency: prop.currency ?? "USD",
      bedrooms: prop.bedrooms ?? null,
      bathrooms: prop.bathrooms ?? null,
      surfaceM2: prop.surfaceM2 ?? null,
      externalLink: prop.externalLink ?? SOURCE_URL,
      externalSourceUrl: SOURCE_URL,
      externalId,
      status: "AVAILABLE",
      publicVisible: true,
    };

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE "Property" SET
          title = $1, description = $2, address = $3, neighborhood = $4, city = $5,
          "propertyType" = $6, "operationType" = $7, "priceCents" = $8, currency = $9,
          bedrooms = $10, bathrooms = $11, "surfaceM2" = $12, "externalLink" = $13,
          "externalSourceUrl" = $14, "externalId" = $15, status = $16, "publicVisible" = $17,
          "updatedAt" = NOW()
        WHERE id = $18`,
        [data.title, data.description, data.address, data.neighborhood, data.city,
         data.propertyType, data.operationType, data.priceCents, data.currency,
         data.bedrooms, data.bathrooms, data.surfaceM2, data.externalLink,
         data.externalSourceUrl, data.externalId, data.status, data.publicVisible,
         existing.rows[0].id]
      );
      updated++;
    } else {
      const newId = `sync_cap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await client.query(
        `INSERT INTO "Property" (
          id, "organizationId", title, description, address, neighborhood, city,
          "propertyType", "operationType", "priceCents", currency,
          bedrooms, bathrooms, "surfaceM2", "externalLink",
          "externalSourceUrl", "externalId", status, "publicVisible",
          "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW()
        )`,
        [newId, data.organizationId, data.title, data.description, data.address,
         data.neighborhood, data.city, data.propertyType, data.operationType,
         data.priceCents, data.currency, data.bedrooms, data.bathrooms,
         data.surfaceM2, data.externalLink, data.externalSourceUrl,
         data.externalId, data.status, data.publicVisible]
      );
      created++;
    }

    results.push({
      titulo: prop.title,
      tipo: `${prop.operationType ?? '?'} / ${prop.propertyType ?? '?'}`,
      precio: prop.priceCents ? `${prop.currency} ${(prop.priceCents / 100).toLocaleString('es-AR')}` : 'A consultar',
      ciudad: prop.city ?? '-',
      barrio: prop.neighborhood ?? '-',
      m2: prop.surfaceM2 ?? '-',
      dorm: prop.bedrooms ?? '-',
    });
  }

  // Update org sync status
  await client.query(
    `UPDATE "Organization"
     SET "propertySourceStatus" = 'OK', "propertySourceSyncedAt" = NOW(), "updatedAt" = NOW()
     WHERE id = $1`,
    [ORG_ID]
  );

  await client.end();
  return { created, updated, results };
}

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main() {
  console.log("=".repeat(60));
  console.log("PRUEBA FUNCIONAL â€” Alberto Capelli Propiedades");
  console.log("Fuente: " + SOURCE_URL);
  console.log("=".repeat(60));

  try {
    const pageContent = await fetchPageContent(SOURCE_URL);

    if (!pageContent || pageContent.length < 50) {
      throw new Error("El sitio no devolviÃ³ contenido Ãºtil");
    }

    const properties = await extractPropertiesWithAI(pageContent, SOURCE_URL);

    if (properties.length === 0) {
      console.log("[RESULT] No se encontraron propiedades en la pÃ¡gina.");
      return;
    }

    console.log(`\n[SYNC] Inserting ${properties.length} properties into DB...`);
    const { created, updated, results } = await insertProperties(properties);

    console.log("\n" + "=".repeat(60));
    console.log(`SYNC COMPLETO: ${created} nuevas, ${updated} actualizadas`);
    console.log("=".repeat(60));
    console.log("\nPROPIEDADES IMPORTADAS:");
    results.forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.titulo}`);
      console.log(`   Tipo: ${r.tipo} | Precio: ${r.precio}`);
      console.log(`   Ciudad: ${r.ciudad} / Barrio: ${r.barrio}`);
      console.log(`   Sup: ${r.m2}mÂ² | Dorm: ${r.dorm}`);
    });

  } catch (err) {
    console.error("\n[ERROR]", err.message);
    process.exit(1);
  }
}

main();
