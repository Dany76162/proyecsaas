import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { syncPropertiesFromUrl } from "@/server/property-sync";
import { getOrgSubscriptionStatus } from "@/server/billing/subscription-guard";

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
      { status: 500 },
    );
  }
}

async function handleSync(req: NextRequest) {
  // Auth: must be a logged-in user with membership in the org
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = SyncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "orgSlug requerido." }, { status: 400 });
  }

  const { orgSlug } = parsed.data;

  // Verify user has membership in this org (any role allowed)
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: orgSlug } },
    select: { role: true, organization: { select: { id: true } } },
  });

  // Also allow platform admins
  if (!membership && !user.isPlatformAdmin) {
    return NextResponse.json({ error: "No tenés acceso a esta organización." }, { status: 403 });
  }

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
    return NextResponse.json({ error: "Organización no encontrada." }, { status: 404 });
  }

  // ── Subscription enforcement ─────────────────────────────────────────────────
  const { isActive } = await getOrgSubscriptionStatus(org.id);
  if (!isActive) {
    return NextResponse.json(
      {
        error:
          "Tu suscripción no está activa. La sincronización de propiedades está pausada. Renovála para continuar.",
      },
      { status: 403 },
    );
  }

  const sourceUrl = org.propertySourceUrl || org.website;

  if (!sourceUrl) {
    return NextResponse.json(
      {
        error:
          "No hay URL configurada. Ingresá la URL del listado de propiedades en Configuración → Organización → Fuente de propiedades.",
      },
      { status: 422 },
    );
  }

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
    let imagesAdded = 0;

    for (const prop of properties) {
      if (!prop.title) continue;

      const externalId = prop.externalId;

      const existing = await prisma.property.findFirst({
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
        status: "AVAILABLE" as const,
        publicVisible: true,
      };

      let propertyId: string;

      if (existing) {
        await prisma.property.update({ where: { id: existing.id }, data });
        propertyId = existing.id;
        updated++;
      } else {
        const created_ = await prisma.property.create({ data, select: { id: true } });
        propertyId = created_.id;
        created++;
      }

      // ── Save image if available and not already present ───────────────────────
      if (prop.imageUrl) {
        const hasImages = await prisma.propertyImage.count({
          where: { propertyId },
        });

        if (hasImages === 0) {
          await prisma.propertyImage.create({
            data: {
              propertyId,
              organizationId: org.id,
              url: prop.imageUrl,
              isPrimary: true,
              sortOrder: 0,
            },
          });
          imagesAdded++;
        }
      }
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: { propertySourceStatus: "OK", propertySourceSyncedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      created,
      updated,
      imagesAdded,
      total: created + updated,
      strategy,
      totalFetched,
      message: `Sync completo (${strategy}): ${created} nuevas, ${updated} actualizadas, ${imagesAdded} imágenes importadas.`,
    });
  } catch (err) {
    console.error("[sync-from-source] error:", err);
    await prisma.organization.update({
      where: { id: org.id },
      data: { propertySourceStatus: "ERROR" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno al sincronizar." },
      { status: 500 },
    );
  }
}
