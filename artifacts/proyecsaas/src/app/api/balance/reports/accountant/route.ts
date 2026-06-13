/**
 * Combined accountant report:
 * Sheet 1 (rows 1-N): All expenses (same columns as expenses report)
 * Sheet 2 (rows N+3-M): Economic summary per currency
 *
 * Since CSV is single-sheet, we separate sections with blank rows and headers.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { getFinancialVaultSessionForVault } from "@/server/auth/financial-vault";
import {
  FinancialRole,
  FinancialAuditEvent,
  ExpenseCategory,
  ExpenseStatus,
  Prisma,
} from "@prisma/client";
import { buildCsv, formatCents, formatDate, todayString, csvRow } from "@/lib/balance/csv-utils";

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

    const development = await prisma.development.findFirst({
      where: { id: developmentId, organizationId },
      select: { id: true, name: true },
    });
    if (!development) {
      return NextResponse.json({ error: "Desarrollo no encontrado." }, { status: 404 });
    }

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

    // Optional date filters
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const expensesWhere: Prisma.DevelopmentFinancialExpenseWhereInput = {
      vaultId: vault.id,
      organizationId,
    };
    if (from || to) {
      expensesWhere.date = {};
      if (from) expensesWhere.date.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        expensesWhere.date.lte = toDate;
      }
    }

    const [expenses, lots] = await Promise.all([
      prisma.developmentFinancialExpense.findMany({
        where: expensesWhere,
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
      }),
      prisma.developmentLot.findMany({
        where: { developmentId, organizationId },
        select: { id: true, status: true, priceCents: true, currency: true, areaSqm: true },
      }),
    ]);

    // ── Section 1: Metadata ──────────────────────────────────────────────────
    const lines: string[] = [];
    const today = todayString();
    lines.push(csvRow(["REPORTE CONTABLE — BALANCE Y RENDICIÓN"]));
    lines.push(csvRow([`Desarrollo: ${development.name}`]));
    lines.push(csvRow([`Generado: ${today}`]));
    if (from || to) {
      lines.push(csvRow([`Período: ${from ?? "–"} a ${to ?? "–"}`]));
    }
    lines.push("");

    // ── Section 2: Expenses ──────────────────────────────────────────────────
    lines.push(csvRow(["=== SECCIÓN 1: GASTOS Y COMPROBANTES ==="]));
    lines.push(
      csvRow([
        "ID", "Fecha", "Categoría", "Descripción", "Proveedor",
        "Monto", "Moneda", "Estado", "Pagado por", "Método de pago",
        "Referencia", "Notas internas", "Comprobantes",
        "Fecha aprobación", "Fecha rechazo", "Motivo rechazo",
        "Fecha anulación", "Motivo anulación", "Creado el",
      ]),
    );

    for (const e of expenses) {
      lines.push(
        csvRow([
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
        ]),
      );
    }

    // Totals per currency (approved only)
    const approvedExpenses = expenses.filter((e) => e.status === ExpenseStatus.APPROVED);
    const expCurrencies = [...new Set(approvedExpenses.map((e) => e.currency))];
    lines.push("");
    lines.push(csvRow(["TOTALES (solo gastos APROBADOS)", "", "", "", "", "", ""]));
    for (const cur of expCurrencies) {
      const total = approvedExpenses
        .filter((e) => e.currency === cur)
        .reduce((s, e) => s + e.amountCents, 0);
      lines.push(csvRow([`Total aprobado ${cur}`, formatCents(total), cur]));
    }
    lines.push("");

    // ── Section 3: Economic summary ──────────────────────────────────────────
    lines.push(csvRow(["=== SECCIÓN 2: RESUMEN ECONÓMICO DE LOTES ==="]));

    const currencies = [...new Set(lots.map((l) => l.currency ?? "USD"))];
    for (const cur of currencies) {
      const curLots = lots.filter((l) => (l.currency ?? "USD") === cur);
      const byStatus = (statuses: string[]) => curLots.filter((l) => statuses.includes(l.status));
      const available = byStatus(["AVAILABLE"]);
      const reservedPending = byStatus(["RESERVED_PENDING"]);
      const reserved = byStatus(["RESERVED"]);
      const sold = byStatus(["SOLD"]);
      const blocked = byStatus(["BLOCKED"]);
      const sumCents = (arr: typeof curLots) => arr.reduce((s, l) => s + (l.priceCents ?? 0), 0);
      const sumArea = (arr: typeof curLots) => arr.reduce((s, l) => s + (l.areaSqm ?? 0), 0);
      const grossCents = sumCents(available) + sumCents(reservedPending) + sumCents(reserved) + sumCents(sold);
      const totalArea = sumArea(available) + sumArea(reservedPending) + sumArea(reserved) + sumArea(sold);
      const pct = (v: number) => (grossCents > 0 ? ((v / grossCents) * 100).toFixed(1) + "%" : "–");

      lines.push("");
      lines.push(csvRow([`Moneda: ${cur}`]));
      lines.push(csvRow(["Estado", "Lotes", "Superficie (m²)", "Valor", "% del bruto"]));
      lines.push(csvRow(["Disponible", available.length, sumArea(available).toFixed(2), formatCents(sumCents(available)), pct(sumCents(available))]));
      lines.push(csvRow(["Reserva Pendiente", reservedPending.length, sumArea(reservedPending).toFixed(2), formatCents(sumCents(reservedPending)), pct(sumCents(reservedPending))]));
      lines.push(csvRow(["Reservado", reserved.length, sumArea(reserved).toFixed(2), formatCents(sumCents(reserved)), pct(sumCents(reserved))]));
      lines.push(csvRow(["Vendido", sold.length, sumArea(sold).toFixed(2), formatCents(sumCents(sold)), pct(sumCents(sold))]));
      lines.push(csvRow(["Bloqueado", blocked.length, sumArea(blocked).toFixed(2), formatCents(sumCents(blocked)), "–"]));
      lines.push(csvRow(["TOTAL BRUTO", curLots.length - blocked.length, totalArea.toFixed(2), formatCents(grossCents), "100%"]));
      if (totalArea > 0 && grossCents > 0) {
        lines.push(csvRow([`Precio promedio/m² (${cur})`, "", "", (grossCents / 100 / totalArea).toFixed(2), ""]));
      }
    }

    const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";

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
        metadata: {
          reportType: "accountant",
          filters: { from, to },
          expenseCount: expenses.length,
          lotCount: lots.length,
        },
      },
    });

    const devSlug = development.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const filename = `balance-${devSlug}-reporte-contable-${today}.csv`;

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
