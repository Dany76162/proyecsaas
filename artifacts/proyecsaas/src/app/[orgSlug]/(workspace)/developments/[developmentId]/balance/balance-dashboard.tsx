"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  LogOut,
  Clock,
  User,
  Plus,
  TrendingDown,
  CheckCircle2,
  Hourglass,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Layers,
  Download,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  Wallet,
  Receipt,
  TableProperties,
} from "lucide-react";
import { toast } from "sonner";
import { logoutFinancialVaultAction } from "@/modules/developments/financial-vault-actions";
import { FinancialEntityType, ExpenseStatus } from "@prisma/client";
import ExpenseForm from "./expense-form";
import ExpenseTable, { type ExpenseRow } from "./expense-table";
import LotEconomicsTable from "./lot-economics-table";
import type { EconomicSummary, EconomicSummaryByCurrency, LotEconomicRow } from "./page";

const ENTITY_TYPE_LABELS: Record<FinancialEntityType, string> = {
  DEVELOPER: "Desarrollador",
  TRUST: "Fideicomiso",
  CONSTRUCTION: "Constructora",
  COMPANY: "Empresa",
  ADMINISTRATOR: "Administrador",
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtAmount(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function fmtArea(sqm: number) {
  return `${sqm.toLocaleString("es-AR", { maximumFractionDigits: 0 })} m²`;
}

function fmtPricePerSqm(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}/m²`;
}

// ── Executive Summary ─────────────────────────────────────────────────────────

function ExecutiveSummarySection({
  economicSummary,
  lotEconomics,
  expenses,
}: {
  economicSummary: EconomicSummary;
  lotEconomics: LotEconomicRow[];
  expenses: ExpenseRow[];
}) {
  const { multipleCurrencies, byCurrency } = economicSummary;

  // Use first (or only) currency for the executive summary
  const primary = byCurrency[0];

  if (!primary) {
    return null;
  }

  const currency = primary.currency;

  // Commercial pipeline
  const availableCents = primary.availableValueCents;
  const inProcessCents =
    primary.reservedPendingValueCents +
    primary.reservedValueCents +
    primary.soldValueCents;

  // Collected from lot economics (same currency only)
  const sameCurrencyLots = lotEconomics.filter((l) => l.currency === currency);
  const totalCollectedCents = sameCurrencyLots.reduce(
    (s, l) => s + l.totalCollectedCents,
    0,
  );
  const totalBalanceCents = sameCurrencyLots.reduce(
    (s, l) => s + (l.balancePendingCents ?? 0),
    0,
  );

  // Approved expenses
  const approvedExpenseCents = expenses
    .filter((e) => e.status === ExpenseStatus.APPROVED)
    .reduce((s, e) => s + e.amountCents, 0);

  const cards = [
    {
      label: "Valor bruto potencial",
      value: fmtAmount(primary.grossValueCents, currency),
      sub: "Lotes comercializables al precio lista",
      icon: TrendingUp,
      color: "text-brand-600",
      bg: "bg-brand-50 dark:bg-brand-900/20",
      border: "border-brand-100 dark:border-brand-800",
      tag: null,
    },
    {
      label: "Disponible para vender",
      value: fmtAmount(availableCents, currency),
      sub: `${primary.byStatus.available.count} lote${primary.byStatus.available.count !== 1 ? "s" : ""} disponibles`,
      icon: Layers,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-100 dark:border-emerald-800",
      tag: null,
    },
    {
      label: "En proceso comercial",
      value: fmtAmount(inProcessCents, currency),
      sub: "Reservas pendientes + confirmadas + vendido",
      icon: BarChart3,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-100 dark:border-orange-800",
      tag: null,
    },
    {
      label: "Cobrado confirmado",
      value: totalCollectedCents > 0 ? fmtAmount(totalCollectedCents, currency) : "—",
      sub: "Señas + cuotas pagas con pago aprobado",
      icon: Wallet,
      color: "text-sky-600",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      border: "border-sky-100 dark:border-sky-800",
      tag: "Según datos cargados",
    },
    {
      label: "Saldo por cobrar",
      value: totalBalanceCents > 0 ? fmtAmount(totalBalanceCents, currency) : "—",
      sub: "Cuotas pendientes y saldos registrados",
      icon: DollarSign,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      border: "border-violet-100 dark:border-violet-800",
      tag: "Estimado",
    },
    {
      label: "Gastos aprobados",
      value: approvedExpenseCents > 0 ? fmtAmount(approvedExpenseCents, expenses[0]?.currency ?? currency) : "—",
      sub: `${expenses.filter((e) => e.status === ExpenseStatus.APPROVED).length} gasto${expenses.filter((e) => e.status === ExpenseStatus.APPROVED).length !== 1 ? "s" : ""} aprobados`,
      icon: Receipt,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-100 dark:border-red-800",
      tag: null,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-800 dark:bg-white flex items-center justify-center shrink-0">
          <TrendingUp className="w-4.5 h-4.5 text-white dark:text-slate-900" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
            Resumen ejecutivo del negocio
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Panorama financiero consolidado del desarrollo según los datos cargados en el sistema.
          </p>
        </div>
      </div>

      {multipleCurrencies && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
            El desarrollo tiene lotes en múltiples monedas. Este resumen muestra solo los lotes en{" "}
            <strong>{currency}</strong>. Revisá el Resumen económico para el detalle completo.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(({ label, value, sub, icon: Icon, color, bg, border, tag }) => (
          <div key={label} className={`rounded-xl border ${border} ${bg} p-3.5 flex flex-col gap-2`}>
            <div className="flex items-start justify-between gap-1">
              <div className="w-7 h-7 rounded-lg bg-white/70 dark:bg-white/10 flex items-center justify-center shrink-0">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              {tag && (
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full leading-tight">
                  {tag}
                </span>
              )}
            </div>
            <div>
              <p className={`text-sm font-black leading-tight ${value === "—" ? "text-slate-400" : "text-slate-800 dark:text-white"}`}>
                {value}
              </p>
              <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">{label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Economic Summary ──────────────────────────────────────────────────────────

function EconomicSummarySection({ summary }: { summary: EconomicSummary }) {
  const { totalLots, lotsWithoutPrice, lotsWithoutArea, multipleCurrencies, byCurrency } = summary;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4.5 h-4.5 text-brand-600" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
            Resumen económico del desarrollo
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Valor bruto potencial, m² comercializables y estado económico por categoría de lote.
          </p>
        </div>
      </div>

      {multipleCurrencies && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
            Este desarrollo tiene lotes en distintas monedas. Los totales se muestran por separado para cada moneda.
          </p>
        </div>
      )}
      {(lotsWithoutPrice > 0 || lotsWithoutArea > 0) && (
        <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {lotsWithoutPrice > 0 && (
              <span>
                <strong>{lotsWithoutPrice}</strong> lote{lotsWithoutPrice !== 1 ? "s" : ""} sin precio cargado.{" "}
              </span>
            )}
            {lotsWithoutArea > 0 && (
              <span>
                <strong>{lotsWithoutArea}</strong> lote{lotsWithoutArea !== 1 ? "s" : ""} sin superficie cargada.{" "}
              </span>
            )}
            Los cálculos pueden ser parciales.
          </p>
        </div>
      )}
      {totalLots === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">
          No hay lotes cargados en este desarrollo todavía.
        </p>
      )}

      {byCurrency.map((cur) => (
        <EconomicCurrencyBlock
          key={cur.currency}
          data={cur}
          totalLots={totalLots}
          multipleCurrencies={multipleCurrencies}
        />
      ))}
    </div>
  );
}

function EconomicCurrencyBlock({
  data,
  totalLots,
  multipleCurrencies,
}: {
  data: EconomicSummaryByCurrency;
  totalLots: number;
  multipleCurrencies: boolean;
}) {
  const { currency, byStatus, grossValueCents, totalAreaSqm, averagePricePerSqm } = data;

  const topCards = [
    {
      label: "Valor bruto potencial",
      value: fmtAmount(grossValueCents, currency),
      sub: "Suma de lotes comercializables al precio lista",
      icon: DollarSign,
      color: "text-brand-600",
      bg: "bg-brand-50 dark:bg-brand-900/20",
      border: "border-brand-100 dark:border-brand-800",
    },
    {
      label: "m² comercializables",
      value: fmtArea(totalAreaSqm),
      sub: "Excluye lotes bloqueados",
      icon: Layers,
      color: "text-sky-600",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      border: "border-sky-100 dark:border-sky-800",
    },
    {
      label: "Total de lotes",
      value: String(multipleCurrencies ? data.totalLots : totalLots),
      sub: multipleCurrencies ? `lotes en ${currency}` : "lotes en el desarrollo",
      icon: BarChart3,
      color: "text-slate-600",
      bg: "bg-slate-50 dark:bg-slate-800/50",
      border: "border-slate-100 dark:border-slate-700",
    },
    {
      label: "Precio promedio/m²",
      value: averagePricePerSqm != null ? fmtPricePerSqm(averagePricePerSqm, currency) : "—",
      sub: averagePricePerSqm != null ? "Valor bruto ÷ m² comercializables" : "Sin datos suficientes",
      icon: TrendingDown,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-100 dark:border-purple-800",
    },
  ];

  const statusCards = [
    {
      key: "available" as const,
      label: "Disponible para vender",
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      dot: "bg-emerald-500",
    },
    {
      key: "reservedPending" as const,
      label: "Reserva pendiente",
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      dot: "bg-amber-400",
    },
    {
      key: "reserved" as const,
      label: "Reserva confirmada",
      color: "text-orange-700 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-200 dark:border-orange-800",
      dot: "bg-orange-500",
    },
    {
      key: "sold" as const,
      label: "Vendido",
      color: "text-sky-700 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      border: "border-sky-200 dark:border-sky-800",
      dot: "bg-sky-500",
    },
    {
      key: "blocked" as const,
      label: "Bloqueado",
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-50 dark:bg-slate-800/50",
      border: "border-slate-200 dark:border-slate-700",
      dot: "bg-slate-400",
    },
  ];

  return (
    <div className="space-y-3">
      {multipleCurrencies && (
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
          Lotes en {currency}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {topCards.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-xl border ${border} ${bg} p-3.5 flex flex-col gap-2`}>
            <div className="w-7 h-7 rounded-lg bg-white/70 dark:bg-white/10 flex items-center justify-center">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">{value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-tight">{label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {statusCards.map(({ key, label, color, bg, border, dot }) => {
          const group = byStatus[key];
          const hasData = group.count > 0;
          return (
            <div key={key} className={`rounded-xl border ${border} ${bg} p-3 space-y-1.5`}>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                <span className={`text-[10px] font-black uppercase tracking-wide ${color} leading-tight`}>
                  {label}
                </span>
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-white">
                {group.count}{" "}
                <span className="text-xs font-semibold text-slate-400">
                  lote{group.count !== 1 ? "s" : ""}
                </span>
              </p>
              {hasData ? (
                <>
                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                    {fmtAmount(group.valueCents, currency)}
                  </p>
                  {group.areaSqm > 0 && (
                    <p className="text-[10px] text-slate-400">{fmtArea(group.areaSqm)}</p>
                  )}
                  {key !== "blocked" && grossValueCents > 0 && (
                    <p className="text-[10px] text-slate-400">{group.percentOfGross}% del bruto</p>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-slate-400">Sin lotes</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Reports Section ───────────────────────────────────────────────────────────

function ReportsSection({
  orgSlug,
  developmentId,
}: {
  orgSlug: string;
  developmentId: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const buildUrl = (type: "expenses" | "economic-summary" | "accountant") => {
    const params = new URLSearchParams({ orgSlug, developmentId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/balance/reports/${type}?${params.toString()}`;
  };

  const reports = [
    {
      key: "expenses" as const,
      label: "Gastos y comprobantes",
      sub: "Listado detallado de todos los movimientos registrados, con estado y adjuntos.",
      icon: FileText,
      color: "text-brand-600",
      bg: "bg-brand-50 dark:bg-brand-900/20",
      border: "border-brand-100 dark:border-brand-800",
    },
    {
      key: "economic-summary" as const,
      label: "Resumen económico",
      sub: "Lotes por estado, valor bruto, m² totales y precio promedio por moneda.",
      icon: BarChart3,
      color: "text-sky-600",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      border: "border-sky-100 dark:border-sky-800",
    },
    {
      key: "accountant" as const,
      label: "Reporte para contador",
      sub: "Gastos + resumen económico en un único archivo. Listo para enviar al estudio contable.",
      icon: FileSpreadsheet,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-100 dark:border-emerald-800",
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
          <Download className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
            Reportes y exportación
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Descargá reportes en CSV compatibles con Excel y Google Sheets. Filtrá por período si necesitás un corte de fecha.
          </p>
        </div>
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            Desde
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            Hasta
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        {(from || to) && (
          <button
            onClick={() => { setFrom(""); setTo(""); }}
            className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 underline pb-1.5"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {reports.map(({ key, label, sub, icon: Icon, color, bg, border }) => (
          <a
            key={key}
            href={buildUrl(key)}
            download
            className={`group flex flex-col gap-3 rounded-xl border ${border} ${bg} p-4 transition hover:shadow-md`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/70 dark:bg-white/10 flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition mt-1 shrink-0" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">{label}</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{sub}</p>
            </div>
            <span className={`text-[10px] font-bold ${color} flex items-center gap-1`}>
              <Download className="w-3 h-3" />
              Descargar CSV
            </span>
          </a>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 leading-relaxed">
        Los reportes se generan dentro del área protegida y quedan registrados en la auditoría financiera. No se comparten con terceros ni con la plataforma.
      </p>
    </div>
  );
}

// ── Main props ────────────────────────────────────────────────────────────────

interface Props {
  orgSlug: string;
  developmentId: string;
  vault: {
    ownerName: string;
    ownerEmail: string;
    ownerEntityType: FinancialEntityType;
    lastAccessAt: Date | null;
    accessCount: number;
    activatedAt: Date;
  };
  userEmail: string;
  expenses: ExpenseRow[];
  economicSummary: EconomicSummary;
  lotEconomics: LotEconomicRow[];
}

export default function BalanceDashboard({
  orgSlug,
  developmentId,
  vault,
  userEmail,
  expenses,
  economicSummary,
  lotEconomics,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const handleLogout = () => {
    startTransition(async () => {
      await logoutFinancialVaultAction();
      toast.success("Sesión financiera cerrada.");
      router.refresh();
    });
  };

  // ── Expense KPIs ──
  const pendingExpenses = expenses.filter((e) => e.status === ExpenseStatus.PENDING);
  const approvedExpenses = expenses.filter((e) => e.status === ExpenseStatus.APPROVED);
  const activeExpenses = expenses.filter((e) => e.status !== ExpenseStatus.VOIDED);
  const expenseCurrency = expenses[0]?.currency ?? "ARS";

  const totalPendingCents = pendingExpenses.reduce((s, e) => s + e.amountCents, 0);
  const totalApprovedCents = approvedExpenses.reduce((s, e) => s + e.amountCents, 0);
  const totalActiveCents = activeExpenses.reduce((s, e) => s + e.amountCents, 0);

  const expenseKpis = [
    {
      icon: Hourglass,
      label: "Pendientes de aprobación",
      value: String(pendingExpenses.length),
      sub: pendingExpenses.length > 0
        ? fmtAmount(totalPendingCents, expenseCurrency)
        : "Sin movimientos pendientes",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-100 dark:border-amber-800",
    },
    {
      icon: CheckCircle2,
      label: "Aprobados",
      value: fmtAmount(totalApprovedCents, expenseCurrency),
      sub: `${approvedExpenses.length} gasto${approvedExpenses.length !== 1 ? "s" : ""} confirmados`,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-100 dark:border-emerald-800",
    },
    {
      icon: TrendingDown,
      label: "Total en trámite",
      value: fmtAmount(totalActiveCents, expenseCurrency),
      sub: `${activeExpenses.length} gasto${activeExpenses.length !== 1 ? "s" : ""} activos (excl. anulados)`,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-100 dark:border-purple-800",
    },
  ];

  return (
    <div className="space-y-5">
      {showExpenseForm && (
        <ExpenseForm
          orgSlug={orgSlug}
          developmentId={developmentId}
          onClose={() => setShowExpenseForm(false)}
          onCreated={() => {
            setShowExpenseForm(false);
            router.refresh();
          }}
        />
      )}

      {/* 1 — Header del vault */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                Balance y Rendición
              </h2>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                Área financiera protegida · Sesión activa
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:text-red-600 hover:border-red-200 transition disabled:opacity-60"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Responsable financiero
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
              {vault.ownerName}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {ENTITY_TYPE_LABELS[vault.ownerEntityType]}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{vault.ownerEmail}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Actividad del vault
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Último acceso:</span>{" "}
              {fmtDate(vault.lastAccessAt)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Total accesos:</span>{" "}
              {vault.accessCount}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Activado: {fmtDate(vault.activatedAt)}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-[10px] text-slate-500">
            Sesión activa como{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{userEmail}</span> · Rol:{" "}
            <span className="font-semibold text-brand-600">Responsable financiero</span>
          </p>
        </div>
      </div>

      {/* 2 — Resumen ejecutivo */}
      <ExecutiveSummarySection
        economicSummary={economicSummary}
        lotEconomics={lotEconomics}
        expenses={expenses}
      />

      {/* 3 — Resumen económico del desarrollo */}
      <EconomicSummarySection summary={economicSummary} />

      {/* 4 — Vista económica por lote */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <TableProperties className="w-4.5 h-4.5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
              Estado comercial por lote
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Precio, estado de reserva, cobrado confirmado y saldo por cobrar de cada lote del desarrollo.
            </p>
          </div>
        </div>
        <LotEconomicsTable lots={lotEconomics} orgSlug={orgSlug} />
      </div>

      {/* 5 — Gastos y comprobantes */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <Receipt className="w-4.5 h-4.5 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                Gastos y comprobantes
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {expenses.length > 0
                  ? `${expenses.length} movimiento${expenses.length !== 1 ? "s" : ""} registrado${expenses.length !== 1 ? "s" : ""}`
                  : "Sin movimientos registrados aún"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowExpenseForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Cargar gasto
          </button>
        </div>

        {/* KPI strip */}
        {expenses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {expenseKpis.map(({ icon: Icon, label, value, sub, color, bg, border }) => (
              <div key={label} className={`rounded-xl border ${border} ${bg} p-3 flex items-center gap-3`}>
                <div className="w-8 h-8 rounded-lg bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-white leading-tight truncate">{value}</p>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight">{label}</p>
                  <p className="text-[10px] text-slate-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <ExpenseTable
          orgSlug={orgSlug}
          developmentId={developmentId}
          expenses={expenses}
        />
      </div>

      {/* 6 — Reportes */}
      <ReportsSection orgSlug={orgSlug} developmentId={developmentId} />

      {/* 7 — Nota de privacidad */}
      <div className="border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-900/50">
        <p className="text-[10px] text-slate-400 leading-relaxed text-center">
          Todo acceso y operación en este módulo queda registrado en la auditoría financiera.
          Los datos de Balance y Rendición son privados del tenant y no son accesibles por la plataforma.
        </p>
      </div>
    </div>
  );
}
