"use server";

import { prisma } from "@/server/db/prisma";
import { getPathGeometry } from "@/lib/blueprint-utils";

const STATUS_DB_TO_UI: Record<string, string> = {
  AVAILABLE: "DISPONIBLE",
  BLOCKED: "BLOQUEADO",
  RESERVED: "RESERVADA",
  RESERVED_PENDING: "RESERVADA",
  SOLD: "VENDIDA",
};

export async function getProjectBlueprintData(developmentId: string) {
  try {
    const lots = await prisma.developmentLot.findMany({
      where: {
        developmentId,
      },
      select: {
        id: true,
        lotNumber: true,
        areaSqm: true,
        priceCents: true,
        currency: true,
        status: true,
        pathData: true,
        centerX: true,
        centerY: true,
        etapaNombre: true,
        frontMeters: true,
        backMeters: true,
        manzana: true,
        destino: true,
        clientName: true,
        sellerName: true,
      },
      orderBy: { lotNumber: "asc" },
    });

    const unidades = lots.map((lot) => ({
      id: lot.id,
      numero: lot.lotNumber,
      superficie: lot.areaSqm,
      precio: lot.priceCents ? lot.priceCents / 100 : null,
      moneda: lot.currency || "USD",
      estado: (STATUS_DB_TO_UI[lot.status] || "DISPONIBLE") as any,
      path: lot.pathData,
      cx: lot.centerX,
      cy: lot.centerY,
      esEsquina: false,
      orientacion: null,
      tipo: lot.destino || "LOTE",
      destino: lot.destino,
      frente: lot.frontMeters,
      fondo: lot.backMeters,
      tour360Url: null,
      clientName: lot.clientName,
      sellerName: lot.sellerName,
      manzanaNombre: lot.manzana,
      manzana: {
        id: "default",
        nombre: lot.manzana || "",
        etapa: {
          id: "default",
          nombre: lot.etapaNombre || "",
        },
      },
      etapaNombre: lot.etapaNombre || undefined,
    }));

    return { success: true, data: unidades };
  } catch (error) {
    console.error("Error fetching project blueprint data:", error);
    return { success: false, error: "Error al obtener datos del masterplan" };
  }
}

export async function getUnidadHistorial(id: string) {
  try {
    const history = await prisma.developmentLotHistory.findMany({
      where: { lotId: id },
      orderBy: { createdAt: "desc" },
    });

    // Map history to match expected client format
    const data = history.map((h) => ({
      id: h.id,
      createdAt: h.createdAt.toISOString(),
      unidadId: h.lotId,
      estadoAnterior: h.previousStatus,
      estadoNuevo: h.newStatus,
      nota: h.reason || "",
      usuario: {
        nombre: "Sistema",
        email: "sistema@raicespilot.com",
      },
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching lot history:", error);
    return { success: false, error: "Error al obtener historial" };
  }
}

interface ClusteringPoint {
  id: string;
  vertices: { x: number; y: number }[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  x: number;
  y: number;
}

function distToSegment(p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function polygonDistance(polyA: ClusteringPoint, polyB: ClusteringPoint) {
  let minDistance = Infinity;

  for (const p of polyA.vertices) {
    for (let i = 0; i < polyB.vertices.length; i++) {
      const v = polyB.vertices[i];
      const w = polyB.vertices[(i + 1) % polyB.vertices.length];
      const d = distToSegment(p, v, w);
      if (d < minDistance) minDistance = d;
    }
  }

  for (const p of polyB.vertices) {
    for (let i = 0; i < polyA.vertices.length; i++) {
      const v = polyA.vertices[i];
      const w = polyA.vertices[(i + 1) % polyA.vertices.length];
      const d = distToSegment(p, v, w);
      if (d < minDistance) minDistance = d;
    }
  }

  return minDistance;
}

/**
 * direction:
 *  "default"        — Y ascendente (top→bottom en SVG = atrás→adelante cuando Y↓)
 *  "back-to-front"  — Y descendente (high-Y primero = atrás en planos con Y↑, como DXF estándar)
 */
export async function autoNumberManzanas(
  developmentId: string,
  direction: "default" | "back-to-front" = "default",
) {
  try {
    const lots = await prisma.developmentLot.findMany({
      where: { developmentId },
      select: {
        id: true,
        lotNumber: true,
        pathData: true,
        centerX: true,
        centerY: true,
      },
    });

    const points: ClusteringPoint[] = [];
    for (const lot of lots) {
      if (!lot.pathData) continue;
      const geom = getPathGeometry(lot.pathData);
      if (geom && geom.vertices.length >= 3) {
        points.push({
          id: lot.id,
          vertices: geom.vertices,
          minX: geom.bounds.minX,
          maxX: geom.bounds.maxX,
          minY: geom.bounds.minY,
          maxY: geom.bounds.maxY,
          x: lot.centerX ?? geom.cx,
          y: lot.centerY ?? geom.cy,
        });
      }
    }

    if (points.length === 0) {
      return { success: false, error: "No se encontraron lotes con geometrías para agrupar." };
    }

    const threshold = 3.0;
    const visited = new Set<string>();
    const clusters: ClusteringPoint[][] = [];

    for (const p of points) {
      if (visited.has(p.id)) continue;

      const cluster: ClusteringPoint[] = [];
      const queue = [p];
      visited.add(p.id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        cluster.push(curr);

        for (const neighbor of points) {
          if (visited.has(neighbor.id)) continue;

          // Bounding box check optimization
          if (neighbor.minX > curr.maxX + threshold ||
              neighbor.maxX < curr.minX - threshold ||
              neighbor.minY > curr.maxY + threshold ||
              neighbor.maxY < curr.minY - threshold) {
            continue;
          }

          const d = polygonDistance(curr, neighbor);
          if (d <= threshold) {
            visited.add(neighbor.id);
            queue.push(neighbor);
          }
        }
      }
      clusters.push(cluster);
    }

    // Sort clusters geographically.
    // "default"       → Y ascending  (top-to-bottom in SVG, left-to-right within row)
    // "back-to-front" → Y descending (bottom-to-top in SVG — for DXFs where high Y = back)
    clusters.sort((a, b) => {
      const avgXa = a.reduce((sum, p) => sum + p.x, 0) / a.length;
      const avgYa = a.reduce((sum, p) => sum + p.y, 0) / a.length;
      const avgXb = b.reduce((sum, p) => sum + p.x, 0) / b.length;
      const avgYb = b.reduce((sum, p) => sum + p.y, 0) / b.length;

      if (Math.abs(avgYa - avgYb) < 80) {
        return avgXa - avgXb; // left to right within the same row
      }
      return direction === "back-to-front" ? avgYb - avgYa : avgYa - avgYb;
    });

    // Optimized: one updateMany per cluster instead of one update per lot
    await prisma.$transaction(
      clusters.map((cluster, idx) =>
        prisma.developmentLot.updateMany({
          where: { id: { in: cluster.map((p) => p.id) } },
          data: { manzana: `MZA${idx + 1}` },
        })
      )
    );

    return { success: true, count: clusters.length };
  } catch (error: any) {
    console.error("Error in autoNumberManzanas:", error);
    return { success: false, error: error.message || "Error al auto-numerar manzanas" };
  }
}

/**
 * Renumera los lotes de un desarrollo según posición en el plano.
 *
 * direction:
 *  "back-to-front"  — atrás (high Y en DXF estándar) obtiene números bajos. Default.
 *  "front-to-back"  — adelante (low Y) obtiene números bajos.
 *
 * Usa un prefijo temporal para evitar colisiones de la restricción UNIQUE (developmentId, lotNumber).
 */
export async function renumberLots(
  developmentId: string,
  direction: "back-to-front" | "front-to-back" = "back-to-front",
) {
  try {
    const membership = await (async () => {
      const dev = await prisma.development.findUnique({
        where: { id: developmentId },
        select: { Organization: { select: { slug: true } } },
      });
      if (!dev) throw new Error("Desarrollo no encontrado");
      return dev;
    })();

    const lots = await prisma.developmentLot.findMany({
      where: { developmentId },
      select: { id: true, centerX: true, centerY: true, pathData: true },
    });

    if (lots.length === 0) {
      return { success: false, error: "No se encontraron lotes." };
    }

    type Located = { id: string; cx: number; cy: number };
    const located: Located[] = [];
    const noCoord: string[] = [];

    for (const lot of lots) {
      let cx = lot.centerX;
      let cy = lot.centerY;
      if ((cx == null || cy == null) && lot.pathData) {
        const geom = getPathGeometry(lot.pathData);
        if (geom) { cx = geom.cx; cy = geom.cy; }
      }
      if (cx != null && cy != null) {
        located.push({ id: lot.id, cx, cy });
      } else {
        noCoord.push(lot.id);
      }
    }

    // Sort by depth axis (Y) then horizontal axis (X)
    located.sort((a, b) => {
      const yDiff = direction === "back-to-front" ? b.cy - a.cy : a.cy - b.cy;
      if (Math.abs(a.cy - b.cy) < 20) return a.cx - b.cx;
      return yDiff;
    });

    // Two-pass update to avoid UNIQUE constraint violations during renumbering.
    // Pass 1 — temporary unique names
    const tmpPrefix = `TMP_${Date.now()}_`;
    await prisma.$transaction([
      ...located.map((lot, i) =>
        prisma.developmentLot.update({
          where: { id: lot.id },
          data: { lotNumber: `${tmpPrefix}${i + 1}` },
        })
      ),
      ...noCoord.map((id, i) =>
        prisma.developmentLot.update({
          where: { id },
          data: { lotNumber: `${tmpPrefix}NC${i + 1}` },
        })
      ),
    ]);

    // Pass 2 — final sequential numbers
    const noCoordStart = located.length + 1;
    await prisma.$transaction([
      ...located.map((lot, i) =>
        prisma.developmentLot.update({
          where: { id: lot.id },
          data: { lotNumber: String(i + 1) },
        })
      ),
      ...noCoord.map((id, i) =>
        prisma.developmentLot.update({
          where: { id },
          data: { lotNumber: String(noCoordStart + i) },
        })
      ),
    ]);

    return { success: true, count: lots.length, withCoords: located.length, noCoords: noCoord.length };
  } catch (error: any) {
    console.error("Error in renumberLots:", error);
    return { success: false, error: error.message || "Error al renumerar lotes" };
  }
}
