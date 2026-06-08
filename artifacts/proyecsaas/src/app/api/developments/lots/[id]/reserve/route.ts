import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { createMercadoPagoPreference } from "@/server/billing/mercadopago";
import { LeadStatus, DevelopmentLotStatus } from "@prisma/client";

// POST /api/developments/lots/[id]/reserve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, email, telefono } = body;

    if (!nombre || !email || !telefono) {
      return NextResponse.json(
        { error: "Nombre, email y teléfono son requeridos." },
        { status: 400 }
      );
    }

    // 1. Get the lot and check availability
    const lotRaw = await prisma.developmentLot.findUnique({
      where: { id },
      include: {
        Development: {
          include: {
            Organization: true,
          },
        },
      },
    });

    if (!lotRaw) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    const lot = {
      ...lotRaw,
      development: {
        ...lotRaw.Development,
        organization: lotRaw.Development.Organization,
      },
    };

    // Validaciones de acceso público: el desarrollo debe ser visible, activo y la org activa
    if (!lot.development.publicVisible) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }
    if (lot.development.status !== "ACTIVE") {
      return NextResponse.json({ error: "El desarrollo no está disponible." }, { status: 400 });
    }
    if (!lot.development.organization.isActive) {
      return NextResponse.json({ error: "El desarrollo no está disponible." }, { status: 400 });
    }

    if (lot.status !== DevelopmentLotStatus.AVAILABLE) {
      return NextResponse.json(
        { error: "El lote ya no está disponible para reserva." },
        { status: 400 }
      );
    }

    // Anti-spam: verificar si ya existe una reserva pendiente para el mismo lote con el mismo email
    const existingReservation = await prisma.developmentReservation.findFirst({
      where: {
        lotId: id,
        Lead: { email },
        status: { in: ["PENDING_APPROVAL", "ACTIVE"] },
      },
    });
    if (existingReservation) {
      return NextResponse.json(
        { error: "Ya existe una reserva pendiente para este lote con ese email." },
        { status: 409 }
      );
    }

    const organizationId = lot.organizationId;

    // 2. Find or create the Lead
    let lead = await prisma.lead.findFirst({
      where: {
        organizationId,
        OR: [
          { email },
          { phone: telefono },
        ],
      },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          organizationId,
          fullName: nombre,
          email,
          phone: telefono,
          source: "MASTERPLAN_PUBLICO",
          status: LeadStatus.NEW,
        },
      });
    }

    // 3. Create a DevelopmentReservation
    // Monto transitorio hasta habilitar configuración por desarrollo.
    // TODO (futuro): leer depositCents desde Development.depositCents cuando se agregue el campo.
    const DEFAULT_LOT_RESERVATION_DEPOSIT_CENTS = 1_000_000; // $10.000 ARS
    const reservation = await prisma.developmentReservation.create({
      data: {
        lotId: id,
        organizationId,
        leadId: lead.id,
        status: "PENDING_APPROVAL",
        depositCents: DEFAULT_LOT_RESERVATION_DEPOSIT_CENTS,
        notes: "Reserva en vivo iniciada por el cliente",
      },
    });

    // 4. Update lot status to RESERVED_PENDING to lock it temporarily (give "security" to client)
    await prisma.developmentLot.update({
      where: { id },
      data: {
        status: DevelopmentLotStatus.RESERVED_PENDING,
      },
    });

    await prisma.developmentLotHistory.create({
      data: {
        lotId: id,
        organizationId,
        previousStatus: DevelopmentLotStatus.AVAILABLE,
        newStatus: DevelopmentLotStatus.RESERVED_PENDING,
        reason: "Reserva iniciada por el cliente (pendiente de pago)",
      },
    });

    // 5. Generate Mercado Pago preference URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:25195";
    const backSuccessUrl = `${appUrl}/cat/${lot.development.organization.slug}/developments/${lot.developmentId}?reserved=true&lot=${lot.lotNumber}`;

    const preference = await createMercadoPagoPreference({
      title: `Reserva Lote ${lot.lotNumber} - ${lot.development.name}`,
      amountARS: DEFAULT_LOT_RESERVATION_DEPOSIT_CENTS / 100,
      externalReference: reservation.id,
      payerEmail: email,
      backUrls: {
        success: backSuccessUrl,
        failure: backSuccessUrl,
        pending: backSuccessUrl,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: preference.checkoutUrl,
      reservationId: reservation.id,
    });
  } catch (error: any) {
    console.error("[reserve] Failed to process reservation:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar la reserva" },
      { status: 500 }
    );
  }
}
