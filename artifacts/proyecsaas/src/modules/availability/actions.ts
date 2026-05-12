"use server";

import { MembershipRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { timeToMinutes } from "./service";

const createSlotSchema = z.object({
  label: z.string().min(1).max(100),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1).max(80),
  userId: z.string().optional(),
  propertyId: z.string().optional(),
});

export async function createAvailabilitySlotAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = createSlotSchema.safeParse({
    label: String(formData.get("label") ?? ""),
    weekday: String(formData.get("weekday") ?? "1"),
    startTime: String(formData.get("startTime") ?? "09:00"),
    endTime: String(formData.get("endTime") ?? "18:00"),
    timezone: String(formData.get("timezone") ?? "America/Buenos_Aires"),
    userId: formData.get("userId") ? String(formData.get("userId")) : undefined,
    propertyId: formData.get("propertyId") ? String(formData.get("propertyId")) : undefined,
  });

  if (!parsed.success) return;

  const { label, weekday, startTime, endTime, timezone, userId, propertyId } = parsed.data;
  const startMinute = timeToMinutes(startTime);
  const endMinute = timeToMinutes(endTime);

  if (endMinute <= startMinute) return;

  await prisma.availabilitySlot.create({
    data: {
      organizationId: membership.organization.id,
      label,
      weekday,
      startMinute,
      endMinute,
      timezone,
      userId: userId || null,
      propertyId: propertyId || null,
      isActive: true,
    },
  });

  revalidatePath(`/${orgSlug}/settings/availability`);
}

export async function toggleAvailabilitySlotAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const slotId = String(formData.get("slotId") ?? "");
  const isActive = formData.get("isActive") === "true";

  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  await prisma.availabilitySlot.updateMany({
    where: { id: slotId, organizationId: membership.organization.id },
    data: { isActive: !isActive },
  });

  revalidatePath(`/${orgSlug}/settings/availability`);
}

export async function deleteAvailabilitySlotAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const slotId = String(formData.get("slotId") ?? "");

  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  await prisma.availabilitySlot.deleteMany({
    where: { id: slotId, organizationId: membership.organization.id },
  });

  revalidatePath(`/${orgSlug}/settings/availability`);
}
