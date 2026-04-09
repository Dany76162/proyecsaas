import "server-only";

import { prisma } from "@/server/db/prisma";

export type AvailabilitySlotData = {
  label: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
};

export async function listOrganizationAvailability(orgSlug: string) {
  return prisma.availabilitySlot.findMany({
    where: { organization: { slug: orgSlug } },
    orderBy: [
      { weekday: "asc" },
      { startMinute: "asc" },
    ],
  });
}

export async function createAvailabilitySlot(orgSlug: string, data: AvailabilitySlotData) {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });

  if (!org) {
    throw new Error("La organización no existe.");
  }

  if (data.startMinute >= data.endMinute) {
    throw new Error("La hora de inicio debe ser anterior a la hora de fin.");
  }

  // Prevenir duplicados puros exactos
  const existing = await prisma.availabilitySlot.findFirst({
    where: {
      organizationId: org.id,
      weekday: data.weekday,
      startMinute: data.startMinute,
      endMinute: data.endMinute,
    }
  });

  if (existing) {
     throw new Error("Ya existe un bloque horario idéntico.");
  }

  return prisma.availabilitySlot.create({
    data: {
      organizationId: org.id,
      label: data.label,
      weekday: data.weekday,
      startMinute: data.startMinute,
      endMinute: data.endMinute,
      isActive: true,
      timezone: "America/Buenos_Aires",
    },
  });
}

export async function deleteAvailabilitySlot(orgSlug: string, slotId: string) {
  return prisma.availabilitySlot.deleteMany({
    where: { 
      id: slotId,
      organization: { slug: orgSlug }
    },
  });
}

export async function toggleAvailabilitySlot(orgSlug: string, slotId: string, isActive: boolean) {
  const slot = await prisma.availabilitySlot.findFirst({
    where: {
      id: slotId,
      organization: { slug: orgSlug },
    },
  });

  if (!slot) throw new Error("Turno no encontrado.");

  return prisma.availabilitySlot.update({
    where: { id: slot.id },
    data: { isActive }
  });
}
