import { NextResponse } from "next/server";
import { MembershipRole } from "@prisma/client";

import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ developmentId: string }> }
) {
  try {
    const { developmentId } = await params;

    // Step 1: Fetch only org slug to validate membership before reading any data.
    const devCheck = await prisma.development.findUnique({
      where: { id: developmentId },
      select: { Organization: { select: { slug: true } } },
    });

    if (!devCheck) {
      return NextResponse.json({ success: false, error: "Desarrollo no encontrado" }, { status: 404 });
    }

    // Step 2: Enforce tenant membership.
    await requireOrganizationMembership(devCheck.Organization.slug);

    // Step 3: Membership confirmed — now fetch images.
    const items = await prisma.developmentMapImage.findMany({
      where: { developmentId },
      orderBy: { orden: "asc" },
      include: {
        DevelopmentLot: {
          select: { id: true, lotNumber: true },
        },
      },
    });

    const formattedItems = items.map(item => {
      let configObj = {};
      if (item.overlayConfig) {
        try { configObj = typeof item.overlayConfig === "string" ? JSON.parse(item.overlayConfig) : item.overlayConfig; } catch (e) {}
      }
      return {
        ...item,
        ...configObj,
        overlayConfig: undefined,
        unidad: item.DevelopmentLot ? { id: item.DevelopmentLot.id, numero: item.DevelopmentLot.lotNumber } : null,
      };
    });

    return NextResponse.json({ success: true, items: formattedItems });
  } catch (error: any) {
    console.error("[GET imagenes-mapa] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar las imágenes" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ developmentId: string }> }
) {
  try {
    const { developmentId } = await params;

    // Step 1: Fetch only org slug to validate membership before writing.
    const devCheck = await prisma.development.findUnique({
      where: { id: developmentId },
      select: { Organization: { select: { slug: true } } },
    });

    if (!devCheck) {
      return NextResponse.json({ success: false, error: "Desarrollo no encontrado" }, { status: 404 });
    }

    // Step 2: Enforce tenant membership + minimum role for write operations.
    const { membership } = await requireOrganizationMembership(devCheck.Organization.slug);
    assertMinimumRole(membership.role, MembershipRole.AGENT);

    // Step 3: Membership confirmed — parse body and create image.
    const body = await req.json();

    const { url, tipo, titulo, lat, lng, unidadId, altitudM, imageHeading, overlayMode, planCornerAdjustments, planCornersAbsolute } = body;

    let overlayConfig: any = undefined;
    if (overlayMode !== undefined || planCornerAdjustments !== undefined || planCornersAbsolute !== undefined) {
      overlayConfig = { overlayMode, planCornerAdjustments, planCornersAbsolute };
    }

    const newItem = await prisma.developmentMapImage.create({
      data: {
        id: crypto.randomUUID(),
        developmentId,
        url,
        tipo,
        titulo: titulo || null,
        lat,
        lng,
        unidadId: unidadId || null,
        altitudM: altitudM || null,
        imageHeading: imageHeading || null,
        updatedAt: new Date(),
        ...(overlayConfig && { overlayConfig }),
      },
      include: {
        DevelopmentLot: {
          select: { id: true, lotNumber: true },
        },
      },
    });

    let configObj = {};
    if (newItem.overlayConfig) {
      try { configObj = typeof newItem.overlayConfig === "string" ? JSON.parse(newItem.overlayConfig) : newItem.overlayConfig; } catch (e) {}
    }

    const formattedItem = {
      ...newItem,
      ...configObj,
      overlayConfig: undefined,
      unidad: newItem.DevelopmentLot ? { id: newItem.DevelopmentLot.id, numero: newItem.DevelopmentLot.lotNumber } : null,
    };

    return NextResponse.json({ success: true, item: formattedItem });
  } catch (error: any) {
    console.error("[POST imagenes-mapa] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al guardar la imagen" },
      { status: 500 }
    );
  }
}
