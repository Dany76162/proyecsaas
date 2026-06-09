"use server";

import { MembershipRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/modules/types";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import {
  createDevelopmentSchema,
  updateDevelopmentSchema,
  deleteDevelopmentSchema,
  updateDevelopmentLotSchema,
  createReservationSchema,
  reservationActionSchema,
} from "./schemas";

export function getStageNumber(etapaNombre: string | null | undefined): number | null {
  if (!etapaNombre) return null;
  const matchDigit = etapaNombre.match(/[1-5]/);
  if (matchDigit) return parseInt(matchDigit[0], 10);
  
  const clean = etapaNombre.toUpperCase();
  if (/\bV\b/.test(clean)) return 5;
  if (/\bIV\b/.test(clean)) return 4;
  if (/\bIII\b/.test(clean)) return 3;
  if (/\bII\b/.test(clean)) return 2;
  if (/\bI\b/.test(clean)) return 1;
  
  return null;
}

// ─── Development CRUD ─────────────────────────────────────────────────────────

export async function createDevelopmentAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = createDevelopmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Datos inválidos.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const dev = await prisma.development.create({
    data: {
      organizationId: membership.organization.id,
      ...parsed.data,
    },
    select: { id: true },
  });

  revalidatePath(`/${orgSlug}/developments`);
  return { success: true, message: "Desarrollo creado.", data: { developmentId: dev.id } };
}

export async function updateDevelopmentAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = updateDevelopmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Datos inválidos.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { developmentId, ...data } = parsed.data;

  const dev = await prisma.development.findFirst({
    where: { id: developmentId, organizationId: membership.organization.id },
    select: { id: true },
  });
  if (!dev) return { success: false, message: "Desarrollo no encontrado." };

  await prisma.development.update({ where: { id: dev.id }, data });

  // Recalculate lot prices by stage if any stage price is updated
  const { pricePerSqmEtapa1, pricePerSqmEtapa2, pricePerSqmEtapa3, pricePerSqmEtapa4, pricePerSqmEtapa5 } = data;
  if (
    pricePerSqmEtapa1 !== undefined ||
    pricePerSqmEtapa2 !== undefined ||
    pricePerSqmEtapa3 !== undefined ||
    pricePerSqmEtapa4 !== undefined ||
    pricePerSqmEtapa5 !== undefined
  ) {
    const lots = await prisma.developmentLot.findMany({
      where: {
        developmentId: dev.id,
        areaSqm: { not: null },
      },
      select: {
        id: true,
        areaSqm: true,
        etapaNombre: true,
      },
    });

    const updates = [];
    
    // Fetch current saved values from DB to handle case where only some stage inputs are changed in the request
    const currentDev = await prisma.development.findUnique({
      where: { id: dev.id },
      select: {
        pricePerSqmEtapa1: true,
        pricePerSqmEtapa2: true,
        pricePerSqmEtapa3: true,
        pricePerSqmEtapa4: true,
        pricePerSqmEtapa5: true,
      },
    });

    for (const lot of lots) {
      const stageNum = getStageNumber(lot.etapaNombre);
      let pricePerSqm = null;
      if (stageNum === 1) pricePerSqm = pricePerSqmEtapa1 !== undefined ? pricePerSqmEtapa1 : currentDev?.pricePerSqmEtapa1;
      else if (stageNum === 2) pricePerSqm = pricePerSqmEtapa2 !== undefined ? pricePerSqmEtapa2 : currentDev?.pricePerSqmEtapa2;
      else if (stageNum === 3) pricePerSqm = pricePerSqmEtapa3 !== undefined ? pricePerSqmEtapa3 : currentDev?.pricePerSqmEtapa3;
      else if (stageNum === 4) pricePerSqm = pricePerSqmEtapa4 !== undefined ? pricePerSqmEtapa4 : currentDev?.pricePerSqmEtapa4;
      else if (stageNum === 5) pricePerSqm = pricePerSqmEtapa5 !== undefined ? pricePerSqmEtapa5 : currentDev?.pricePerSqmEtapa5;

      if (pricePerSqm !== null && pricePerSqm !== undefined && pricePerSqm > 0) {
        updates.push(
          prisma.developmentLot.update({
            where: { id: lot.id },
            data: {
              priceCents: Math.round(pricePerSqm * lot.areaSqm! * 100),
            },
          })
        );
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }
  }

  revalidatePath(`/${orgSlug}/developments`);
  revalidatePath(`/${orgSlug}/developments/${developmentId}`);
  return { success: true, message: "Desarrollo actualizado." };
}

export async function deleteDevelopmentAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = deleteDevelopmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "ID inválido." };

  const dev = await prisma.development.findFirst({
    where: { id: parsed.data.developmentId, organizationId: membership.organization.id },
    select: { id: true },
  });
  if (!dev) return { success: false, message: "Desarrollo no encontrado." };

  // Find all lot IDs of the development to delete their dependencies
  const lots = await prisma.developmentLot.findMany({
    where: { developmentId: dev.id },
    select: { id: true },
  });
  const lotIds = lots.map((l) => l.id);

  // Programmatically delete all children in the correct order of dependencies
  await prisma.$transaction([
    // 1. Delete reservations associated with the lots
    prisma.developmentReservation.deleteMany({
      where: { lotId: { in: lotIds } },
    }),
    // 2. Delete status history associated with the lots
    prisma.developmentLotHistory.deleteMany({
      where: { lotId: { in: lotIds } },
    }),
    // 3. Delete map images associated with the development
    prisma.developmentMapImage.deleteMany({
      where: { developmentId: dev.id },
    }),
    // 4. Delete the lots themselves
    prisma.developmentLot.deleteMany({
      where: { developmentId: dev.id },
    }),
    // 5. Delete the parent development
    prisma.development.delete({
      where: { id: dev.id },
    }),
  ]);

  revalidatePath(`/${orgSlug}/developments`);
  return { success: true, message: "Desarrollo eliminado." };
}

// ─── Lot management ───────────────────────────────────────────────────────────

export async function updateDevelopmentLotAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = updateDevelopmentLotSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };

  const { developmentId, lotId, ...data } = parsed.data;

  const lot = await prisma.developmentLot.findFirst({
    where: { id: lotId, developmentId, organizationId: membership.organization.id },
    select: { id: true, status: true },
  });
  if (!lot) return { success: false, message: "Lote no encontrado." };

  if (data.status && data.status !== lot.status) {
    await prisma.$transaction([
      prisma.developmentLot.update({ where: { id: lot.id }, data }),
      prisma.developmentLotHistory.create({
        data: {
          lotId: lot.id,
          organizationId: membership.organization.id,
          previousStatus: lot.status,
          newStatus: data.status,
          reason: "Actualización manual",
        },
      }),
    ]);
  } else {
    await prisma.developmentLot.update({ where: { id: lot.id }, data });
  }

  revalidatePath(`/${orgSlug}/developments/${developmentId}`);
  return { success: true, message: "Lote actualizado." };
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export async function createReservationAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };

  const { developmentId, lotId, leadId, depositCents, notes, expiresAt } = parsed.data;

  const lot = await prisma.developmentLot.findFirst({
    where: { id: lotId, developmentId, organizationId: membership.organization.id },
    select: { id: true, status: true },
  });
  if (!lot) return { success: false, message: "Lote no encontrado." };

  // Multi-tenant: verify lead belongs to the same org
  if (leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: membership.organization.id },
      select: { id: true },
    });
    if (!lead) return { success: false, message: "Lead no encontrado en esta organización." };
  }

  // Atomic lock: only proceed if AVAILABLE
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.developmentLot.updateMany({
      where: { id: lot.id, status: "AVAILABLE" },
      data: { status: "RESERVED_PENDING" },
    });

    if (updated.count === 0) {
      throw new Error("El lote ya no está disponible.");
    }

    const reservation = await tx.developmentReservation.create({
      data: {
        lotId: lot.id,
        organizationId: membership.organization.id,
        leadId: leadId ?? null,
        agentId: user.id,
        depositCents: depositCents ?? null,
        notes: notes ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: "PENDING_APPROVAL",
      },
      select: { id: true },
    });

    await tx.developmentLotHistory.create({
      data: {
        lotId: lot.id,
        organizationId: membership.organization.id,
        previousStatus: "AVAILABLE",
        newStatus: "RESERVED_PENDING",
        reason: "Inicio de reserva",
      },
    });

    return reservation;
  });

  revalidatePath(`/${orgSlug}/developments/${developmentId}`);
  return { success: true, message: "Reserva creada.", data: { reservationId: result.id } };
}

export async function approveReservationAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = reservationActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };

  const { developmentId, reservationId } = parsed.data;

  const reservationRaw = await prisma.developmentReservation.findFirst({
    where: { id: reservationId, organizationId: membership.organization.id },
    include: { DevelopmentLot: { select: { id: true, status: true, developmentId: true } } },
  });
  if (!reservationRaw) return { success: false, message: "Reserva no encontrada." };
  const reservation = {
    ...reservationRaw,
    lot: reservationRaw.DevelopmentLot,
  };
  // Multi-tenant: ensure reservation belongs to the requested development
  if (reservation.lot.developmentId !== developmentId) {
    return { success: false, message: "La reserva no corresponde a este desarrollo." };
  }
  if (reservation.status !== "PENDING_APPROVAL") {
    return { success: false, message: "La reserva no está pendiente de aprobación." };
  }

  await prisma.$transaction([
    prisma.developmentReservation.update({
      where: { id: reservationId },
      data: { status: "ACTIVE", approvedById: user.id, approvedAt: new Date() },
    }),
    prisma.developmentLot.update({
      where: { id: reservation.lotId },
      data: { status: "RESERVED" },
    }),
    prisma.developmentLotHistory.create({
      data: {
        lotId: reservation.lotId,
        organizationId: membership.organization.id,
        previousStatus: "RESERVED_PENDING",
        newStatus: "RESERVED",
        reason: "Reserva aprobada",
      },
    }),
  ]);

  revalidatePath(`/${orgSlug}/developments/${developmentId}`);
  return { success: true, message: "Reserva aprobada." };
}

export async function cancelReservationAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = reservationActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };

  const { developmentId, reservationId, reason } = parsed.data;

  const reservationRaw = await prisma.developmentReservation.findFirst({
    where: { id: reservationId, organizationId: membership.organization.id },
    include: { DevelopmentLot: { select: { id: true, status: true, developmentId: true } } },
  });
  if (!reservationRaw) return { success: false, message: "Reserva no encontrada." };
  const reservation = {
    ...reservationRaw,
    lot: reservationRaw.DevelopmentLot,
  };
  if (reservation.lot.developmentId !== developmentId) {
    return { success: false, message: "La reserva no corresponde a este desarrollo." };
  }
  if (reservation.status === "SOLD" || reservation.status === "CANCELLED") {
    return { success: false, message: "La reserva ya fue cancelada o vendida." };
  }

  const prevLotStatus = reservation.lot.status;

  await prisma.$transaction([
    prisma.developmentReservation.update({
      where: { id: reservationId },
      data: {
        status: "CANCELLED",
        cancelledById: user.id,
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
      },
    }),
    prisma.developmentLot.update({
      where: { id: reservation.lotId },
      data: { status: "AVAILABLE" },
    }),
    prisma.developmentLotHistory.create({
      data: {
        lotId: reservation.lotId,
        organizationId: membership.organization.id,
        previousStatus: prevLotStatus,
        newStatus: "AVAILABLE",
        reason: reason ?? "Reserva cancelada",
      },
    }),
  ]);

  revalidatePath(`/${orgSlug}/developments/${developmentId}`);
  return { success: true, message: "Reserva cancelada." };
}

export async function markLotSoldAction(
  orgSlug: string,
  input: unknown,
): Promise<ActionResult> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = reservationActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };

  const { developmentId, reservationId, reason } = parsed.data;

  const reservationRaw = await prisma.developmentReservation.findFirst({
    where: { id: reservationId, organizationId: membership.organization.id },
    include: { DevelopmentLot: { select: { id: true, status: true, developmentId: true } } },
  });
  if (!reservationRaw) return { success: false, message: "Reserva no encontrada." };
  const reservation = {
    ...reservationRaw,
    lot: reservationRaw.DevelopmentLot,
  };
  if (reservation.lot.developmentId !== developmentId) {
    return { success: false, message: "La reserva no corresponde a este desarrollo." };
  }
  if (reservation.status !== "ACTIVE") {
    return { success: false, message: "Solo se pueden vender reservas activas." };
  }

  await prisma.$transaction([
    prisma.developmentReservation.update({
      where: { id: reservationId },
      data: { status: "SOLD" },
    }),
    prisma.developmentLot.update({
      where: { id: reservation.lotId },
      data: { status: "SOLD" },
    }),
    prisma.developmentLotHistory.create({
      data: {
        lotId: reservation.lotId,
        organizationId: membership.organization.id,
        previousStatus: "RESERVED",
        newStatus: "SOLD",
        reason: reason ?? "Venta confirmada",
      },
    }),
  ]);

  revalidatePath(`/${orgSlug}/developments/${developmentId}`);
  return { success: true, message: "Lote marcado como vendido." };
}
