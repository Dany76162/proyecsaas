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
        nombre: lot.manzana || "Principal",
        etapa: {
          id: "default",
          nombre: lot.etapaNombre || "Fase 1",
        },
      },
      etapaNombre: lot.etapaNombre || "Fase 1",
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

export async function autoNumberManzanas(developmentId: string) {
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

    // Sort clusters geographically: top-to-bottom, left-to-right
    clusters.sort((a, b) => {
      const avgXa = a.reduce((sum, p) => sum + p.x, 0) / a.length;
      const avgYa = a.reduce((sum, p) => sum + p.y, 0) / a.length;
      const avgXb = b.reduce((sum, p) => sum + p.x, 0) / b.length;
      const avgYb = b.reduce((sum, p) => sum + p.y, 0) / b.length;

      // Group rows within 80 units of height
      if (Math.abs(avgYa - avgYb) < 80) {
        return avgXa - avgXb;
      }
      return avgYa - avgYb;
    });

    const updates: { id: string; manzana: string }[] = [];
    clusters.forEach((cluster, idx) => {
      const manzanaName = `MZA${idx + 1}`;
      for (const p of cluster) {
        updates.push({ id: p.id, manzana: manzanaName });
      }
    });

    // Run direct updates
    await prisma.$transaction(
      updates.map((u) =>
        prisma.developmentLot.update({
          where: { id: u.id },
          data: { manzana: u.manzana },
        })
      )
    );

    return { success: true, count: clusters.length };
  } catch (error: any) {
    console.error("Error in autoNumberManzanas:", error);
    return { success: false, error: error.message || "Error al auto-numerar manzanas" };
  }
}
