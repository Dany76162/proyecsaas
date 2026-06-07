import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { DevelopmentLotStatus } from "@prisma/client";

const STATUS_DB_TO_UI: Record<string, string> = {
  AVAILABLE: "DISPONIBLE",
  BLOCKED: "BLOQUEADO",
  RESERVED: "RESERVADA",
  RESERVED_PENDING: "RESERVADA",
  SOLD: "VENDIDA",
};

const STATUS_UI_TO_DB: Record<string, DevelopmentLotStatus> = {
  DISPONIBLE: DevelopmentLotStatus.AVAILABLE,
  BLOQUEADO: DevelopmentLotStatus.BLOCKED,
  RESERVADA: DevelopmentLotStatus.RESERVED,
  RESERVADO: DevelopmentLotStatus.RESERVED,
  VENDIDA: DevelopmentLotStatus.SOLD,
  VENDIDO: DevelopmentLotStatus.SOLD,
  SUSPENDIDO: DevelopmentLotStatus.BLOCKED,
};

// GET /api/developments/lots/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Step 1: Fetch only org slug — no sensitive fields — to validate membership first.
    const lotCheck = await prisma.developmentLot.findUnique({
      where: { id },
      select: {
        Development: {
          select: { Organization: { select: { slug: true } } },
        },
      },
    });

    if (!lotCheck) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    // Step 2: Enforce tenant membership BEFORE reading any sensitive data.
    await requireOrganizationMembership(lotCheck.Development.Organization.slug);

    // Step 3: Membership confirmed — now fetch full data.
    const lotRaw = await prisma.developmentLot.findUnique({
      where: { id },
      include: {
        Development: true,
        DevelopmentLotHistory: true,
      },
    });

    if (!lotRaw) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    const lot = {
      ...lotRaw,
      development: lotRaw.Development,
      history: lotRaw.DevelopmentLotHistory,
    };

    // Map to SevenToop Unidad format
    const unidad = {
      id: lot.id,
      numero: lot.lotNumber,
      superficie: lot.areaSqm,
      precio: lot.priceCents ? lot.priceCents / 100 : null,
      moneda: lot.currency || "USD",
      estado: STATUS_DB_TO_UI[lot.status] || "DISPONIBLE",
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
      manzanaNombre: lot.manzana, // Flat field for UI
      manzana: {
        id: "default",
        nombre: lot.manzana || "Principal",
        etapa: {
          id: "default",
          nombre: lot.etapaNombre || "Fase 1",
          proyecto: {
            id: lot.developmentId,
            nombre: lot.development.name,
            orgId: lot.development.organizationId,
          },
        },
      },
      etapaNombre: lot.etapaNombre || "Fase 1",
      historial: lot.history.map((h: any) => ({
        id: h.id,
        createdAt: h.createdAt.toISOString(),
        estadoAnterior: STATUS_DB_TO_UI[h.previousStatus] || h.previousStatus,
        estadoNuevo: STATUS_DB_TO_UI[h.newStatus] || h.newStatus,
        motivo: h.reason || "",
        usuario: { nombre: "Sistema" },
      })),
      reservas: [],
    };

    return NextResponse.json(unidad);
  } catch (error: any) {
    console.error("Error in GET /api/developments/lots/[id]:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

// PUT /api/developments/lots/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingRaw = await prisma.developmentLot.findUnique({
      where: { id },
      include: {
        Development: {
          include: {
            Organization: true,
          },
        },
      },
    });

    if (!existingRaw) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    const existing = {
      ...existingRaw,
      development: {
        ...existingRaw.Development,
        organization: existingRaw.Development.Organization,
      },
    };

    await requireOrganizationMembership(existing.development.organization.slug);

    const body = await request.json();

    const dbStatus = body.estado ? (STATUS_UI_TO_DB[body.estado] || body.estado) : undefined;
    const prevDbStatus = body.previousEstado ? (STATUS_UI_TO_DB[body.previousEstado] || body.previousEstado) : undefined;

    // Log history if state changed
    if (dbStatus && prevDbStatus && dbStatus !== prevDbStatus) {
      await prisma.developmentLotHistory.create({
        data: {
          lotId: id,
          organizationId: existing.development.organizationId,
          previousStatus: prevDbStatus,
          newStatus: dbStatus,
          reason: body.motivo || "Actualización desde grilla de inventario",
        },
      });
    }

    // Update lot properties
    const updated = await prisma.developmentLot.update({
      where: { id },
      data: {
        lotNumber: body.numero || undefined,
        areaSqm: body.superficie != null ? parseFloat(body.superficie) : undefined,
        priceCents: body.precio != null ? Math.round(parseFloat(body.precio) * 100) : undefined,
        currency: body.moneda || undefined,
        status: dbStatus,
        pathData: body.path || undefined,
        centerX: body.cx != null ? parseFloat(body.cx) : undefined,
        centerY: body.cy != null ? parseFloat(body.cy) : undefined,
        etapaNombre: body.etapaNombre !== undefined ? body.etapaNombre : undefined,
        frontMeters: body.frente != null ? parseFloat(body.frente) : undefined,
        backMeters: body.fondo != null ? parseFloat(body.fondo) : undefined,
        manzana: body.manzanaNombre !== undefined ? body.manzanaNombre : undefined,
        destino: body.destino !== undefined ? body.destino : undefined,
        clientName: body.clientName !== undefined ? body.clientName : undefined,
        sellerName: body.sellerName !== undefined ? body.sellerName : undefined,
      },
    });

    // Format back to Unidad shape
    const responseUnidad = {
      id: updated.id,
      numero: updated.lotNumber,
      superficie: updated.areaSqm,
      precio: updated.priceCents ? updated.priceCents / 100 : null,
      moneda: updated.currency,
      estado: STATUS_DB_TO_UI[updated.status] || "DISPONIBLE",
      path: updated.pathData,
      cx: updated.centerX,
      cy: updated.centerY,
      frente: updated.frontMeters,
      fondo: updated.backMeters,
      destino: updated.destino,
      clientName: updated.clientName,
      sellerName: updated.sellerName,
      manzanaNombre: updated.manzana,
      manzana: {
        id: "default",
        nombre: updated.manzana || "Principal",
        etapa: {
          id: "default",
          nombre: updated.etapaNombre || "Fase 1",
        },
      },
      etapaNombre: updated.etapaNombre || "Fase 1",
    };

    return NextResponse.json(responseUnidad);
  } catch (error: any) {
    console.error("Error in PUT /api/developments/lots/[id]:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

// DELETE /api/developments/lots/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lotRaw = await prisma.developmentLot.findUnique({
      where: { id },
      include: { Development: true },
    });

    if (!lotRaw) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    const lot = {
      ...lotRaw,
      development: lotRaw.Development,
    };

    await requireOrganizationMembership(lot.development.organizationId);

    await prisma.developmentLot.delete({ where: { id } });

    return NextResponse.json({ message: "Lote eliminado correctamente" });
  } catch (error: any) {
    console.error("Error in DELETE /api/developments/lots/[id]:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
