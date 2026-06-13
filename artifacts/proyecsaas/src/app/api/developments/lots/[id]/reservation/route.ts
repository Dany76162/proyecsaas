import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { DevelopmentReservationStatus, DevelopmentInstallmentStatus, DevelopmentLotStatus } from "@prisma/client";
import { markOverdueInstallments } from "@/modules/developments/installments";

// ── Helper ───────────────────────────────────────────────────────────────────
// Adds `months` to `date` preserving the original day-of-month.
// Clamps to the last day of the target month when needed (e.g. Jan 31 + 1 → Feb 28).
function addMonthsPreserveDay(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();
  const targetMonth = month + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  return new Date(targetYear, normalizedMonth, Math.min(day, lastDay), 12, 0, 0);
}

// ── GET /api/developments/lots/[id]/reservation ──────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lotCheck = await prisma.developmentLot.findUnique({
      where: { id },
      select: { Development: { select: { Organization: { select: { slug: true } } } } },
    });
    if (!lotCheck) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });

    await requireOrganizationMembership(lotCheck.Development.Organization.slug);

    const reservation = await prisma.developmentReservation.findFirst({
      where: { lotId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        buyerDni: true,
        buyerWhatsapp: true,
        paymentMethod: true,
        paymentReference: true,
        totalPriceCents: true,
        downPaymentCents: true,
        installmentCount: true,
        installmentAmountCents: true,
        firstDueDate: true,
        notes: true,
      },
    });

    if (!reservation) {
      return NextResponse.json({ reservation: null, installments: [], summary: null });
    }

    // F-7: on-demand OVERDUE transition before reading installments
    await markOverdueInstallments(reservation.id);

    // Re-fetch installments after potential OVERDUE update so summary is fresh
    const freshInstallments = await prisma.developmentReservationInstallment.findMany({
      where: { reservationId: reservation.id },
      orderBy: { installmentNumber: "asc" },
      select: {
        id: true,
        installmentNumber: true,
        dueDate: true,
        amountCents: true,
        currency: true,
        status: true,
        paidAt: true,
        paymentMethod: true,
        paymentReference: true,
      },
    });

    const reservationData = reservation;
    const installments = freshInstallments;

    const summary =
      installments.length > 0
        ? {
            totalInstallments: installments.length,
            paidInstallments: installments.filter((i) => i.status === "PAID").length,
            pendingInstallments: installments.filter((i) => i.status === "PENDING").length,
            overdueInstallments: installments.filter((i) => i.status === "OVERDUE").length,
            totalAmountCents: installments.reduce((s, i) => s + i.amountCents, 0),
            paidAmountCents: installments
              .filter((i) => i.status === "PAID")
              .reduce((s, i) => s + i.amountCents, 0),
            pendingAmountCents: installments
              .filter((i) => i.status !== "PAID")
              .reduce((s, i) => s + i.amountCents, 0),
          }
        : null;

    return NextResponse.json({ reservation: reservationData, installments, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

// ── PUT /api/developments/lots/[id]/reservation ──────────────────────────────
// Upserts reservation fields and, when a complete plan is provided, generates
// real installment rows in DevelopmentReservationInstallment.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lot = await prisma.developmentLot.findUnique({
      where: { id },
      include: { Development: { include: { Organization: true } } },
    });
    if (!lot) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });

    await requireOrganizationMembership(lot.Development.Organization.slug);

    const body = await request.json();

    const totalPriceCents: number | null = body.totalPriceCents ?? null;
    const downPaymentCents: number | null = body.downPaymentCents ?? null;
    const installmentCount: number | null = body.installmentCount ?? null;
    const firstDueDateRaw: string | null = body.firstDueDate ?? null;
    const firstDueDate: Date | null = firstDueDateRaw ? new Date(firstDueDateRaw) : null;

    const organizationId = lot.Development.organizationId;
    const currency = lot.currency || "USD";

    // Determine whether the full plan data is present to generate installments
    const shouldGenerate =
      totalPriceCents !== null &&
      downPaymentCents !== null &&
      installmentCount !== null &&
      installmentCount > 0 &&
      firstDueDate !== null;

    // Validate saldo before touching the DB
    let saldoCents = 0;
    if (shouldGenerate) {
      saldoCents = totalPriceCents! - downPaymentCents!;
      if (saldoCents <= 0) {
        return NextResponse.json(
          {
            error:
              "El anticipo no puede ser mayor o igual al precio total para generar cuotas.",
          },
          { status: 400 }
        );
      }
    }

    // Find existing reservation (most recent for this lot)
    const existing = await prisma.developmentReservation.findFirst({
      where: { lotId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    // Guard: block regeneration if any installment is already PAID
    if (shouldGenerate && existing) {
      const paidCount = await prisma.developmentReservationInstallment.count({
        where: { reservationId: existing.id, status: DevelopmentInstallmentStatus.PAID },
      });
      if (paidCount > 0) {
        return NextResponse.json(
          {
            error:
              "No se puede regenerar el plan porque ya hay cuotas pagadas. Crear una refinanciación será una etapa posterior.",
          },
          { status: 409 }
        );
      }
    }

    const reservationData = {
      buyerDni: body.buyerDni ?? null,
      buyerWhatsapp: body.buyerWhatsapp ?? null,
      paymentMethod: body.paymentMethod ?? null,
      paymentReference: body.paymentReference ?? null,
      totalPriceCents,
      downPaymentCents,
      installmentCount,
      installmentAmountCents: body.installmentAmountCents ?? null,
      firstDueDate,
      notes: body.notes ?? undefined,
    };

    // Pre-calculate installment rows
    let newRows: {
      installmentNumber: number;
      dueDate: Date;
      amountCents: number;
      currency: string;
      status: DevelopmentInstallmentStatus;
      organizationId: string;
    }[] = [];

    if (shouldGenerate) {
      const base = Math.floor(saldoCents / installmentCount!);
      const residuo = saldoCents - base * installmentCount!;
      newRows = Array.from({ length: installmentCount! }, (_, i) => ({
        installmentNumber: i + 1,
        dueDate: addMonthsPreserveDay(firstDueDate!, i),
        amountCents: i === installmentCount! - 1 ? base + residuo : base,
        currency,
        status: DevelopmentInstallmentStatus.PENDING,
        organizationId,
      }));
    }

    // ── Transaction ──────────────────────────────────────────────────────────
    let reservation: any;
    let generatedInstallments: any[] = [];
    let lotTransitioned = false;
    const previousLotStatus = lot.status;

    await prisma.$transaction(async (tx) => {
      // Sync clientName on the lot
      if (body.clientName !== undefined) {
        await tx.developmentLot.update({
          where: { id },
          data: { clientName: body.clientName || null },
        });
      }

      // Upsert reservation
      if (existing) {
        reservation = await tx.developmentReservation.update({
          where: { id: existing.id },
          data: reservationData,
        });
      } else {
        reservation = await tx.developmentReservation.create({
          data: {
            ...reservationData,
            lotId: id,
            organizationId,
            status: DevelopmentReservationStatus.ACTIVE,
          },
        });
      }

      // ── F-5: Auto-transition lot AVAILABLE / RESERVED_PENDING → RESERVED ──
      const escalatableLotStatuses: DevelopmentLotStatus[] = [
        DevelopmentLotStatus.AVAILABLE,
        DevelopmentLotStatus.RESERVED_PENDING,
      ];
      if (escalatableLotStatuses.includes(lot.status as DevelopmentLotStatus)) {
        await tx.developmentLot.update({
          where: { id },
          data: { status: DevelopmentLotStatus.RESERVED },
        });
        await tx.developmentLotHistory.create({
          data: {
            lotId: id,
            organizationId,
            previousStatus: lot.status as DevelopmentLotStatus,
            newStatus: DevelopmentLotStatus.RESERVED,
            reason: "Reserva comercial registrada por administrador",
            metadata: { reservationId: reservation.id },
          },
        });
        lotTransitioned = true;
      }

      if (shouldGenerate && newRows.length > 0) {
        // Delete existing non-paid installments (PENDING, OVERDUE, CANCELLED)
        await tx.developmentReservationInstallment.deleteMany({
          where: {
            reservationId: reservation.id,
            status: { notIn: [DevelopmentInstallmentStatus.PAID] },
          },
        });

        // Create new installments
        await tx.developmentReservationInstallment.createMany({
          data: newRows.map((row) => ({ ...row, reservationId: reservation.id })),
        });

        generatedInstallments = await tx.developmentReservationInstallment.findMany({
          where: { reservationId: reservation.id },
          orderBy: { installmentNumber: "asc" },
        });
      }
    });

    return NextResponse.json({
      reservation,
      installmentsGenerated: generatedInstallments.length,
      installments: generatedInstallments,
      lotStatus: lotTransitioned ? DevelopmentLotStatus.RESERVED : lot.status,
      lotStatusChanged: lotTransitioned,
      previousLotStatus: lotTransitioned ? previousLotStatus : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
