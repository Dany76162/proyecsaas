import "server-only";

import { prisma } from "@/server/db/prisma";
import { syncPropertiesFromUrl } from "@/server/property-sync";

export type RunPropertySyncResult = {
  created: number;
  updated: number;
  detected: number;
  withPrice: number;
  strategy: string;
  totalFetched: number;
};

/**
 * Núcleo compartido del sincronizador de propiedades para una organización.
 * Lo usan el trigger manual (/api/properties/sync-from-source) y el cron
 * (/api/cron/sync-properties). Mantiene el comportamiento seguro:
 *  - marca propertySourceStatus SYNCING → OK/ERROR.
 *  - dedup por externalId.
 *  - propiedades NUEVAS entran como DRAFT + publicVisible:false (nunca se publican solas).
 *  - si algo falla, deja status=ERROR y re-lanza (el llamador decide la respuesta).
 */
export async function syncOrganizationProperties(params: {
  orgId: string;
  sourceUrl: string;
}): Promise<RunPropertySyncResult> {
  const { orgId, sourceUrl } = params;

  await prisma.organization.update({
    where: { id: orgId },
    data: { propertySourceStatus: "SYNCING" },
  });

  try {
    const { properties, strategy, totalFetched } = await syncPropertiesFromUrl(sourceUrl);

    let created = 0;
    let updated = 0;

    for (const prop of properties) {
      if (!prop.title) continue;

      const externalId = prop.externalId;

      const existingProp = await prisma.property.findFirst({
        where: { organizationId: orgId, externalId },
        select: { id: true },
      });

      const data = {
        organizationId: orgId,
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

      const imagePayload = prop.imageUrl
        ? { url: prop.imageUrl, isPrimary: true, sortOrder: 0 }
        : null;

      if (existingProp) {
        await prisma.property.update({
          where: { id: existingProp.id },
          data: {
            ...data,
            images: imagePayload
              ? { deleteMany: {}, create: [imagePayload] }
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
            images: imagePayload ? { create: [imagePayload] } : undefined,
          },
        });
        created++;
      }
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: { propertySourceStatus: "OK", propertySourceSyncedAt: new Date() },
    });

    const domain = (() => {
      try {
        return new URL(sourceUrl).hostname;
      } catch {
        return "(url-inválida)";
      }
    })();
    const withPrice = properties.filter((p) => p.priceCents != null).length;
    console.info(
      `[property-sync] ${domain}: estrategia=${strategy} detectadas=${properties.length} nuevas=${created} actualizadas=${updated} conPrecio=${withPrice} sinPrecio=${properties.length - withPrice}`,
    );

    return {
      created,
      updated,
      detected: properties.length,
      withPrice,
      strategy,
      totalFetched,
    };
  } catch (err) {
    await prisma.organization.update({
      where: { id: orgId },
      data: { propertySourceStatus: "ERROR" },
    });
    throw err;
  }
}
