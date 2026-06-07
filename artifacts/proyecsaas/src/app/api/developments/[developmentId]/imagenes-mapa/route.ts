import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ developmentId: string }> }
) {
  try {
    const { developmentId } = await params;
    
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
