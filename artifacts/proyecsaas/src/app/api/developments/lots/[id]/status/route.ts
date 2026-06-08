import { NextResponse } from "next/server";
import { MembershipRole } from "@prisma/client";

import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

const STATUS_UI_TO_DB: Record<string, string> = {
  DISPONIBLE: "AVAILABLE",
  BLOQUEADO: "BLOCKED",
  RESERVADA: "RESERVED",
  RESERVADO: "RESERVED",
  VENDIDA: "SOLD",
  VENDIDO: "SOLD",
  SUSPENDIDO: "BLOCKED",
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    const dbStatus = STATUS_UI_TO_DB[status] || status;

    // Step 1: Fetch only the org slug — no sensitive fields — to validate membership first.
    const lotCheck = await prisma.developmentLot.findUnique({
      where: { id },
      select: {
        status: true,
        organizationId: true,
        Development: {
          select: { Organization: { select: { slug: true } } },
        },
      },
    });

    if (!lotCheck) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    // Step 2: Enforce tenant membership. The user must belong to the org that owns this lot.
    const { user, membership } = await requireOrganizationMembership(
      lotCheck.Development.Organization.slug,
    );
    assertMinimumRole(membership.role, MembershipRole.AGENT);

    // Step 3: Update using compound filter to prevent cross-tenant writes.
    const oldStatus = lotCheck.status;
    await prisma.$transaction([
      prisma.developmentLot.update({
        where: { id, organizationId: membership.organization.id },
        data: { status: dbStatus as any },
      }),
      prisma.developmentLotHistory.create({
        data: {
          lotId: id,
          organizationId: membership.organization.id,
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
