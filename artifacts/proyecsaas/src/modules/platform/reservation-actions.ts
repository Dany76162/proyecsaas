"use server";

import { revalidatePath } from "next/cache";
import { ReservationSettlementStatus } from "@prisma/client";
import { z } from "zod";

import type { ActionResult } from "@/modules/types";
import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { logAudit } from "@/server/audit/log";

const RESERVATIONS_PATH = "/platform/billing/reservations";

// ── Schemas ───────────────────────────────────────────────────────────────────

const registerSettlementSchema = z.object({
  reservationId: z.string().min(1, "ID de reserva inválido."),
  settlementReference: z
    .string()
    .trim()
    .min(2, "La referencia de transferencia es requerida.")
    .max(200, "La referencia no puede superar 200 caracteres."),
  settlementNotes: z.string().trim().max(1000).optional(),
});

const updateSettlementStatusSchema = z.object({
  reservationId: z.string().min(1, "ID de reserva inválido."),
  newStatus: z.enum(["IN_REVIEW", "HELD"], {
    errorMap: () => ({ message: "Estado de liquidación inválido." }),
  }),
  notes: z.string().trim().max(1000).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchReservationForSettlement(reservationId: string) {
  return prisma.developmentReservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      status: true,
      mpPaymentId: true,
      grossAmountCents: true,
      netAmountCents: true,
      settlementStatus: true,
      organizationId: true,
      lotId: true,
    },
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Registrar liquidación manual a la desarrolladora.
 * Solo disponible para Superadmin.
 * La reserva debe tener pago confirmado (status ACTIVE + mpPaymentId).
 */
export async function registerSettlementAction(input: unknown): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const parsed = registerSettlementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors[0]?.message ?? "Datos inválidos.",
    };
  }

  const { reservationId, settlementReference, settlementNotes } = parsed.data;

  const reservation = await fetchReservationForSettlement(reservationId);

  if (!reservation) {
    return { success: false, message: "Reserva no encontrada." };
  }

  // ── Validaciones de seguridad ───────────────────────────────────────────────
  if (reservation.status !== "ACTIVE") {
    return {
      success: false,
      message:
        "Solo se pueden liquidar reservas con pago confirmado (estado Activa).",
    };
  }

  if (!reservation.mpPaymentId) {
    return {
      success: false,
      message:
        "La reserva no tiene pago registrado en Mercado Pago. Verificá el estado antes de liquidar.",
    };
  }

  if (!reservation.grossAmountCents || !reservation.netAmountCents) {
    return {
      success: false,
      message:
        "La reserva no tiene montos registrados. Verificá los datos antes de liquidar.",
    };
  }

  if (reservation.settlementStatus === "SETTLED") {
    return {
      success: false,
      message:
        "Esta reserva ya fue liquidada. Para registrar una corrección, contactá al equipo técnico.",
    };
  }

  if (reservation.settlementStatus === "REFUNDED") {
    return {
      success: false,
      message:
        "Esta reserva fue marcada como devuelta al comprador. No se puede liquidar.",
    };
  }

  // ── Guardar ────────────────────────────────────────────────────────────────
  await prisma.developmentReservation.update({
    where: { id: reservationId },
    data: {
      settlementStatus: ReservationSettlementStatus.SETTLED,
      settledAt: new Date(),
      settlementReference,
      settlementNotes: settlementNotes ?? null,
      settledById: admin.id,
    },
  });

  await logAudit({
    event: "reservation.settlement_registered",
    actorId: admin.id,
    actorEmail: admin.email,
    entityType: "DevelopmentReservation",
    entityId: reservationId,
    entityName: reservation.lotId,
    metadata: {
      settlementReference,
      settlementNotes: settlementNotes ?? null,
      grossAmountCents: reservation.grossAmountCents,
      netAmountCents: reservation.netAmountCents,
      organizationId: reservation.organizationId,
      source: "superadmin-manual",
    },
  });

  revalidatePath(RESERVATIONS_PATH);

  return { success: true, message: "Liquidación registrada correctamente." };
}

/**
 * Actualizar estado de liquidación a IN_REVIEW o HELD.
 * No permite revertir una liquidación ya registrada.
 */
export async function updateSettlementStatusAction(input: unknown): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const parsed = updateSettlementStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors[0]?.message ?? "Datos inválidos.",
    };
  }

  const { reservationId, newStatus, notes } = parsed.data;

  const reservation = await fetchReservationForSettlement(reservationId);

  if (!reservation) {
    return { success: false, message: "Reserva no encontrada." };
  }

  if (reservation.status !== "ACTIVE") {
    return {
      success: false,
      message: "Solo se puede actualizar el estado de reservas con pago confirmado.",
    };
  }

  if (reservation.settlementStatus === "SETTLED") {
    return {
      success: false,
      message: "No se puede modificar el estado de una liquidación ya registrada.",
    };
  }

  await prisma.developmentReservation.update({
    where: { id: reservationId },
    data: {
      settlementStatus: newStatus as ReservationSettlementStatus,
      settlementNotes: notes ?? undefined,
    },
  });

  await logAudit({
    event: "reservation.settlement_status_updated",
    actorId: admin.id,
    actorEmail: admin.email,
    entityType: "DevelopmentReservation",
    entityId: reservationId,
    entityName: reservation.lotId,
    metadata: {
      previousStatus: reservation.settlementStatus,
      newStatus,
      notes: notes ?? null,
      source: "superadmin-manual",
    },
  });

  revalidatePath(RESERVATIONS_PATH);

  return { success: true, message: "Estado de liquidación actualizado." };
}
