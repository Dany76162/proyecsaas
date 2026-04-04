import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getOpenAIClient } from "@/lib/ai/openai";

const SyncSchema = z.object({
  orgSlug: z.string().min(1),
});

interface ExtractedProperty {
  title: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  propertyType?: string;
  operationType?: string;
  priceCents?: number | null;
  currency?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  surfaceM2?: number | null;
  description?: string;
  externalLink?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 24000);
}

async function fetchPageContent(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RaicesBot/1.0; +https://raicespilot.com/bot)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-AR,es;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al acceder a ${url}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await response.json();
    return JSON.stringify(json).slice(0, 24000);
  }

  const html = await response.text();
  return stripHtml(html);
}

async function extractPropertiesWithAI(
  pageContent: string,
  sourceUrl: string
): Promise<ExtractedProperty[]> {
  const client = getOpenAIClient();

  const prompt = `Analizá el siguiente contenido de texto extraído de un sitio web inmobiliario argentino.
Extraé TODAS las propiedades que encuentres y devolvé un JSON array. Cada propiedad debe tener:

{
  "title": "Descripción corta (ej: Departamento 2 ambientes en Palermo)",
  "address": "Dirección si está disponible",
  "neighborhood": "Barrio",
  "city": "Ciudad",
  "propertyType": "Departamento | Casa | PH | Local | Oficina | Terreno | Cochera | Otro",
  "operationType": "Venta | Alquiler | Alquiler temporario",
  "priceCents": 12500000 (precio en centavos, ejemplo USD 125.000 = 12500000), null si no hay,
  "currency": "USD | ARS",
  "bedrooms": número o null,
  "bathrooms": número o null,
  "surfaceM2": número en m2 o null,
  "description": "Descripción corta de hasta 200 caracteres",
  "externalLink": "URL completa de la propiedad si hay un link directo"
}

Si no podés identificar propiedades claras, devolvé [].
Devolvé SOLO el JSON array, sin texto adicional ni markdown.

URL de origen: ${sourceUrl}

CONTENIDO:
${pageContent}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4096,
  });

  const raw = response.choices[0]?.message?.content ?? "[]";

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed as ExtractedProperty[];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SyncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "orgSlug requerido" }, { status: 400 });
  }

  const { orgSlug } = parsed.data;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug },
    select: {
      id: true,
      propertySourceUrl: true,
      propertySourceType: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  if (!org.propertySourceUrl) {
    return NextResponse.json(
      { error: "No hay URL de fuente configurada. Guardá la URL primero en Configuración → Organización." },
      { status: 422 }
    );
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: { propertySourceStatus: "SYNCING" },
  });

  try {
    const pageContent = await fetchPageContent(org.propertySourceUrl);

    if (!pageContent || pageContent.length < 50) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { propertySourceStatus: "ERROR" },
      });
      return NextResponse.json(
        { error: "El sitio web no devolvió contenido útil. Verificá que la URL sea accesible públicamente." },
        { status: 422 }
      );
    }

    const properties = await extractPropertiesWithAI(pageContent, org.propertySourceUrl);

    if (properties.length === 0) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { propertySourceStatus: "ERROR" },
      });
      return NextResponse.json(
        { error: "No se encontraron propiedades en la página. Probá con una URL más específica (ej: /propiedades, /listings)." },
        { status: 422 }
      );
    }

    let created = 0;
    let updated = 0;

    for (const prop of properties) {
      if (!prop.title) continue;

      const externalId = prop.externalLink
        ? new URL(prop.externalLink, org.propertySourceUrl).pathname
        : `${prop.title}-${prop.address ?? ""}`.toLowerCase().replace(/\s+/g, "-").slice(0, 100);

      const existingProp = await prisma.property.findFirst({
        where: { organizationId: org.id, externalId },
        select: { id: true },
      });

      const data = {
        organizationId: org.id,
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
        externalLink: prop.externalLink ?? org.propertySourceUrl,
        externalSourceUrl: org.propertySourceUrl,
        externalId,
        status: "AVAILABLE" as const,
        publicVisible: true,
      };

      if (existingProp) {
        await prisma.property.update({ where: { id: existingProp.id }, data });
        updated++;
      } else {
        await prisma.property.create({ data });
        created++;
      }
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        propertySourceStatus: "OK",
        propertySourceSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: created + updated,
      message: `Sync completo: ${created} propiedades nuevas, ${updated} actualizadas.`,
    });
  } catch (err) {
    console.error("[sync-from-source] error:", err);
    await prisma.organization.update({
      where: { id: org.id },
      data: { propertySourceStatus: "ERROR" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno al sincronizar" },
      { status: 500 }
    );
  }
}
