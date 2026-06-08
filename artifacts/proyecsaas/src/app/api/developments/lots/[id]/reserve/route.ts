import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { createMercadoPagoPreference } from "@/server/billing/mercadopago";
import { LeadStatus, DevelopmentLotStatus } from "@prisma/client";

// POST /api/developments/lots/[id]/reserve
//
// Flow (centralized Raíces Pilot payment model):
//   1. Validate lot availability and public visibility.
//   2. Find or create Lead.
//   3. Create DevelopmentReservation (PENDING_APPROVAL) — lot still AVAILABLE.
//   4. Attempt Mercado Pago preference creation.
//      → On failure: cancel reservation, lot stays AVAILABLE, return 503.
//      → On success: lock lot to RESERVED_PENDING, create history, notify workspace.
//   5. Return checkoutUrl to client.
//
// Payment for reservations goes to the centralized Raíces Pilot Mercado Pago account.
// Inmobiliarias/desarrolladoras do NOT connect their own MP accounts.
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

    // Guard: fail fast if the app URL is not configured — back_urls would be invalid.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!appUrl) {
      console.error("[reserve] NEXT_PUBLIC_APP_URL is not configured — cannot build Mercado Pago back_urls");
      return NextResponse.json(
        { error: "Error de configuración del servidor. Por favor, intentá más tarde." },
        { status: 500 }
      );
    }

    // 1. Get the lot and validate availability
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

    // Anti-spam: bloquear doble reserva del mismo email para el mismo lote
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

    // 3. Create DevelopmentReservation — lot is still AVAILABLE at this point.
    //    expiresAt gives the client a 48-hour window to complete the payment.
    //    TODO (Fase 2): trigger a cleanup job to release expired PENDING_APPROVAL reservations.
    // Monto de seña transitorio. TODO (Fase 2): leer desde Development.depositCents cuando se agregue el campo.
    const DEFAULT_LOT_RESERVATION_DEPOSIT_CENTS = 1_000_000; // $10.000 ARS
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const reservation = await prisma.developmentReservation.create({
      data: {
        lotId: id,
        organizationId,
        leadId: lead.id,
        status: "PENDING_APPROVAL",
        depositCents: DEFAULT_LOT_RESERVATION_DEPOSIT_CENTS,
        expiresAt,
        notes: "Reserva en vivo iniciada por el cliente",
      },
    });

    // 4. Attempt Mercado Pago preference BEFORE locking the lot.
    //    If MP fails for any reason (network, token, API error), the lot stays AVAILABLE
    //    and the reservation is cancelled — no permanent inventory corruption.
    const backSuccessUrl = `${appUrl}/cat/${lot.development.organization.slug}/developments/${lot.developmentId}?reserved=true&lot=${lot.lotNumber}`;

    let preference: { checkoutUrl: string; preferenceId: string };
    try {
      preference = await createMercadoPagoPreference({
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
    } catch (mpError: any) {
      // MP failed — cancel the reservation so the lot remains AVAILABLE for other buyers.
      await prisma.developmentReservation
        .update({
          where: { id: reservation.id },
          data: {
            status: "CANCELLED",
            cancelReason: "Error al generar preferencia de Mercado Pago",
            cancelledAt: new Date(),
          },
        })
        .catch((cancelErr) =>
          console.error("[reserve] Could not cancel reservation after MP failure:", cancelErr)
        );

      console.error(
        "[reserve] Mercado Pago preference failed — reservation cancelled, lot remains AVAILABLE:",
        mpError?.message
      );
      return NextResponse.json(
        { error: "No se pudo inicializar el proceso de pago. Por favor, intentá nuevamente en unos minutos." },
        { status: 503 }
      );
    }

    // 5. MP succeeded — persist payment tracking fields on the reservation.
    //    commissionCents = 0 and netAmountCents = grossAmountCents until commercial
    //    policy is configured per development (Fase 3).
    await prisma.developmentReservation.update({
      where: { id: reservation.id },
      data: {
        mpPreferenceId: preference.preferenceId,
        mpCurrency: "ARS",
        grossAmountCents: DEFAULT_LOT_RESERVATION_DEPOSIT_CENTS,
        commissionCents: 0,
        netAmountCents: DEFAULT_LOT_RESERVATION_DEPOSIT_CENTS,
      },
    });

    // 6. Lock the lot as RESERVED_PENDING
    await prisma.developmentLot.update({
      where: { id },
      data: { status: DevelopmentLotStatus.RESERVED_PENDING },
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

    // 7. Notify workspace — non-blocking, must never fail the response.
    try {
      await prisma.notification.create({
        data: {
          organizationId,
          type: "OPERATOR_ACTION_REQUIRED",
          title: `Nueva solicitud de reserva: Lote ${lot.lotNumber}`,
          body: `${nombre} solicitó reservar el Lote ${lot.lotNumber} en ${lot.development.name}. Aguardando confirmación de pago.`,
          link: `/${lot.development.organization.slug}/developments/${lot.developmentId}`,
          entityType: "developmentReservation",
          entityId: reservation.id,
        },
      });
    } catch (notifError) {
      console.error("[reserve] Workspace notification failed (non-blocking):", notifError);
    }

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
