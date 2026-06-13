import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { getFinancialVaultSessionForVault } from "@/server/auth/financial-vault";
import { FinancialRole, FinancialAuditEvent } from "@prisma/client";
import { buildCsv, formatCents, todayString } from "@/lib/balance/csv-utils";

export const dynamic = "force-dynamic";

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

    const lots = await prisma.developmentLot.findMany({
      where: { developmentId, organizationId },
      select: { id: true, status: true, priceCents: true, currency: true, areaSqm: true },
    });

    const STATUS_LABELS: Record<string, string> = {
      AVAILABLE: "Disponible",
      RESERVED_PENDING: "Reserva Pendiente",
      RESERVED: "Reservado",
      SOLD: "Vendido",
      BLOCKED: "Bloqueado",
    };

    const headers = [
      "Lote ID",
      "Estado",
      "Precio (unidad)",
      "Moneda",
      "Superficie (m²)",
    ];

    const rows = lots.map((l) => [
      l.id,
      STATUS_LABELS[l.status] ?? l.status,
      l.priceCents != null ? formatCents(l.priceCents) : "",
      l.currency ?? "USD",
      l.areaSqm != null ? l.areaSqm.toFixed(2) : "",
    ]);

    // Summary section appended after data
    const currencies = [...new Set(lots.map((l) => l.currency ?? "USD"))];
    const summaryRows: (string | number | null | undefined)[][] = [];
    summaryRows.push([]);
    summaryRows.push(["=== RESUMEN POR MONEDA ==="]);

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

      summaryRows.push([]);
      summaryRows.push([`Moneda: ${cur}`]);
      summaryRows.push(["Estado", "Cantidad lotes", "Superficie total (m²)", "Valor total", "% del bruto"]);
      const pct = (v: number) => (grossCents > 0 ? ((v / grossCents) * 100).toFixed(1) + "%" : "–");
      summaryRows.push(["Disponible", available.length, sumArea(available).toFixed(2), formatCents(sumCents(available)), pct(sumCents(available))]);
      summaryRows.push(["Reserva Pendiente", reservedPending.length, sumArea(reservedPending).toFixed(2), formatCents(sumCents(reservedPending)), pct(sumCents(reservedPending))]);
      summaryRows.push(["Reservado", reserved.length, sumArea(reserved).toFixed(2), formatCents(sumCents(reserved)), pct(sumCents(reserved))]);
      summaryRows.push(["Vendido", sold.length, sumArea(sold).toFixed(2), formatCents(sumCents(sold)), pct(sumCents(sold))]);
      summaryRows.push(["Bloqueado", blocked.length, sumArea(blocked).toFixed(2), formatCents(sumCents(blocked)), "–"]);
      summaryRows.push(["TOTAL BRUTO", curLots.length - blocked.length, totalArea.toFixed(2), formatCents(grossCents), "100%"]);
      if (totalArea > 0 && grossCents > 0) {
        summaryRows.push([`Precio promedio/m² (${cur})`, "", "", (grossCents / 100 / totalArea).toFixed(2), ""]);
      }
    }

    const allRows = [...rows, ...summaryRows];
    const csv = buildCsv(headers, allRows);

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
        metadata: { reportType: "economic-summary", lotCount: lots.length },
      },
    });

    const filename = `balance-${development.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-resumen-economico-${todayString()}.csv`;

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
