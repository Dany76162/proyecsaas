import { NextResponse } from "next/server";
import { MembershipRole, DevelopmentLotStatus } from "@prisma/client";

import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { withBlueprintMeta, sanitizeBlueprintSVG } from "@/modules/developments/blueprint-utils";
import type { BlueprintEmbeddedMeta } from "@/modules/developments/blueprint-utils";

export const dynamic = "force-dynamic";

const MAX_PATHS = 5000;
const MAX_SVG_BYTES = 8 * 1024 * 1024;

interface SyncPath {
  internalId?: number;
  lotNumber?: string;
  pathData: string;
  center: { x: number; y: number };
  areaSqm?: number;
  frente?: number;
  fondo?: number;
  estado?: string;
  precio?: number;
}

function normalizeLotNumber(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim().toUpperCase().slice(0, 40);
  if (!clean || !/^[A-Z0-9._-]+$/.test(clean)) return undefined;
  return clean;
}

function normalizeFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ developmentId: string }> },
) {
  try {
    const { developmentId } = await params;
    const url = new URL(req.url);
    const orgSlug = url.searchParams.get("orgSlug");

    if (!orgSlug) {
      return NextResponse.json({ error: "Falta parámetro orgSlug." }, { status: 400 });
    }

    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, MembershipRole.ADMIN);

    const development = await prisma.development.findFirst({
      where: { id: developmentId, organizationId: membership.organization.id },
      select: { id: true },
    });
    if (!development) {
      return NextResponse.json({ error: "Desarrollo no encontrado." }, { status: 404 });
    }

    const body = await req.json();
    const { paths, svgContent, meta } = body as {
      paths: SyncPath[];
      svgContent: string;
      meta?: BlueprintEmbeddedMeta;
    };

    if (!Array.isArray(paths)) {
      return NextResponse.json({ error: "paths debe ser un array." }, { status: 400 });
    }
    if (typeof svgContent !== "string" || Buffer.byteLength(svgContent, "utf8") > MAX_SVG_BYTES) {
      return NextResponse.json({ error: "El SVG excede el tamaño máximo." }, { status: 413 });
    }
    if (paths.length > MAX_PATHS) {
      return NextResponse.json({ error: "El plano tiene demasiados elementos." }, { status: 413 });
    }

    const safePaths = paths
      .filter(
        (p) =>
          typeof p.pathData === "string" &&
          p.pathData.trim().length > 0 &&
          !/NaN|Infinity/.test(p.pathData) &&
          p.center &&
          Number.isFinite(p.center.x) &&
          Number.isFinite(p.center.y),
      )
      .map((p) => ({
        ...p,
        lotNumber: normalizeLotNumber(p.lotNumber),
        areaSqm: normalizeFinite(p.areaSqm),
        frente: normalizeFinite(p.frente),
        fondo: normalizeFinite(p.fondo),
        precio: normalizeFinite(p.precio),
      }));

function mapEstadoToStatus(estado?: string): DevelopmentLotStatus {
  if (estado === "RESERVADO") return DevelopmentLotStatus.RESERVED;
  if (estado === "VENDIDO") return DevelopmentLotStatus.SOLD;
  if (estado === "BLOQUEADO") return DevelopmentLotStatus.BLOCKED;
  return DevelopmentLotStatus.AVAILABLE;
}

    // Server-side sanitization: regex fallback runs in Node.js (no DOMParser).
    // Removes <script>, <foreignObject>, on* attributes, javascript: hrefs.
    const sanitizedSvg = sanitizeBlueprintSVG(svgContent);

    const svgToSave = meta
      ? withBlueprintMeta(sanitizedSvg, {
          ...meta,
          detectedPaths: meta.detectedPaths ?? safePaths.length,
          detectedLots: meta.detectedLots ?? safePaths.filter((p) => !!p.lotNumber).length,
          savedAt: new Date().toISOString(),
        })
      : sanitizedSvg;

    await prisma.development.update({
      where: { id: developmentId },
      data: {
        masterplanSVG: svgToSave,
        masterplanSourceKind: meta?.sourceKind ?? null,
        masterplanSourceUrl: meta?.sourceUrl ?? null,
      },
    });

    const allowInventorySync = meta?.processingMode === "detected-lots";
    const lotCandidates = allowInventorySync
      ? safePaths.filter((p) => p.lotNumber || p.internalId)
      : [];

    if (lotCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Base visual guardada. Sin lotes detectados para sincronizar.",
        created: 0,
        updated: 0,
      });
    }

    const existingLots = await prisma.developmentLot.findMany({
      where: {
        developmentId,
        lotNumber: { in: lotCandidates.map((p) => p.lotNumber ?? `L${p.internalId}`) },
      },
      select: { id: true, lotNumber: true },
    });
    const existingByNumber = new Map(existingLots.map((lot) => [lot.lotNumber, lot]));

    let created = 0;
    let updated = 0;

    for (const p of lotCandidates) {
      const lotNumber = p.lotNumber ?? `L${p.internalId}`;
      const existing = existingByNumber.get(lotNumber);

      const status = mapEstadoToStatus(p.estado);
      const priceCents = p.precio != null ? Math.round(p.precio * 100) : null;

      if (existing) {
        await prisma.developmentLot.update({
          where: { id: existing.id },
          data: {
            pathData: p.pathData,
            centerX: p.center.x,
            centerY: p.center.y,
            areaSqm: p.areaSqm ?? undefined,
            frontMeters: p.frente ?? undefined,
            backMeters: p.fondo ?? undefined,
            status: status ?? undefined,
            priceCents: priceCents ?? undefined,
          },
        });
        updated++;
      } else {
        await prisma.developmentLot.create({
          data: {
            developmentId,
            organizationId: membership.organization.id,
            lotNumber,
            pathData: p.pathData,
            centerX: p.center.x,
            centerY: p.center.y,
            areaSqm: p.areaSqm ?? null,
            frontMeters: p.frente ?? null,
            backMeters: p.fondo ?? null,
            status: status || "AVAILABLE",
            priceCents: priceCents ?? null,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completada. ${created} creados, ${updated} actualizados.`,
      created,
      updated,
    });
  } catch (error: any) {
    console.error("[api/developments/blueprint/sync] Error:", error);
    return NextResponse.json({ error: error.message || "Error interno." }, { status: 500 });
  }
}
