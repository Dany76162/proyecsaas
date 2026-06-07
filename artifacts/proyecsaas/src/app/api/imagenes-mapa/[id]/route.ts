import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { titulo, tipo, unidadId, altitudM, imageHeading, latOffset, lngOffset, planRotation, planScale, overlayMode, planCornerAdjustments, planCornersAbsolute } = body;

    let overlayConfig: any = undefined;
    if (overlayMode !== undefined || planCornerAdjustments !== undefined || planCornersAbsolute !== undefined) {
      overlayConfig = { overlayMode, planCornerAdjustments, planCornersAbsolute };
    }

    const updateData: any = {};
    if (titulo !== undefined) updateData.titulo = titulo || null;
    if (tipo !== undefined) updateData.tipo = tipo;
    if (unidadId !== undefined) updateData.unidadId = unidadId || null;
    if (altitudM !== undefined) updateData.altitudM = altitudM || null;
    if (imageHeading !== undefined) updateData.imageHeading = imageHeading || null;
    if (latOffset !== undefined) updateData.latOffset = latOffset || null;
    if (lngOffset !== undefined) updateData.lngOffset = lngOffset || null;
    if (planRotation !== undefined) updateData.planRotation = planRotation || null;
    if (planScale !== undefined) updateData.planScale = planScale || null;
    if (overlayConfig !== undefined) updateData.overlayConfig = overlayConfig;

    const updatedItem = await prisma.developmentMapImage.update({
      where: { id },
      data: updateData,
      include: {
        DevelopmentLot: {
          select: { id: true, lotNumber: true },
        },
      },
    });

    let configObj = {};
    if (updatedItem.overlayConfig) {
      try { configObj = typeof updatedItem.overlayConfig === "string" ? JSON.parse(updatedItem.overlayConfig) : updatedItem.overlayConfig; } catch (e) {}
    }

    const formattedItem = {
      ...updatedItem,
      ...configObj,
      overlayConfig: undefined,
      unidad: updatedItem.DevelopmentLot ? { id: updatedItem.DevelopmentLot.id, numero: updatedItem.DevelopmentLot.lotNumber } : null,
    };

    return NextResponse.json({ success: true, item: formattedItem });
  } catch (error: any) {
    console.error("[PUT imagenes-mapa] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar la imagen" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.developmentMapImage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE imagenes-mapa] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar la imagen" },
      { status: 500 }
    );
  }
}
