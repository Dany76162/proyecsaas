import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";

// PATCH /api/developments/[developmentId]
// Persiste campos de ubicación del mapa (mapCenterLat, mapCenterLng, mapZoom).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ developmentId: string }> }
) {
  try {
    const { developmentId } = await params;

    const dev = await prisma.development.findUnique({
      where: { id: developmentId },
      select: { Organization: { select: { slug: true } } },
    });

    if (!dev) {
      return NextResponse.json({ error: "Desarrollo no encontrado" }, { status: 404 });
    }

    await requireOrganizationMembership(dev.Organization.slug);

    const body = await request.json();

    const data: Record<string, any> = {};

    if (body.mapCenterLat != null) {
      const v = parseFloat(body.mapCenterLat);
      if (Number.isFinite(v)) data.mapCenterLat = v;
    }
    if (body.mapCenterLng != null) {
      const v = parseFloat(body.mapCenterLng);
      if (Number.isFinite(v)) data.mapCenterLng = v;
    }
    if (body.mapZoom != null) {
      const v = parseInt(body.mapZoom, 10);
      if (Number.isFinite(v)) data.mapZoom = v;
    }

    const ALLOWED_CURRENCIES = new Set([
      "ARS", "USD", "UYU", "CLP", "MXN", "COP", "PEN", "PYG", "BOB", "BRL",
    ]);

    if ("reservationCurrency" in body) {
      if (body.reservationCurrency === null || body.reservationCurrency === "") {
        data.reservationCurrency = null;
      } else if (
        typeof body.reservationCurrency === "string" &&
        ALLOWED_CURRENCIES.has(body.reservationCurrency.toUpperCase())
      ) {
        data.reservationCurrency = body.reservationCurrency.toUpperCase();
      }
    }

    for (let stage = 1; stage <= 5; stage++) {
      const key = `reservationAmountStage${stage}Cents`;
      if (key in body) {
        if (body[key] === null) {
          data[key] = null;
        } else {
          const v = parseInt(body[key], 10);
          if (Number.isFinite(v) && v >= 0) data[key] = v;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin campos válidos para actualizar" }, { status: 400 });
    }

    await prisma.development.update({ where: { id: developmentId }, data });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in PATCH /api/developments/[developmentId]:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
