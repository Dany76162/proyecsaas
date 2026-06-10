import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import {
  isHexColor,
  isVisualCoordinateSpace,
  isVisualGeometry,
  isVisualGeometryKind,
  isVisualVisibility,
  type DevelopmentVisualObjectDto,
  type VisualCoordinateSpace,
  type VisualVisibility,
} from "@/types/development-visual-objects";

const db = prisma as any;

const DEFAULTS = {
  fillColor: "#22c55e",
  strokeColor: "#166534",
  opacity: 0.45,
  strokeWidth: 2,
  zIndex: 0,
  coordinateSpace: "PLAN_VIEWBOX" as VisualCoordinateSpace,
  visibility: "BOTH" as VisualVisibility,
};

function trimText(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableText(value: unknown, max = 400) {
  if (value == null) return null;
  const text = trimText(value, max);
  return text || null;
}

function optionalBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function optionalNumber(value: unknown, min: number, max: number, fallback: number) {
  if (value == null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function optionalColor(value: unknown, fallback: string) {
  return isHexColor(value) ? value.trim() : fallback;
}

async function requireDevelopmentAccess(developmentId: string) {
  const development = await db.development.findUnique({
    where: { id: developmentId },
    select: {
      id: true,
      Organization: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!development) {
    return { error: NextResponse.json({ error: "Desarrollo no encontrado" }, { status: 404 }) };
  }

  await requireOrganizationMembership(development.Organization.slug);
  return { development };
}

function serializeObject(object: any): DevelopmentVisualObjectDto {
  return {
    ...object,
    createdAt: object.createdAt?.toISOString?.() ?? object.createdAt,
    updatedAt: object.updatedAt?.toISOString?.() ?? object.updatedAt,
  };
}

function parseCreatePayload(body: any) {
  const name = trimText(body.name, 120);
  const type = trimText(body.type, 80);
  const geometryKind = body.geometryKind;
  const coordinateSpace = body.coordinateSpace ?? DEFAULTS.coordinateSpace;
  const visibility = body.visibility ?? DEFAULTS.visibility;

  if (!name) return { error: "Ingresa un nombre para el objeto visual." };
  if (!type) return { error: "Ingresa un tipo para el objeto visual." };
  if (!isVisualGeometryKind(geometryKind)) return { error: "Tipo de geometria invalido." };
  if (!isVisualCoordinateSpace(coordinateSpace)) return { error: "Sistema de coordenadas invalido." };
  if (!isVisualVisibility(visibility)) return { error: "Visibilidad invalida." };
  if (!isVisualGeometry(geometryKind, body.geometry)) {
    return { error: "Geometria invalida para el tipo seleccionado." };
  }

  return {
    data: {
      id: crypto.randomUUID(),
      name,
      type,
      description: nullableText(body.description, 500),
      tooltip: nullableText(body.tooltip, 220),
      geometry: body.geometry,
      geometryKind,
      coordinateSpace,
      fillColor: optionalColor(body.fillColor, DEFAULTS.fillColor),
      strokeColor: optionalColor(body.strokeColor, DEFAULTS.strokeColor),
      opacity: optionalNumber(body.opacity, 0, 1, DEFAULTS.opacity),
      strokeWidth: optionalNumber(body.strokeWidth, 0.5, 32, DEFAULTS.strokeWidth),
      zIndex: optionalNumber(body.zIndex, -1000, 1000, DEFAULTS.zIndex),
      visibility,
      interactive: optionalBoolean(body.interactive, true),
      locked: optionalBoolean(body.locked, false),
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ developmentId: string }> },
) {
  try {
    const { developmentId } = await params;
    const access = await requireDevelopmentAccess(developmentId);
    if (access.error) return access.error;

    const objects = await db.developmentVisualObject.findMany({
      where: { developmentId },
      orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ objects: objects.map(serializeObject) });
  } catch (error: any) {
    console.error("Error in GET /api/developments/[developmentId]/visual-objects:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ developmentId: string }> },
) {
  try {
    const { developmentId } = await params;
    const access = await requireDevelopmentAccess(developmentId);
    if (access.error) return access.error;

    const body = await request.json();
    const parsed = parseCreatePayload(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const object = await db.developmentVisualObject.create({
      data: {
        ...parsed.data,
        developmentId,
      },
    });

    return NextResponse.json({ object: serializeObject(object) }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/developments/[developmentId]/visual-objects:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
