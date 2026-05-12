"use server";

import { MembershipRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionResult } from "@/modules/types";
import {
  addPropertyImageSchema,
  createPropertySchema,
  deletePropertySchema,
  removePropertyImageSchema,
  setPropertyImagePrimarySchema,
  setPropertyVideoSchema,
  updatePropertySchema,
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
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = createPropertySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Property input is invalid.",
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

  return { success: true, message: "Property created.", data: { propertyId: property.id } };
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
  // Normalize comma-as-decimal to dot (e.g. "1500,50" â†’ "1500.50")
  const normalized = noThousands.replace(",", ".");
  const major = parseFloat(normalized);
  if (isNaN(major)) return "";
  return String(Math.round(major * 100));
}

export async function updatePropertyAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const rawPropertyId = String(formData.get("propertyId") ?? "");

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
    // UbicaciÃ³n
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    neighborhood: String(formData.get("neighborhood") ?? ""),
    // CaracterÃ­sticas
    rooms: String(formData.get("rooms") ?? ""),
    bedrooms: String(formData.get("bedrooms") ?? ""),
    bathrooms: String(formData.get("bathrooms") ?? ""),
    surfaceM2: String(formData.get("surfaceM2") ?? ""),
    parkingSpots: String(formData.get("parkingSpots") ?? ""),
    // DescripciÃ³n y multimedia
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

  await prisma.property.update({
    where: { id: property.id },
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

  revalidatePath(`/${orgSlug}`);
  revalidatePath(`/${orgSlug}/properties`);
  revalidatePath(`/${orgSlug}/properties/${property.id}`);
  revalidatePath(`/${orgSlug}/leads`);
  revalidatePath(`/${orgSlug}/visits`);

  redirectToPropertyResult(orgSlug, property.id, { success: "property-updated" });
}

// â”€â”€â”€ Delete action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Permanently deletes a property and cleans up all related records.
 *
 * Cascade behavior:
 *   - PropertyImage   â†’ deleted via DB cascade (onDelete: Cascade)
 *   - Visit           â†’ deleted via DB cascade (onDelete: Cascade)
 *   - Lead.propertyId â†’ nulled (onDelete: Restrict â€” leads are decoupled, not deleted)
 *   - Conversation.propertyId â†’ nulled (onDelete: Restrict â€” conversations preserved)
 *   - AvailabilitySlot.propertyId â†’ nulled (onDelete: Restrict â€” slots preserved without property context)
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
    return { success: false, message: "ID de propiedad invÃ¡lido." };
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
    return { success: false, message: "Datos invÃ¡lidos." };
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

export async function addPropertyImageAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = addPropertyImageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "URL invÃ¡lida.", fieldErrors: parsed.error.flatten().fieldErrors };
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
    return { success: false, message: "Solicitud invÃ¡lida." };
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

export async function setPropertyImagePrimaryAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = setPropertyImagePrimarySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Solicitud invÃ¡lida." };
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
