import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { DevelopmentReservationStatus } from "@prisma/client";

// GET /api/developments/lots/[id]/reservation
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

    return NextResponse.json({ reservation: reservation ?? null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

// PUT /api/developments/lots/[id]/reservation — upsert reservation fields
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

    const reservationData = {
      buyerDni: body.buyerDni ?? null,
      buyerWhatsapp: body.buyerWhatsapp ?? null,
      paymentMethod: body.paymentMethod ?? null,
      paymentReference: body.paymentReference ?? null,
      totalPriceCents: body.totalPriceCents ?? null,
      downPaymentCents: body.downPaymentCents ?? null,
      installmentCount: body.installmentCount ?? null,
      installmentAmountCents: body.installmentAmountCents ?? null,
      firstDueDate: body.firstDueDate ? new Date(body.firstDueDate) : null,
      notes: body.notes ?? undefined,
    };

    // Also sync clientName on the lot when provided
    if (body.clientName !== undefined) {
      await prisma.developmentLot.update({
        where: { id },
        data: { clientName: body.clientName || null },
      });
    }

    const existing = await prisma.developmentReservation.findFirst({
      where: { lotId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    let reservation;
    if (existing) {
      reservation = await prisma.developmentReservation.update({
        where: { id: existing.id },
        data: reservationData,
      });
    } else {
      reservation = await prisma.developmentReservation.create({
        data: {
          ...reservationData,
          lotId: id,
          organizationId: lot.Development.organizationId,
          status: DevelopmentReservationStatus.ACTIVE,
        },
      });
    }

    return NextResponse.json({ reservation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
