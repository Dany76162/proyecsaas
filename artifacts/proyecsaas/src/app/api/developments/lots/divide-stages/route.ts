import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { developmentId, divisions } = body; 
    // divisions is an array of: { stageName: string, lotIds: string[] }

    if (!developmentId || !divisions || !Array.isArray(divisions)) {
      return NextResponse.json({ error: "Datos faltantes o inválidos" }, { status: 400 });
    }

    // Fetch development to authorize
    const development = await prisma.development.findUnique({
      where: { id: developmentId },
      include: { Organization: true },
    });

    if (!development) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    await requireOrganizationMembership(development.Organization.slug);

    // Update each division group
    for (const division of divisions) {
      const { stageName, lotIds } = division;
      if (lotIds.length > 0) {
        await prisma.developmentLot.updateMany({
          where: {
            id: { in: lotIds },
            developmentId,
          },
          data: {
            etapaNombre: stageName || null,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in POST /api/developments/lots/divide-stages:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
