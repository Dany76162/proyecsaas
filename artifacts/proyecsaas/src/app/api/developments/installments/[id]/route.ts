import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { DevelopmentInstallmentStatus } from "@prisma/client";

// ── PATCH /api/developments/installments/[id] ───────────────────────────────
// Mark an installment as PAID (with payment details) or revert to PENDING.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Resolve org via the installment → reservation → lot → development → org chain
    const installment = await prisma.developmentReservationInstallment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        Reservation: {
          select: {
            id: true,
            DevelopmentLot: {
              select: {
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

    const orgSlug = installment.Reservation.DevelopmentLot.Development.Organization.slug;
    await requireOrganizationMembership(orgSlug);

    const body = await request.json();
    const action: "pay" | "revert" = body.action;

    if (action !== "pay" && action !== "revert") {
      return NextResponse.json({ error: 'El campo action debe ser "pay" o "revert"' }, { status: 400 });
    }

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
      // revert → clear all payment fields
      updateData = {
        status: DevelopmentInstallmentStatus.PENDING,
        paidAt: null,
        paymentMethod: null,
        paymentReference: null,
        notes: null,
      };
    }

    const updated = await prisma.developmentReservationInstallment.update({
      where: { id },
      data: updateData,
    });

    // Return refreshed summary for the reservation
    const allInstallments = await prisma.developmentReservationInstallment.findMany({
      where: { reservationId: installment.Reservation.id },
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
      paidAmountCents: allInstallments.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amountCents, 0),
      pendingAmountCents: allInstallments.filter((i) => i.status !== "PAID").reduce((s, i) => s + i.amountCents, 0),
    };

    return NextResponse.json({ installment: updated, installments: allInstallments, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
