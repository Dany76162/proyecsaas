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
