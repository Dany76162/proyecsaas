import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    const STATUS_UI_TO_DB: Record<string, string> = {
      DISPONIBLE: "AVAILABLE",
      BLOQUEADO: "BLOCKED",
      RESERVADA: "RESERVED",
      RESERVADO: "RESERVED",
      VENDIDA: "SOLD",
      VENDIDO: "SOLD",
      SUSPENDIDO: "BLOCKED",
    };

    const dbStatus = STATUS_UI_TO_DB[status] || status;

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

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

    const oldStatus = lot.status;
    await prisma.$transaction([
      prisma.developmentLot.update({
        where: { id },
        data: { status: dbStatus as any },
      }),
      prisma.developmentLotHistory.create({
        data: {
          lotId: id,
          organizationId: lot.organizationId,
          userId: user.id,
          previousStatus: oldStatus,
          newStatus: dbStatus as any,
          reason: "Actualización desde Masterplan",
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
