"use server";

import { randomUUID } from "node:crypto";
import { Prisma, MembershipRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import type { ActionResult } from "@/modules/types";
import {
  addPropertyImageSchema,
  createPropertySchema,
  deletePropertySchema,
  removePropertyImageSchema,
  removePropertyMediaBatchSchema,
  setPropertyFloorPlanSchema,
  setPropertyImagePrimarySchema,
  setPropertyVideoSchema,
  updatePropertySchema,
  updatePropertyImagesBatchSchema,
  upsertPropertyMediaSchema,
} from "@/modules/properties/schemas";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

/**
 * Creates a new property under the given organization.
 * Auth: requires active session + organization membership for `orgSlug`.
 * Minimum role: AGENT.
 */
export async function createPropertyAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, MembershipRole.AGENT);

    const parsed = createPropertySchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: "Los datos de la propiedad son inválidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const property = await prisma.property.create({
      data: {
        organizationId: membership.organization.id,
        ...parsed.data,
        status: "DRAFT",
        publicVisible: false,
      },
      select: { id: true },
    });

    return { success: true, message: "Propiedad creada.", data: { propertyId: property.id } };
  } catch (error: any) {
    console.error("[createPropertyAction] Error:", error);
    return {
      success: false,
      message: error.message || "Error inesperado al crear la propiedad.",
    };
  }
}

function redirectToPropertyResult(
  orgSlug: string,
  propertyId: string,
  params: Record<string, string>,
): never {
  const search = new URLSearchParams(params);
  redirect(`/${orgSlug}/properties/${propertyId}?${search.toString()}`);
}

// Parse a user-entered money amount (in major currency units, e.g. dollars/pesos)
// stripping Spanish thousands separators and converting to cents (integer).
// Returns an empty string if the input is blank (schema will coerce to null).
function parseMajorUnitToCentsStr(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  // Strip thousands separators: dot or comma followed by exactly 3 digits
  const noThousands = trimmed.replace(/[,.](?=(\d{3})+(?!\d))/g, "");
  // Normalize comma-as-decimal to dot (e.g. "1500,50" → "1500.50")
  const normalized = noThousands.replace(",", ".");
  const major = parseFloat(normalized);
  if (isNaN(major)) return "";
  return String(Math.round(major * 100));
}

export async function updatePropertyAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const rawPropertyId = String(formData.get("propertyId") ?? "");

  try {
    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, MembershipRole.AGENT);

    const parsed = updatePropertySchema.safeParse({
      propertyId: rawPropertyId,
      // Datos comerciales
      title: String(formData.get("title") ?? ""),
      operationType: String(formData.get("operationType") ?? ""),
      propertyType: String(formData.get("propertyType") ?? ""),
      priceCents: parseMajorUnitToCentsStr(String(formData.get("priceCents") ?? "")),
      currency: String(formData.get("currency") ?? ""),
      expensesCents: parseMajorUnitToCentsStr(String(formData.get("expensesCents") ?? "")),
      status: String(formData.get("status") ?? ""),
      publicVisible: formData.get("publicVisible") === "on",
      // Ubicación
      address: String(formData.get("address") ?? ""),
      city: String(formData.get("city") ?? ""),
      neighborhood: String(formData.get("neighborhood") ?? ""),
      province: String(formData.get("province") ?? ""),
      country: String(formData.get("country") ?? ""),
      showExactLocation: formData.get("showExactLocation") === "on",
      isFeatured: formData.get("isFeatured") === "on",
      latitude: String(formData.get("latitude") ?? ""),
      longitude: String(formData.get("longitude") ?? ""),
      // Características
      rooms: String(formData.get("rooms") ?? ""),
      bedrooms: String(formData.get("bedrooms") ?? ""),
      bathrooms: String(formData.get("bathrooms") ?? ""),
      surfaceM2: String(formData.get("surfaceM2") ?? ""),
      coveredSurfaceM2: String(formData.get("coveredSurfaceM2") ?? ""),
      totalSurfaceM2: String(formData.get("totalSurfaceM2") ?? ""),
      parkingSpots: String(formData.get("parkingSpots") ?? ""),
      yearBuilt: String(formData.get("yearBuilt") ?? ""),
      petsAllowed: formData.get("petsAllowed") === "on",
      professionalApt: formData.get("professionalApt") === "on",
      creditApt: formData.get("creditApt") === "on",
      condition: String(formData.get("condition") ?? ""),
      // Descripción y multimedia
      description: String(formData.get("description") ?? ""),
      amenities: String(formData.get("amenities") ?? ""),
      externalLink: String(formData.get("externalLink") ?? ""),
      videoUrl: String(formData.get("videoUrl") ?? ""),
    });

    if (!parsed.success) {
      redirectToPropertyResult(orgSlug, rawPropertyId, { error: "invalid-property" });
    }

    const property = await prisma.property.findFirst({
      where: {
        id: parsed.data.propertyId,
        organizationId: membership.organization.id,
      },
      select: { id: true },
    });

    if (!property) {
      redirectToPropertyResult(orgSlug, parsed.data.propertyId, { error: "property-not-found" });
    }

    try {
      await prisma.property.update({
        where: { id: property.id },
        select: { id: true },
        data: {
          title: parsed.data.title,
          operationType: parsed.data.operationType,
          propertyType: parsed.data.propertyType,
          priceCents: parsed.data.priceCents,
          currency: parsed.data.currency ?? "USD",
          expensesCents: parsed.data.expensesCents,
          status: parsed.data.status,
          publicVisible: parsed.data.publicVisible,
          address: parsed.data.address,
          city: parsed.data.city,
          neighborhood: parsed.data.neighborhood,
          province: parsed.data.province,
          country: parsed.data.country ?? "Argentina",
          showExactLocation: parsed.data.showExactLocation,
          isFeatured: parsed.data.isFeatured,
          latitude: parsed.data.latitude ? new Prisma.Decimal(parsed.data.latitude) : null,
          longitude: parsed.data.longitude ? new Prisma.Decimal(parsed.data.longitude) : null,
          rooms: parsed.data.rooms,
          bedrooms: parsed.data.bedrooms,
          bathrooms: parsed.data.bathrooms,
          surfaceM2: parsed.data.surfaceM2,
          coveredSurfaceM2: parsed.data.coveredSurfaceM2,
          totalSurfaceM2: parsed.data.totalSurfaceM2,
          parkingSpots: parsed.data.parkingSpots,
          yearBuilt: parsed.data.yearBuilt,
          petsAllowed: parsed.data.petsAllowed,
          professionalApt: parsed.data.professionalApt,
          creditApt: parsed.data.creditApt,
          condition: parsed.data.condition,
          description: parsed.data.description,
          amenities: parsed.data.amenities,
          externalLink: parsed.data.externalLink,
          videoUrl: parsed.data.videoUrl,
        },
      });
    } catch (updateError) {
      console.warn("[actions] updatePropertyAction failed with advanced columns, falling back to legacy update:", updateError);
      await prisma.property.update({
        where: { id: property.id },
        select: { id: true },
        data: {
          title: parsed.data.title,
          operationType: parsed.data.operationType,
          propertyType: parsed.data.propertyType,
          priceCents: parsed.data.priceCents,
          currency: parsed.data.currency ?? "USD",
          expensesCents: parsed.data.expensesCents,
          status: parsed.data.status,
          publicVisible: parsed.data.publicVisible,
          address: parsed.data.address,
          city: parsed.data.city,
          neighborhood: parsed.data.neighborhood,
          latitude: parsed.data.latitude ? new Prisma.Decimal(parsed.data.latitude) : null,
          longitude: parsed.data.longitude ? new Prisma.Decimal(parsed.data.longitude) : null,
          rooms: parsed.data.rooms,
          bedrooms: parsed.data.bedrooms,
          bathrooms: parsed.data.bathrooms,
          surfaceM2: parsed.data.surfaceM2,
          parkingSpots: parsed.data.parkingSpots,
          description: parsed.data.description,
          amenities: parsed.data.amenities,
          externalLink: parsed.data.externalLink,
          videoUrl: parsed.data.videoUrl,
        },
      });
    }

    revalidatePath(`/${orgSlug}`);
    revalidatePath(`/${orgSlug}/properties`);
    revalidatePath(`/${orgSlug}/properties/${property.id}`);
    revalidatePath(`/${orgSlug}/leads`);
    revalidatePath(`/${orgSlug}/visits`);

    redirectToPropertyResult(orgSlug, property.id, { success: "property-updated" });
  } catch (error: any) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error('[updatePropertyAction]', error);
    const errMessage = error?.message ? encodeURIComponent(error.message) : "update-failed";
    redirectToPropertyResult(orgSlug, rawPropertyId, { error: errMessage });
  }
}

// â”€â”€â”€ Delete action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Permanently deletes a property and cleans up all related records.
 *
 * Cascade behavior:
 *   - PropertyImage   → deleted via DB cascade (onDelete: Cascade)
 *   - Visit           → deleted via DB cascade (onDelete: Cascade)
 *   - Lead.propertyId → nulled (onDelete: Restrict â€” leads are decoupled, not deleted)
 *   - Conversation.propertyId → nulled (onDelete: Restrict â€” conversations preserved)
 *   - AvailabilitySlot.propertyId → nulled (onDelete: Restrict â€” slots preserved without property context)
 *
 * Auth: requires ADMIN role. Agents can edit but not delete.
 */
export async function deletePropertyAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = deletePropertySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "ID de propiedad inválido." };
  }

  // Verify property belongs to this org (multi-tenant guard)
  const property = await prisma.property.findFirst({
    where: {
      id: parsed.data.propertyId,
      organizationId: membership.organization.id,
    },
    select: { id: true },
  });

  if (!property) {
    return { success: false, message: "Propiedad no encontrada." };
  }

  // Use a transaction: null out Restrict relations first, then delete.
  await prisma.$transaction([
    // Decouple leads (preserve lead records, just remove the property reference)
    prisma.lead.updateMany({
      where: { propertyId: property.id, organizationId: membership.organization.id },
      data: { propertyId: null },
    }),
    // Decouple conversations (preserve conversation history)
    prisma.conversation.updateMany({
      where: { propertyId: property.id, organizationId: membership.organization.id },
      data: { propertyId: null },
    }),
    // Decouple availability slots (keep agent availability, remove property context)
    prisma.availabilitySlot.updateMany({
      where: { propertyId: property.id, organizationId: membership.organization.id },
      data: { propertyId: null },
    }),
    // Delete the property â€” images and visits cascade automatically
    prisma.property.delete({
      where: { id: property.id },
    }),
  ]);

  revalidatePath(`/${orgSlug}/properties`);
  revalidatePath(`/${orgSlug}/leads`);
  revalidatePath(`/${orgSlug}/visits`);

  return { success: true, message: "Propiedad eliminada correctamente." };
}

// â”€â”€â”€ Video action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Sets or clears the video URL for a property.
 * Handles both UploadThing CDN URLs and external URLs.
 * Pass url: null to remove the video.
 */
export async function setPropertyVideoAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = setPropertyVideoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Datos inválidos." };
  }

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, organizationId: membership.organization.id },
    select: { id: true },
  });
  if (!property) {
    return { success: false, message: "Propiedad no encontrada." };
  }

  await prisma.property.update({
    where: { id: property.id },
    data: { videoUrl: parsed.data.url },
  });

  revalidatePath(`/${orgSlug}/properties/${property.id}`);
  return { success: true, message: parsed.data.url ? "Video actualizado." : "Video eliminado." };
}

// â”€â”€â”€ Image actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function setPropertyFloorPlanAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = setPropertyFloorPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Datos de plano invalidos." };
  }

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, organizationId: membership.organization.id },
    select: { id: true },
  });
  if (!property) {
    return { success: false, message: "Propiedad no encontrada." };
  }

  await prisma.$executeRaw`
    UPDATE "Property"
    SET "floorPlanUrl" = ${parsed.data.url}
    WHERE "id" = ${property.id}
  `;

  revalidatePath(`/${orgSlug}/properties/${property.id}`);
  revalidatePath(`/map/${property.id}`);
  return { success: true, message: parsed.data.url ? "Plano actualizado." : "Plano eliminado." };
}

export async function addPropertyImageAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = addPropertyImageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "URL inválida.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Verify property belongs to this org
  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, organizationId: membership.organization.id },
    select: { id: true },
  });
  if (!property) {
    return { success: false, message: "Propiedad no encontrada." };
  }

  // If isPrimary, unset previous primary first
  if (parsed.data.isPrimary) {
    await prisma.propertyImage.updateMany({
      where: { propertyId: property.id },
      data: { isPrimary: false },
    });
  }

  // Determine next sort order
  const lastImage = await prisma.propertyImage.findFirst({
    where: { propertyId: property.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const nextSortOrder = (lastImage?.sortOrder ?? -1) + 1;

  await prisma.propertyImage.create({
    data: {
      propertyId: property.id,
      organizationId: membership.organization.id,
      url: parsed.data.url,
      altText: parsed.data.altText ?? null,
      isPrimary: parsed.data.isPrimary ?? false,
      sortOrder: nextSortOrder,
    },
  });

  revalidatePath(`/${orgSlug}/properties/${property.id}`);
  return { success: true, message: "Imagen agregada." };
}

export async function removePropertyImageAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = removePropertyImageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Solicitud inválida." };
  }

  // Verify the image belongs to a property in this org
  const image = await prisma.propertyImage.findFirst({
    where: {
      id: parsed.data.imageId,
      propertyId: parsed.data.propertyId,
      organizationId: membership.organization.id,
    },
    select: { id: true, propertyId: true },
  });
  if (!image) {
    return { success: false, message: "Imagen no encontrada." };
  }

  await prisma.propertyImage.delete({ where: { id: image.id } });

  revalidatePath(`/${orgSlug}/properties/${image.propertyId}`);
  return { success: true, message: "Imagen eliminada." };
}

const demoTourScenes = [
  {
    url: "/uploads/property-media/panoramas360/demo-living.jpg",
    title: "Living demo",
    roomName: "Living",
    positionX: -3,
    positionY: 0,
  },
  {
    url: "/uploads/property-media/panoramas360/demo-cocina.jpg",
    title: "Cocina demo",
    roomName: "Cocina",
    positionX: 0,
    positionY: -2.4,
  },
  {
    url: "/uploads/property-media/panoramas360/demo-dormitorio.jpg",
    title: "Dormitorio demo",
    roomName: "Dormitorio",
    positionX: 3,
    positionY: 0,
  },
];

export async function createPropertyDemoTourAction(
  orgSlug: string,
  propertyId: string,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId: membership.organization.id },
    select: { id: true },
  });
  if (!property) {
    return { success: false, message: "Propiedad no encontrada." };
  }

  const existing = await prisma.propertyPanorama.count({
    where: { propertyId: property.id, organizationId: membership.organization.id },
  });
  if (existing > 0) {
    return { success: false, message: "La propiedad ya tiene escenas 360." };
  }

  const created = await prisma.$transaction(async (tx) => {
    const panoramas = [];

    for (let index = 0; index < demoTourScenes.length; index += 1) {
      const scene = demoTourScenes[index];
      await tx.propertyImage.create({
        data: {
          propertyId: property.id,
          organizationId: membership.organization.id,
          url: scene.url,
          altText: scene.title,
          category: "PANORAMA",
          isPrimary: false,
          sortOrder: index,
        },
      });

      const panorama: { id: string } = {
        id: randomUUID(),
      };

      await tx.$executeRaw`
        INSERT INTO "PropertyPanorama" (
          "id",
          "propertyId",
          "organizationId",
          "url",
          "label",
          "roomName",
          "direction",
          "floor",
          "positionX",
          "positionY",
          "positionZ",
          "connections",
          "sortOrder",
          "createdAt"
        )
        VALUES (
          ${panorama.id},
          ${property.id},
          ${membership.organization.id},
          ${scene.url},
          ${scene.title},
          ${scene.roomName},
          ${"CENTER"},
          ${0},
          ${scene.positionX},
          ${scene.positionY},
          ${0},
          ${"[]"},
          ${index},
          NOW()
        )
      `;

      panoramas.push(panorama);
    }

    for (let index = 0; index < panoramas.length; index += 1) {
      const connections = [panoramas[index - 1]?.id, panoramas[index + 1]?.id].filter(
        (id): id is string => Boolean(id),
      );

      await tx.$executeRaw`
        UPDATE "PropertyPanorama"
        SET "connections" = ${JSON.stringify(connections)}
        WHERE "id" = ${panoramas[index].id}
      `;
    }

    return panoramas;
  });

  revalidatePath(`/${orgSlug}/properties/${property.id}`);
  return { success: true, message: `${created.length} escenas demo creadas.` };
}

export async function removePropertyMediaBatchAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = removePropertyMediaBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Solicitud invÃ¡lida.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, organizationId: membership.organization.id },
    select: { id: true },
  });
  if (!property) {
    return { success: false, message: "Propiedad no encontrada." };
  }

  const imageIds = [...new Set(parsed.data.imageIds)];
  const panoramaIds = [...new Set(parsed.data.panoramaIds)];

  const panoramas = panoramaIds.length
    ? await prisma.propertyPanorama.findMany({
        where: {
          id: { in: panoramaIds },
          propertyId: property.id,
          organizationId: membership.organization.id,
        },
        select: { id: true, url: true },
      })
    : [];

  const panoramaUrls = panoramas.map((panorama) => panorama.url);
  if (imageIds.length === 0 && panoramaUrls.length === 0) {
    return { success: false, message: "No se encontraron medios para eliminar." };
  }

  await prisma.$transaction([
    ...(panoramas.length
      ? [
          prisma.propertyPanorama.deleteMany({
            where: {
              id: { in: panoramas.map((panorama) => panorama.id) },
              propertyId: property.id,
              organizationId: membership.organization.id,
            },
          }),
        ]
      : []),
    prisma.propertyImage.deleteMany({
      where: {
        propertyId: property.id,
        organizationId: membership.organization.id,
        OR: [
          ...(imageIds.length ? [{ id: { in: imageIds } }] : []),
          ...(panoramaUrls.length ? [{ url: { in: panoramaUrls } }] : []),
        ],
      },
    }),
  ]);

  revalidatePath(`/${orgSlug}/properties/${property.id}`);
  return { success: true, message: "Medios eliminados." };
}

export async function setPropertyImagePrimaryAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = setPropertyImagePrimarySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Solicitud inválida." };
  }

  const image = await prisma.propertyImage.findFirst({
    where: {
      id: parsed.data.imageId,
      propertyId: parsed.data.propertyId,
      organizationId: membership.organization.id,
    },
    select: { id: true, propertyId: true },
  });
  if (!image) {
    return { success: false, message: "Imagen no encontrada." };
  }

  // Unset all, then set this one
  await prisma.$transaction([
    prisma.propertyImage.updateMany({
      where: { propertyId: image.propertyId },
      data: { isPrimary: false },
    }),
    prisma.propertyImage.update({
      where: { id: image.id },
      data: { isPrimary: true },
    }),
  ]);

  revalidatePath(`/${orgSlug}/properties/${image.propertyId}`);
  return { success: true, message: "Imagen principal actualizada." };
}

export async function updatePropertyImagesBatchAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = updatePropertyImagesBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Datos inválidos.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, organizationId: membership.organization.id },
    select: { id: true },
  });
  if (!property) {
    return { success: false, message: "Propiedad no encontrada." };
  }

  // Transaction: Delete old ones and create new ones in the exact order specified
  await prisma.$transaction([
    prisma.propertyImage.deleteMany({
      where: { propertyId: property.id },
    }),
    prisma.propertyImage.createMany({
      data: parsed.data.images.map((img) => ({
        propertyId: property.id,
        organizationId: membership.organization.id,
        url: img.url,
        altText: img.altText ?? null,
        category: img.category ?? "REAL",
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      })),
    }),
  ]);

  revalidatePath(`/${orgSlug}/properties/${property.id}`);
  return { success: true, message: "Galería de imágenes actualizada correctamente." };
}

// ─── Panorama actions ────────────────────────────────────────────────────────

export async function upsertPropertyMediaAction(
  orgSlug: string,
  propertyId: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = upsertPropertyMediaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Datos de medio invÃ¡lidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId: membership.organization.id },
    select: { id: true },
  });
  if (!property) {
    return { success: false, message: "Propiedad no encontrada." };
  }

  if (parsed.data.category === "PANORAMA") {
    const lastPanorama = await prisma.propertyPanorama.findFirst({
      where: { propertyId: property.id, organizationId: membership.organization.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const nextSortOrder = (lastPanorama?.sortOrder ?? -1) + 1;

    await prisma.$transaction([
      prisma.propertyImage.create({
        data: {
          propertyId: property.id,
          organizationId: membership.organization.id,
          url: parsed.data.url,
          altText: parsed.data.title,
          category: "PANORAMA",
          isPrimary: false,
          sortOrder: nextSortOrder,
        },
      }),
      prisma.propertyPanorama.create({
        data: {
          propertyId: property.id,
          organizationId: membership.organization.id,
          url: parsed.data.url,
          label: parsed.data.title,
          roomName: parsed.data.title,
          direction: parsed.data.direction ?? null,
          sortOrder: nextSortOrder,
        },
      }),
    ]);

    revalidatePath(`/${orgSlug}/properties/${property.id}`);
    return { success: true, message: "Escena 360Â° agregada." };
  }

  const lastImage = await prisma.propertyImage.findFirst({
    where: {
      propertyId: property.id,
      organizationId: membership.organization.id,
      category: parsed.data.category,
    },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const nextSortOrder = (lastImage?.sortOrder ?? -1) + 1;

  const hasPrimary = await prisma.propertyImage.findFirst({
    where: { propertyId: property.id, organizationId: membership.organization.id, isPrimary: true },
    select: { id: true },
  });

  await prisma.propertyImage.create({
    data: {
      propertyId: property.id,
      organizationId: membership.organization.id,
      url: parsed.data.url,
      altText: parsed.data.title,
      category: parsed.data.category,
      isPrimary: !hasPrimary && parsed.data.category === "REAL",
      sortOrder: nextSortOrder,
    },
  });

  revalidatePath(`/${orgSlug}/properties/${property.id}`);
  return { success: true, message: "Imagen agregada." };
}

import {
  addPropertyPanoramaSchema,
  removePropertyPanoramaSchema,
  updatePanoramaSettingsSchema,
} from "@/modules/properties/schemas";

export async function addPropertyPanoramaAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = addPropertyPanoramaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "URL o datos inválidos.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, organizationId: membership.organization.id },
    select: { id: true },
  });
  if (!property) {
    return { success: false, message: "Propiedad no encontrada." };
  }

  const lastPanorama = await prisma.propertyPanorama.findFirst({
    where: { propertyId: property.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const nextSortOrder = (lastPanorama?.sortOrder ?? -1) + 1;

  await prisma.propertyPanorama.create({
    data: {
      propertyId: property.id,
      organizationId: membership.organization.id,
      url: parsed.data.url,
      label: parsed.data.label ?? null,
      sortOrder: nextSortOrder,
    },
  });

  revalidatePath(`/${orgSlug}/properties/${property.id}`);
  return { success: true, message: "Escena 360° agregada." };
}

export async function removePropertyPanoramaAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = removePropertyPanoramaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Solicitud inválida." };
  }

  const panorama = await prisma.propertyPanorama.findFirst({
    where: {
      id: parsed.data.panoramaId,
      propertyId: parsed.data.propertyId,
      organizationId: membership.organization.id,
    },
    select: { id: true, propertyId: true },
  });
  if (!panorama) {
    return { success: false, message: "Escena no encontrada." };
  }

  await prisma.propertyPanorama.delete({ where: { id: panorama.id } });

  revalidatePath(`/${orgSlug}/properties/${panorama.propertyId}`);
  return { success: true, message: "Escena 360° eliminada." };
}

export async function updatePanoramaSettingsAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = updatePanoramaSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Datos inválidos.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const panorama = await prisma.propertyPanorama.findFirst({
    where: {
      id: parsed.data.panoramaId,
      propertyId: parsed.data.propertyId,
      organizationId: membership.organization.id,
    },
    select: { id: true, propertyId: true },
  });
  if (!panorama) {
    return { success: false, message: "Escena no encontrada." };
  }

  const connections = parsed.data.connections !== undefined ? JSON.stringify(parsed.data.connections) : null;

  await prisma.$executeRaw`
    UPDATE "PropertyPanorama"
    SET
      "label" = CASE WHEN ${parsed.data.label !== undefined} THEN ${parsed.data.label ?? null} ELSE "label" END,
      "roomName" = CASE WHEN ${parsed.data.roomName !== undefined} THEN ${parsed.data.roomName ?? null} ELSE "roomName" END,
      "floor" = CASE WHEN ${parsed.data.floor !== undefined} THEN ${parsed.data.floor ?? null} ELSE "floor" END,
      "positionX" = CASE WHEN ${parsed.data.positionX !== undefined} THEN ${parsed.data.positionX ?? null} ELSE "positionX" END,
      "positionY" = CASE WHEN ${parsed.data.positionY !== undefined} THEN ${parsed.data.positionY ?? null} ELSE "positionY" END,
      "positionZ" = CASE WHEN ${parsed.data.positionZ !== undefined} THEN ${parsed.data.positionZ ?? null} ELSE "positionZ" END,
      "connections" = CASE WHEN ${parsed.data.connections !== undefined} THEN ${connections} ELSE "connections" END,
      "initialYaw" = CASE WHEN ${parsed.data.initialYaw !== undefined} THEN ${parsed.data.initialYaw ?? null} ELSE "initialYaw" END,
      "initialPitch" = CASE WHEN ${parsed.data.initialPitch !== undefined} THEN ${parsed.data.initialPitch ?? null} ELSE "initialPitch" END,
      "initialHfov" = CASE WHEN ${parsed.data.initialHfov !== undefined} THEN ${parsed.data.initialHfov ?? null} ELSE "initialHfov" END,
      "hotspotPitch" = CASE WHEN ${parsed.data.hotspotPitch !== undefined} THEN ${parsed.data.hotspotPitch ?? null} ELSE "hotspotPitch" END,
      "hotspotYaw" = CASE WHEN ${parsed.data.hotspotYaw !== undefined} THEN ${parsed.data.hotspotYaw ?? null} ELSE "hotspotYaw" END
    WHERE "id" = ${panorama.id}
  `;

  revalidatePath(`/${orgSlug}/properties/${panorama.propertyId}`);
  return { success: true, message: "Escena 360° actualizada." };
}
