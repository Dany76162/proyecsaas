import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import {
  isHexColor,
  isVisualCoordinateSpace,
  isVisualGeometry,
  isVisualGeometryKind,
  isVisualVisibility,
} from "@/types/development-visual-objects";

const db = prisma as any;

function trimText(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableText(value: unknown, max = 400) {
  if (value == null) return null;
  const text = trimText(value, max);
  return text || null;
}

function optionalNumber(value: unknown, min: number, max: number) {
  if (value == null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

async function requireObjectAccess(developmentId: string, objectId: string) {
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

  const object = await db.developmentVisualObject.findFirst({
    where: { id: objectId, developmentId },
    select: { id: true },
  });

  if (!object) {
    return { error: NextResponse.json({ error: "Objeto visual no encontrado" }, { status: 404 }) };
  }

  return { development, object };
}

function serializeObject(object: any) {
  return {
    ...object,
    createdAt: object.createdAt?.toISOString?.() ?? object.createdAt,
    updatedAt: object.updatedAt?.toISOString?.() ?? object.updatedAt,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ developmentId: string; objectId: string }> },
) {
  try {
    const { developmentId, objectId } = await params;
    const access = await requireObjectAccess(developmentId, objectId);
    if (access.error) return access.error;

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if ("name" in body) {
      const name = trimText(body.name, 120);
      if (!name) return NextResponse.json({ error: "Ingresa un nombre." }, { status: 400 });
      data.name = name;
    }

    if ("type" in body) {
      const type = trimText(body.type, 80);
      if (!type) return NextResponse.json({ error: "Ingresa un tipo." }, { status: 400 });
      data.type = type;
    }

    if ("description" in body) data.description = nullableText(body.description, 500);
    if ("tooltip" in body) data.tooltip = nullableText(body.tooltip, 220);

    if ("geometryKind" in body) {
      if (!isVisualGeometryKind(body.geometryKind)) {
        return NextResponse.json({ error: "Tipo de geometria invalido." }, { status: 400 });
      }
      data.geometryKind = body.geometryKind;
    }

    const effectiveGeometryKind = (data.geometryKind ?? body.geometryKind) as any;
    if ("geometry" in body) {
      const geometryKind = isVisualGeometryKind(effectiveGeometryKind)
        ? effectiveGeometryKind
        : await db.developmentVisualObject
            .findUnique({ where: { id: objectId }, select: { geometryKind: true } })
            .then((item: any) => item?.geometryKind);

      if (!isVisualGeometryKind(geometryKind) || !isVisualGeometry(geometryKind, body.geometry)) {
        return NextResponse.json({ error: "Geometria invalida." }, { status: 400 });
      }
      data.geometry = body.geometry;
    }

    if ("coordinateSpace" in body) {
      if (!isVisualCoordinateSpace(body.coordinateSpace)) {
        return NextResponse.json({ error: "Sistema de coordenadas invalido." }, { status: 400 });
      }
      data.coordinateSpace = body.coordinateSpace;
    }

    if ("visibility" in body) {
      if (!isVisualVisibility(body.visibility)) {
        return NextResponse.json({ error: "Visibilidad invalida." }, { status: 400 });
      }
      data.visibility = body.visibility;
    }

    if ("fillColor" in body) data.fillColor = isHexColor(body.fillColor) ? body.fillColor.trim() : null;
    if ("strokeColor" in body) data.strokeColor = isHexColor(body.strokeColor) ? body.strokeColor.trim() : null;
    if ("opacity" in body) data.opacity = optionalNumber(body.opacity, 0, 1);
    if ("strokeWidth" in body) data.strokeWidth = optionalNumber(body.strokeWidth, 0.5, 32);
    if ("zIndex" in body) data.zIndex = optionalNumber(body.zIndex, -1000, 1000);
    if ("interactive" in body && typeof body.interactive === "boolean") data.interactive = body.interactive;
    if ("locked" in body && typeof body.locked === "boolean") data.locked = body.locked;

    const object = await db.developmentVisualObject.update({
      where: { id: objectId },
      data,
    });

    return NextResponse.json({ object: serializeObject(object) });
  } catch (error: any) {
    console.error("Error in PATCH /api/developments/[developmentId]/visual-objects/[objectId]:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ developmentId: string; objectId: string }> },
) {
  try {
    const { developmentId, objectId } = await params;
    const access = await requireObjectAccess(developmentId, objectId);
    if (access.error) return access.error;

    await db.developmentVisualObject.delete({ where: { id: objectId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/developments/[developmentId]/visual-objects/[objectId]:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
