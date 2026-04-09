import { prisma } from "@/server/db/prisma";

export type AvailabilitySlotRow = {
  id: string;
  label: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  timezone: string;
  isActive: boolean;
  userId: string | null;
  propertyId: string | null;
  userName: string | null;
  propertyTitle: string | null;
  createdAt: Date;
};

export async function listAvailabilitySlots(orgSlug: string): Promise<AvailabilitySlotRow[]> {
  const slots = await prisma.availabilitySlot.findMany({
    where: {
      organization: { slug: orgSlug },
    },
    include: {
      user: { select: { fullName: true } },
      property: { select: { title: true } },
    },
    orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
  });

  return slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    weekday: slot.weekday,
    startMinute: slot.startMinute,
    endMinute: slot.endMinute,
    timezone: slot.timezone,
    isActive: slot.isActive,
    userId: slot.userId,
    propertyId: slot.propertyId,
    userName: slot.user?.fullName ?? null,
    propertyTitle: slot.property?.title ?? null,
    createdAt: slot.createdAt,
  }));
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
