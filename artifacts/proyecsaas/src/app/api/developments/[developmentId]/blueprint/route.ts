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

// DELETE /api/developments/[developmentId]/blueprint
// Elimina definitivamente el plano y todos los datos derivados:
// lotes detectados, calibración del mapa (overlayBounds/overlayRotation) y masterplanSVG.
// Protege contra eliminación si existen reservas activas o lotes vendidos.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ developmentId: string }> }
) {
  try {
    const { developmentId } = await params;

    // Step 1: Fetch org slug to enforce membership BEFORE touching any data.
    const devCheck = await prisma.development.findUnique({
      where: { id: developmentId },
      select: { organizationId: true, Organization: { select: { slug: true } } },
    });

    if (!devCheck) {
      return NextResponse.json({ error: "Desarrollo no encontrado" }, { status: 404 });
    }

    await requireOrganizationMembership(devCheck.Organization.slug);

    // Step 2: Verificar que no haya lotes con reservas activas o ventas reales.
    const blockingLots = await prisma.developmentLot.findMany({
      where: {
        developmentId,
        OR: [
          { status: { in: ["RESERVED", "RESERVED_PENDING", "SOLD"] } },
          {
            DevelopmentReservation: {
              some: { status: { in: ["PENDING_APPROVAL", "ACTIVE"] } },
            },
          },
        ],
      },
      select: { lotNumber: true, status: true },
    });

    if (blockingLots.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el plano porque existen reservas o ventas asociadas. " +
            "Cancelá o resolvé esas operaciones antes de reemplazar el plano.",
          blockingLots: blockingLots.map((l) => ({
            lotNumber: l.lotNumber,
            status: l.status,
          })),
        },
        { status: 409 }
      );
    }

    // Step 3: Obtener IDs de lotes para eliminar sus dependencias.
    const lots = await prisma.developmentLot.findMany({
      where: { developmentId },
      select: { id: true },
    });
    const lotIds = lots.map((l) => l.id);

    // Step 4: Transacción atómica — eliminar derivados, luego limpiar campos en Development.
    await prisma.$transaction([
      // 4a. Historiales de lotes
      prisma.developmentLotHistory.deleteMany({ where: { lotId: { in: lotIds } } }),
      // 4b. Reservas de lotes (deberían ser 0 por la guarda del paso 2, pero por seguridad)
      prisma.developmentReservation.deleteMany({ where: { lotId: { in: lotIds } } }),
      // 4c. Lotes
      prisma.developmentLot.deleteMany({ where: { developmentId } }),
      // 4d. Limpiar campos del plano en Development
      prisma.development.update({
        where: { id: developmentId },
        data: {
          masterplanSVG: null,
          masterplanSourceUrl: null,
          masterplanSourceKind: null,
          overlayBounds: null,
          overlayRotation: 0,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/developments/[id]/blueprint:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
