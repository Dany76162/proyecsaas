import "server-only";

import { prisma } from "@/server/db/prisma";
import { syncPropertiesFromUrl } from "@/server/property-sync";

export type RunPropertySyncResult = {
  created: number;
  updated: number;
  skipped: number;
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
  sourceType?: string | null;
}): Promise<RunPropertySyncResult> {
  const { orgId, sourceUrl, sourceType } = params;

  await prisma.organization.update({
    where: { id: orgId },
    data: { propertySourceStatus: "SYNCING" },
  });

  try {
    const { properties, strategy, totalFetched } = await syncPropertiesFromUrl(sourceUrl, { sourceType });

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const prop of properties) {
      if (!prop.title) continue;

      const externalId = prop.externalId;

      const existingProp = await prisma.property.findFirst({
        where: { organizationId: orgId, externalId },
        select: {
          id: true,
          status: true,
          publicVisible: true,
          images: { select: { url: true } },
        },
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
        surfaceM2: prop.surfaceM2 != null ? Math.round(prop.surfaceM2) : null,
        externalLink: prop.externalLink ?? sourceUrl,
        externalSourceUrl: sourceUrl,
        externalId,
      };

      // Galería: usar imageUrls (ficha detalle) si hay; si no, la portada del listado.
      const galleryUrls =
        prop.imageUrls && prop.imageUrls.length > 0
          ? prop.imageUrls
          : prop.imageUrl
            ? [prop.imageUrl]
            : [];

      if (existingProp) {
        // Proteger el trabajo del operador: si ya fue revisada/publicada
        // (status != DRAFT o publicVisible), NO la re-pisamos.
        if (existingProp.status !== "DRAFT" || existingProp.publicVisible) {
          skipped++;
          continue;
        }

        // DRAFT interno: refrescar datos + MERGE de imágenes por URL (no borrar las
        // ya cargadas; agregar solo nuevas, respetando el tope total de 20).
        const existingUrls = new Set(existingProp.images.map((img) => img.url));
        const hadImages = existingProp.images.length > 0;
        const remainingSlots = Math.max(0, 20 - existingProp.images.length);
        const newImages = galleryUrls
          .filter((url) => !existingUrls.has(url))
          .slice(0, remainingSlots)
          .map((url, idx) => ({
            url,
            isPrimary: !hadImages && idx === 0,
            sortOrder: existingProp.images.length + idx,
          }));

        await prisma.property.update({
          where: { id: existingProp.id },
          data: {
            ...data,
            images: newImages.length > 0 ? { create: newImages } : undefined,
          },
        });
        updated++;
      } else {
        const imageCreates = galleryUrls
          .slice(0, 20)
          .map((url, idx) => ({ url, isPrimary: idx === 0, sortOrder: idx }));
        await prisma.property.create({
          data: {
            ...data,
            status: "DRAFT",
            publicVisible: false,
            images: imageCreates.length > 0 ? { create: imageCreates } : undefined,
          },
        });
        created++;
      }
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        propertySourceStatus: "OK",
        propertySourceSyncedAt: new Date(),
        propertySourceErrorMessage: null,
        propertySourceAttemptCount: 0,
      },
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
      `[property-sync] ${domain}: estrategia=${strategy} detectadas=${properties.length} nuevas=${created} actualizadas=${updated} preservadas=${skipped} conPrecio=${withPrice} sinPrecio=${properties.length - withPrice}`,
    );

    return {
      created,
      updated,
      skipped,
      detected: properties.length,
      withPrice,
      strategy,
      totalFetched,
    };
  } catch (err) {
    const message = (err instanceof Error ? err.message : "Error al sincronizar").slice(0, 300);
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        propertySourceStatus: "ERROR",
        propertySourceSyncedAt: new Date(),
        propertySourceErrorMessage: message,
        propertySourceAttemptCount: { increment: 1 },
      },
    });
    throw err;
  }
}
