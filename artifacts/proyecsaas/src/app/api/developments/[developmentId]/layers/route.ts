import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { DRAWABLE_LAYER_TYPES, type DrawableLayerTipo } from "@/types/development-layers";

const db = prisma as any;

const DEFAULT_STYLE = {
  colorRelleno: "#22c55e",
  colorBorde: "#16a34a",
  opacidad: 0.35,
  grosorBorde: 2,
};

function isAllowedTipo(value: unknown): value is DrawableLayerTipo {
  return typeof value === "string" && DRAWABLE_LAYER_TYPES.includes(value as DrawableLayerTipo);
}

function asTrimmedName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function asOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function asOptionalNumber(value: unknown, min: number, max: number) {
  if (value == null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

function asOptionalColor(value: unknown) {
  if (typeof value !== "string") return undefined;
  const color = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : undefined;
}

function isGeoJsonGeometry(value: unknown) {
  if (value == null) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const type = (value as { type?: unknown }).type;
  const coordinates = (value as { coordinates?: unknown }).coordinates;
  return typeof type === "string" && Array.isArray(coordinates);
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

function serializeLayer(layer: {
  id: string;
  developmentId: string;
  nombre: string;
  tipo: string;
  orden: number;
  visible: boolean;
  bloqueada: boolean;
  geometria: Prisma.JsonValue | null;
  colorRelleno: string | null;
  colorBorde: string | null;
  opacidad: number | null;
  grosorBorde: number | null;
  creadoEn: Date;
  actualizadoEn: Date;
}) {
  return {
    ...layer,
    creadoEn: layer.creadoEn.toISOString(),
    actualizadoEn: layer.actualizadoEn.toISOString(),
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

    const layers = await db.developmentDrawableLayer.findMany({
      where: { developmentId },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
    });

    return NextResponse.json({ layers: layers.map(serializeLayer) });
  } catch (error: any) {
    console.error("Error in GET /api/developments/[developmentId]/layers:", error);
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
    const nombre = asTrimmedName(body.nombre);
    const tipo = body.tipo;

    if (!nombre) {
      return NextResponse.json({ error: "Ingresá un nombre para la capa." }, { status: 400 });
    }

    if (!isAllowedTipo(tipo)) {
      return NextResponse.json({ error: "Tipo de capa inválido." }, { status: 400 });
    }

    if (!isGeoJsonGeometry(body.geometria)) {
      return NextResponse.json({ error: "La geometría debe ser GeoJSON válido." }, { status: 400 });
    }

    const lastLayer = await db.developmentDrawableLayer.findFirst({
      where: { developmentId },
      orderBy: { orden: "desc" },
      select: { orden: true },
    });

    const layer = await db.developmentDrawableLayer.create({
      data: {
        developmentId,
        nombre,
        tipo,
        orden: asOptionalNumber(body.orden, 0, 10000) ?? ((lastLayer?.orden ?? -1) + 1),
        visible: asOptionalBoolean(body.visible) ?? true,
        bloqueada: asOptionalBoolean(body.bloqueada) ?? false,
        geometria: body.geometria ?? Prisma.JsonNull,
        colorRelleno: asOptionalColor(body.colorRelleno) ?? DEFAULT_STYLE.colorRelleno,
        colorBorde: asOptionalColor(body.colorBorde) ?? DEFAULT_STYLE.colorBorde,
        opacidad: asOptionalNumber(body.opacidad, 0, 1) ?? DEFAULT_STYLE.opacidad,
        grosorBorde: asOptionalNumber(body.grosorBorde, 1, 16) ?? DEFAULT_STYLE.grosorBorde,
      },
    });

    return NextResponse.json({ layer: serializeLayer(layer) }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/developments/[developmentId]/layers:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

async function updateLayer(
  request: NextRequest,
  params: Promise<{ developmentId: string }>,
) {
  const { developmentId } = await params;
  const access = await requireDevelopmentAccess(developmentId);
  if (access.error) return access.error;

  const body = await request.json();
  const layerId = typeof body.id === "string" ? body.id : typeof body.layerId === "string" ? body.layerId : "";

  if (!layerId) {
    return NextResponse.json({ error: "Falta identificar la capa." }, { status: 400 });
  }

  const existing = await db.developmentDrawableLayer.findFirst({
    where: { id: layerId, developmentId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Capa no encontrada" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if ("nombre" in body) {
    const nombre = asTrimmedName(body.nombre);
    if (!nombre) {
      return NextResponse.json({ error: "Ingresá un nombre para la capa." }, { status: 400 });
    }
    data.nombre = nombre;
  }

  if ("tipo" in body) {
    if (!isAllowedTipo(body.tipo)) {
      return NextResponse.json({ error: "Tipo de capa inválido." }, { status: 400 });
    }
    data.tipo = body.tipo;
  }

  if ("geometria" in body) {
    if (!isGeoJsonGeometry(body.geometria)) {
      return NextResponse.json({ error: "La geometría debe ser GeoJSON válido." }, { status: 400 });
    }
    data.geometria = body.geometria ?? Prisma.JsonNull;
  }

  if ("visible" in body) data.visible = asOptionalBoolean(body.visible);
  if ("bloqueada" in body) data.bloqueada = asOptionalBoolean(body.bloqueada);
  if ("orden" in body) data.orden = asOptionalNumber(body.orden, 0, 10000);
  if ("colorRelleno" in body) data.colorRelleno = asOptionalColor(body.colorRelleno);
  if ("colorBorde" in body) data.colorBorde = asOptionalColor(body.colorBorde);
  if ("opacidad" in body) data.opacidad = asOptionalNumber(body.opacidad, 0, 1);
  if ("grosorBorde" in body) data.grosorBorde = asOptionalNumber(body.grosorBorde, 1, 16);

  const layer = await db.developmentDrawableLayer.update({
    where: { id: layerId },
    data,
  });

  return NextResponse.json({ layer: serializeLayer(layer) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ developmentId: string }> },
) {
  try {
    return await updateLayer(request, params);
  } catch (error: any) {
    console.error("Error in PATCH /api/developments/[developmentId]/layers:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ developmentId: string }> },
) {
  try {
    return await updateLayer(request, params);
  } catch (error: any) {
    console.error("Error in PUT /api/developments/[developmentId]/layers:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ developmentId: string }> },
) {
  try {
    const { developmentId } = await params;
    const access = await requireDevelopmentAccess(developmentId);
    if (access.error) return access.error;

    const urlLayerId = request.nextUrl.searchParams.get("layerId");
    let bodyLayerId = "";
    try {
      const body = await request.json();
      bodyLayerId = typeof body.id === "string" ? body.id : typeof body.layerId === "string" ? body.layerId : "";
    } catch {}

    const layerId = urlLayerId || bodyLayerId;
    if (!layerId) {
      return NextResponse.json({ error: "Falta identificar la capa." }, { status: 400 });
    }

    const existing = await db.developmentDrawableLayer.findFirst({
      where: { id: layerId, developmentId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Capa no encontrada" }, { status: 404 });
    }

    await db.developmentDrawableLayer.delete({ where: { id: layerId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/developments/[developmentId]/layers:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
