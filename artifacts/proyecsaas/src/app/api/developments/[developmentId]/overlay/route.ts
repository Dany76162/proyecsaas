import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";

type LatLngTuple = [number, number];
type QuadCorners = [LatLngTuple, LatLngTuple, LatLngTuple, LatLngTuple];

function parseOverlayBounds(raw: string | null): {
  bounds: [LatLngTuple, LatLngTuple] | null;
  corners: QuadCorners | null;
} {
  if (!raw) {
    return { bounds: null, corners: null };
  }

  try {
    const parsed = JSON.parse(raw);

    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      Array.isArray(parsed[0]) &&
      Array.isArray(parsed[1])
    ) {
      return { bounds: parsed as [LatLngTuple, LatLngTuple], corners: null };
    }

    if (parsed && typeof parsed === "object") {
      const bounds = Array.isArray(parsed.bounds) ? (parsed.bounds as [LatLngTuple, LatLngTuple]) : null;
      const corners = Array.isArray(parsed.corners) ? (parsed.corners as QuadCorners) : null;
      return { bounds, corners };
    }
  } catch (e) {
    console.error("Error parsing overlay bounds", e);
  }

  return { bounds: null, corners: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ developmentId: string }> }
) {
  try {
    const { developmentId } = await params;

    const development = await prisma.development.findUnique({
      where: { id: developmentId },
      select: {
        masterplanSourceUrl: true,
        overlayBounds: true,
        overlayRotation: true,
        mapCenterLat: true,
        mapCenterLng: true,
        mapZoom: true,
        Organization: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!development) {
      return NextResponse.json({ error: "Desarrollo no encontrado" }, { status: 404 });
    }

    await requireOrganizationMembership(development.Organization.slug);

    const { bounds, corners } = parseOverlayBounds(development.overlayBounds);

    return NextResponse.json({
      config: {
        imageUrl: development.masterplanSourceUrl,
        bounds: bounds,
        corners,
        rotation: development.overlayRotation || 0,
        opacity: 0.8,
        mapCenter: {
          lat: development.mapCenterLat,
          lng: development.mapCenterLng,
          zoom: development.mapZoom,
        },
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/developments/[id]/overlay:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ developmentId: string }> }
) {
  try {
    const { developmentId } = await params;

    const development = await prisma.development.findUnique({
      where: { id: developmentId },
      select: {
        Organization: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!development) {
      return NextResponse.json({ error: "Desarrollo no encontrado" }, { status: 404 });
    }

    await requireOrganizationMembership(development.Organization.slug);

    const body = await request.json();
    const { imageUrl, bounds, corners, rotation, mapCenter } = body;

    const updated = await prisma.development.update({
      where: { id: developmentId },
      data: {
        overlayBounds: bounds ? JSON.stringify(corners ? { bounds, corners } : bounds) : null,
        overlayRotation: rotation != null ? parseFloat(rotation) : undefined,
        ...(mapCenter && {
          mapCenterLat: mapCenter.lat != null ? parseFloat(mapCenter.lat) : undefined,
          mapCenterLng: mapCenter.lng != null ? parseFloat(mapCenter.lng) : undefined,
          mapZoom: mapCenter.zoom != null ? parseInt(mapCenter.zoom, 10) : undefined,
        }),
      },
    });

    return NextResponse.json({ success: true, development: updated });
  } catch (error: any) {
    console.error("Error in POST /api/developments/[id]/overlay:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
