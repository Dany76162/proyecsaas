import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { syncPropertiesFromUrl } from "@/server/property-sync";

const SyncSchema = z.object({
  orgSlug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    return await handleSync(req);
  } catch (err) {
    console.error("[sync-from-source] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}

async function handleSync(req: NextRequest) {
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
      website: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  // Use propertySourceUrl first; fall back to the org website URL if not set.
  const sourceUrl = org.propertySourceUrl || org.website;

  if (!sourceUrl) {
    return NextResponse.json(
      {
        error:
          "No hay URL configurada. Ingresá la URL del listado de propiedades en Configuración → Organización → Fuente de propiedades.",
      },
      { status: 422 }
    );
  }

  // If we're using the website fallback, persist it as propertySourceUrl.
  if (!org.propertySourceUrl && org.website) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { propertySourceUrl: org.website },
    });
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: { propertySourceStatus: "SYNCING" },
  });

  try {
    const syncResult = await syncPropertiesFromUrl(sourceUrl);
    const { properties, strategy, totalFetched } = syncResult;

    let created = 0;
    let updated = 0;

    for (const prop of properties) {
      if (!prop.title) continue;

      const externalId = prop.externalId;

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
        externalLink: prop.externalLink ?? sourceUrl,
        externalSourceUrl: sourceUrl,
        externalId,
      };

      // Build image payload if a new one was scraped
      const imagePayload = prop.imageUrl
        ? {
            url: prop.imageUrl,
            isPrimary: true,
            sortOrder: 0,
            // organizationId is handled automatically by the composite relation in schema.prisma
          }
        : null;

      if (existingProp) {
        await prisma.property.update({
          where: { id: existingProp.id },
          data: {
            ...data,
            images: imagePayload
              ? {
                  deleteMany: {}, // Only valid in update to replace existing images
                  create: [imagePayload],
                }
              : undefined,
          },
        });
        updated++;
      } else {
        await prisma.property.create({
          data: {
            ...data,
            status: "DRAFT",
            publicVisible: false,
            images: imagePayload
              ? {
                  create: [imagePayload],
                }
              : undefined,
          },
        });
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
      strategy,
      totalFetched,
      message: `Sync completo (${strategy}): ${created} propiedades nuevas, ${updated} actualizadas.`,
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
