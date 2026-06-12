import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import {
  DevelopmentInstallmentStatus,
  DevelopmentLotStatus,
  DevelopmentReservationStatus,
} from "@prisma/client";

// ── PATCH /api/developments/installments/[id] ───────────────────────────────
// Mark an installment as PAID (with payment details) or revert to PENDING.
// F-5: auto-transitions lot/reservation to SOLD when all active installments
// are PAID. Blocks revert if the operation is already SOLD.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Resolve org + collect status context for F-5 guards
    const installment = await prisma.developmentReservationInstallment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        Reservation: {
          select: {
            id: true,
            status: true,
            DevelopmentLot: {
              select: {
                id: true,
                status: true,
                organizationId: true,
                Development: {
                  select: {
                    Organization: { select: { slug: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!installment) {
      return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
    }

    const reservation = installment.Reservation;
    const lot = reservation.DevelopmentLot;
    const orgSlug = lot.Development.Organization.slug;
    await requireOrganizationMembership(orgSlug);

    const body = await request.json();
    const action: "pay" | "revert" = body.action;

    if (action !== "pay" && action !== "revert") {
      return NextResponse.json({ error: 'El campo action debe ser "pay" o "revert"' }, { status: 400 });
    }

    // ── F-5 guard: block revert if operation is already SOLD ─────────────────
    if (action === "revert") {
      const reservationSold = reservation.status === DevelopmentReservationStatus.SOLD;
      const lotSold = lot.status === DevelopmentLotStatus.SOLD;
      if (reservationSold || lotSold) {
        return NextResponse.json(
          {
            error:
              "No se puede revertir una cuota de una operación ya concretada. Contactar soporte.",
          },
          { status: 409 }
        );
      }
    }

    // ── Transactional update ──────────────────────────────────────────────────
    let finalLotStatus: DevelopmentLotStatus = lot.status as DevelopmentLotStatus;
    let finalReservationStatus: DevelopmentReservationStatus =
      reservation.status as DevelopmentReservationStatus;
    let allPaidTransition = false;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update the installment itself
      let updateData: Record<string, unknown>;
      if (action === "pay") {
        const paidAtRaw: string | null = body.paidAt ?? null;
        const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();
        updateData = {
          status: DevelopmentInstallmentStatus.PAID,
          paidAt,
          paymentMethod: body.paymentMethod ?? null,
          paymentReference: body.paymentReference ?? null,
          notes: body.notes ?? null,
        };
      } else {
        updateData = {
          status: DevelopmentInstallmentStatus.PENDING,
          paidAt: null,
          paymentMethod: null,
          paymentReference: null,
          notes: null,
        };
      }

      const updatedInstallment = await tx.developmentReservationInstallment.update({
        where: { id },
        data: updateData,
      });

      // 2. F-5: if action=pay, check whether all active installments are now PAID
      if (action === "pay") {
        const activeInstallments = await tx.developmentReservationInstallment.findMany({
          where: {
            reservationId: reservation.id,
            status: { not: DevelopmentInstallmentStatus.CANCELLED },
          },
          select: { status: true, amountCents: true },
        });

        const allPaid =
          activeInstallments.length > 0 &&
          activeInstallments.every((i) => i.status === DevelopmentInstallmentStatus.PAID);

        if (allPaid) {
          const previousLotStatus = lot.status as DevelopmentLotStatus;

          // Transition reservation → SOLD
          await tx.developmentReservation.update({
            where: { id: reservation.id },
            data: { status: DevelopmentReservationStatus.SOLD },
          });

          // Transition lot → SOLD
          await tx.developmentLot.update({
            where: { id: lot.id },
            data: { status: DevelopmentLotStatus.SOLD },
          });

          // History entry
          const paidCount = activeInstallments.length;
          await tx.developmentLotHistory.create({
            data: {
              lotId: lot.id,
              organizationId: lot.organizationId,
              previousStatus: previousLotStatus,
              newStatus: DevelopmentLotStatus.SOLD,
              reason: "Automático: todas las cuotas del plan pagadas",
              metadata: {
                reservationId: reservation.id,
                paidInstallments: paidCount,
                totalInstallments: paidCount,
              },
            },
          });

          finalLotStatus = DevelopmentLotStatus.SOLD;
          finalReservationStatus = DevelopmentReservationStatus.SOLD;
          allPaidTransition = true;
        }
      }

      return updatedInstallment;
    });

    // Re-fetch full installments list + compute summary outside the transaction
    const allInstallments = await prisma.developmentReservationInstallment.findMany({
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

    const summary = {
      totalInstallments: allInstallments.length,
      paidInstallments: allInstallments.filter((i) => i.status === "PAID").length,
      pendingInstallments: allInstallments.filter((i) => i.status === "PENDING").length,
      overdueInstallments: allInstallments.filter((i) => i.status === "OVERDUE").length,
      totalAmountCents: allInstallments.reduce((s, i) => s + i.amountCents, 0),
      paidAmountCents: allInstallments
        .filter((i) => i.status === "PAID")
        .reduce((s, i) => s + i.amountCents, 0),
      pendingAmountCents: allInstallments
        .filter((i) => i.status !== "PAID")
        .reduce((s, i) => s + i.amountCents, 0),
    };

    return NextResponse.json({
      installment: updated,
      installments: allInstallments,
      summary,
      lotStatus: finalLotStatus,
      reservationStatus: finalReservationStatus,
      allPaidTransition,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
