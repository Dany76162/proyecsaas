import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { extractBlueprintMeta } from "@/modules/developments/blueprint-utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ developmentId: string }> }
) {
  try {
    const { developmentId } = await params;

    // Step 1: Fetch only org slug to validate membership BEFORE reading SVG or lot data.
    const devCheck = await prisma.development.findUnique({
      where: { id: developmentId },
      select: { Organization: { select: { slug: true } } },
    });

    if (!devCheck) {
      return NextResponse.json({ error: "Desarrollo no encontrado" }, { status: 404 });
    }

    // Step 2: Enforce tenant membership BEFORE reading masterplanSVG or lot geometry.
    await requireOrganizationMembership(devCheck.Organization.slug);

    // Step 3: Membership confirmed — now fetch full data.
    const developmentRaw = await prisma.development.findUnique({
      where: { id: developmentId },
      select: {
        masterplanSVG: true,
        Organization: {
          select: {
            slug: true,
          },
        },
        DevelopmentLot: {
          select: {
            id: true,
            lotNumber: true,
            areaSqm: true,
            priceCents: true,
            status: true,
            pathData: true,
            centerX: true,
            centerY: true,
            frontMeters: true,
            backMeters: true,
            DevelopmentReservation: {
              where: { status: "PENDING_APPROVAL" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { expiresAt: true },
            },
          },
          orderBy: { lotNumber: "asc" },
        },
      },
    });

    if (!developmentRaw) {
      return NextResponse.json({ error: "Desarrollo no encontrado" }, { status: 404 });
    }

    const unidades = developmentRaw.DevelopmentLot.map((lot) => ({
      id: lot.id,
      numero: lot.lotNumber,
      superficie: lot.areaSqm,
      precio: lot.priceCents ? lot.priceCents / 100 : null,
      estado: lot.status,
      frente: lot.frontMeters,
      fondo: lot.backMeters,
      coordenadasMasterplan: JSON.stringify({
        path: lot.pathData,
        center: { x: lot.centerX, y: lot.centerY },
      }),
      // Present only for RESERVED_PENDING lots: expiry of the pending payment window.
      reservationExpiresAt: lot.DevelopmentReservation[0]?.expiresAt?.toISOString() ?? null,
    }));

    const blueprintMeta = extractBlueprintMeta(developmentRaw.masterplanSVG);

    return NextResponse.json({
      masterplanSVG: developmentRaw.masterplanSVG ?? null,
      blueprintMeta,
      hasDetectedLots: blueprintMeta?.processingMode === "detected-lots" && unidades.length > 0,
      unidades,
    });
  } catch (error: any) {
    console.error("Error in GET /api/developments/[id]/blueprint:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
