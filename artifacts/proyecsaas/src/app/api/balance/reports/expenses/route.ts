import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { getFinancialVaultSessionForVault } from "@/server/auth/financial-vault";
import { FinancialRole, FinancialAuditEvent, ExpenseStatus, ExpenseCategory, Prisma } from "@prisma/client";
import { buildCsv, formatCents, formatDate, todayString } from "@/lib/balance/csv-utils";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MENSURA: "Mensura",
  AGRIMENSURA: "Agrimensura",
  MUNICIPALIDAD: "Municipalidad",
  APROBACIONES: "Aprobaciones",
  ESCRITURAS: "Escrituras",
  INFRAESTRUCTURA: "Infraestructura",
  CALLES: "Calles",
  LUZ: "Electricidad",
  AGUA: "Agua",
  SEGURIDAD: "Seguridad",
  MARKETING: "Marketing",
  COMISIONES: "Comisiones",
  ADMINISTRACION: "Administración",
  HONORARIOS: "Honorarios",
  IMPUESTOS: "Impuestos",
  GASTOS_MENORES: "Gastos menores",
  OTROS: "Otros",
};

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  VOIDED: "Anulado",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const orgSlug = searchParams.get("orgSlug");
    const developmentId = searchParams.get("developmentId");
    if (!orgSlug || !developmentId) {
      return NextResponse.json({ error: "orgSlug y developmentId requeridos." }, { status: 400 });
    }

    const { user, membership } = await requireOrganizationMembership(orgSlug);

    if (user.isPlatformAdmin) {
      return NextResponse.json({ error: "Acceso no permitido." }, { status: 403 });
    }

    const organizationId = membership.organization.id;

    // Verify development belongs to org
    const development = await prisma.development.findFirst({
      where: { id: developmentId, organizationId },
      select: { id: true, name: true },
    });
    if (!development) {
      return NextResponse.json({ error: "Desarrollo no encontrado." }, { status: 404 });
    }

    // Resolve vault + session
    const vault = await prisma.developmentFinancialVault.findFirst({
      where: { developmentId, organizationId, isActive: true },
      select: { id: true },
    });
    if (!vault) {
      return NextResponse.json({ error: "Módulo financiero no encontrado." }, { status: 403 });
    }

    const session = await getFinancialVaultSessionForVault(vault.id, developmentId, organizationId);
    if (!session) {
      return NextResponse.json({ error: "Sesión financiera inválida o expirada." }, { status: 401 });
    }

    // Optional filters
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status") as ExpenseStatus | null;
    const category = searchParams.get("category") as ExpenseCategory | null;

    const where: Prisma.DevelopmentFinancialExpenseWhereInput = {
      vaultId: vault.id,
      organizationId,
    };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }
    if (status && Object.values(ExpenseStatus).includes(status)) {
      where.status = status;
    }
    if (category && Object.values(ExpenseCategory).includes(category)) {
      where.category = category;
    }

    const expenses = await prisma.developmentFinancialExpense.findMany({
      where,
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        category: true,
        description: true,
        provider: true,
        amountCents: true,
        currency: true,
        status: true,
        paidBy: true,
        paymentMethod: true,
        paymentReference: true,
        internalNotes: true,
        createdAt: true,
        approvedAt: true,
        rejectedAt: true,
        voidedAt: true,
        rejectionReason: true,
        voidReason: true,
        _count: { select: { attachments: { where: { deletedAt: null } } } },
      },
    });

    const headers = [
      "ID",
      "Fecha",
      "Categoría",
      "Descripción",
      "Proveedor",
      "Monto",
      "Moneda",
      "Estado",
      "Pagado por",
      "Método de pago",
      "Referencia de pago",
      "Notas internas",
      "Comprobantes adjuntos",
      "Fecha aprobación",
      "Fecha rechazo",
      "Motivo rechazo",
      "Fecha anulación",
      "Motivo anulación",
      "Creado el",
    ];

    const rows = expenses.map((e) => [
      e.id,
      formatDate(e.date),
      CATEGORY_LABELS[e.category] ?? e.category,
      e.description,
      e.provider,
      formatCents(e.amountCents),
      e.currency,
      STATUS_LABELS[e.status] ?? e.status,
      e.paidBy,
      e.paymentMethod,
      e.paymentReference,
      e.internalNotes,
      e._count.attachments,
      e.approvedAt ? formatDate(e.approvedAt) : null,
      e.rejectedAt ? formatDate(e.rejectedAt) : null,
      e.rejectionReason,
      e.voidedAt ? formatDate(e.voidedAt) : null,
      e.voidReason,
      formatDate(e.createdAt),
    ]);

    const csv = buildCsv(headers, rows);

    // Audit log
    await prisma.developmentFinancialAuditLog.create({
      data: {
        vaultId: vault.id,
        organizationId,
        actorId: user.id,
        actorEmail: user.email ?? "",
        actorRole: FinancialRole.OWNER,
        event: FinancialAuditEvent.EXPORT_GENERATED,
        entityType: "report",
        entityId: developmentId,
        metadata: { reportType: "expenses", filters: { from, to, status, category }, rowCount: expenses.length },
      },
    });

    const filename = `balance-${development.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-gastos-${todayString()}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
