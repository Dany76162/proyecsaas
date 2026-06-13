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
} from "lucide-react";
import { toast } from "sonner";
import { logoutFinancialVaultAction } from "@/modules/developments/financial-vault-actions";
import { FinancialEntityType, ExpenseStatus } from "@prisma/client";
import ExpenseForm from "./expense-form";
import ExpenseTable, { type ExpenseRow } from "./expense-table";
import type { EconomicSummary, EconomicSummaryByCurrency } from "./page";

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtArea(sqm: number) {
  return `${sqm.toLocaleString("es-AR", { maximumFractionDigits: 0 })} m²`;
}

function fmtPricePerSqm(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}/m²`;
}

// ── EconomicSummarySection ────────────────────────────────────────────────────

function EconomicSummarySection({ summary }: { summary: EconomicSummary }) {
  const { totalLots, lotsWithoutPrice, lotsWithoutArea, multipleCurrencies, byCurrency } = summary;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4.5 h-4.5 text-brand-600" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
            Resumen económico del desarrollo
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Valor bruto potencial, disponibilidad comercial y estado económico de los lotes.
          </p>
        </div>
      </div>

      {/* Warnings */}
      {multipleCurrencies && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
            Este desarrollo tiene lotes en distintas monedas. Los totales se muestran separados por moneda.
          </p>
        </div>
      )}
      {(lotsWithoutPrice > 0 || lotsWithoutArea > 0) && (
        <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {lotsWithoutPrice > 0 && (
              <span>Hay <strong>{lotsWithoutPrice}</strong> lote{lotsWithoutPrice !== 1 ? "s" : ""} sin precio cargado. </span>
            )}
            {lotsWithoutArea > 0 && (
              <span>Hay <strong>{lotsWithoutArea}</strong> lote{lotsWithoutArea !== 1 ? "s" : ""} sin superficie cargada. </span>
            )}
            El cálculo económico puede estar incompleto.
          </p>
        </div>
      )}
      {totalLots === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">No hay lotes cargados en este desarrollo.</p>
      )}

      {/* One block per currency */}
      {byCurrency.map((cur) => (
        <EconomicCurrencyBlock key={cur.currency} data={cur} totalLots={totalLots} multipleCurrencies={multipleCurrencies} />
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

  // Top KPI cards
  const topCards = [
    {
      label: "Valor bruto potencial",
      value: fmtAmount(grossValueCents, currency),
      sub: "Suma lotes comercializables",
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
      sub: multipleCurrencies ? `en ${currency}` : "en el desarrollo",
      icon: BarChart3,
      color: "text-slate-600",
      bg: "bg-slate-50 dark:bg-slate-800/50",
      border: "border-slate-100 dark:border-slate-700",
    },
    {
      label: "Promedio por m²",
      value: averagePricePerSqm != null ? fmtPricePerSqm(averagePricePerSqm, currency) : "—",
      sub: averagePricePerSqm != null ? "Valor bruto / m² total" : "Sin datos suficientes",
      icon: TrendingDown,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-100 dark:border-purple-800",
    },
  ];

  // Status cards
  const statusCards = [
    {
      key: "available" as const,
      label: "Disponible",
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
      label: "Reservado",
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

      {/* Top KPI cards — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {topCards.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-xl border ${border} ${bg} p-3.5 flex flex-col gap-2`}>
            <div className={`w-7 h-7 rounded-lg bg-white/70 dark:bg-white/10 flex items-center justify-center`}>
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

      {/* Status cards — by state */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {statusCards.map(({ key, label, color, bg, border, dot }) => {
          const group = byStatus[key];
          const hasData = group.count > 0;
          return (
            <div key={key} className={`rounded-xl border ${border} ${bg} p-3 space-y-1.5`}>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                <span className={`text-[10px] font-black uppercase tracking-wide ${color}`}>{label}</span>
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-white">
                {group.count} <span className="text-xs font-semibold text-slate-400">lote{group.count !== 1 ? "s" : ""}</span>
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
}

export default function BalanceDashboard({
  orgSlug,
  developmentId,
  vault,
  userEmail,
  expenses,
  economicSummary,
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

  // ── KPIs ──
  const pendingExpenses = expenses.filter((e) => e.status === ExpenseStatus.PENDING);
  const approvedExpenses = expenses.filter((e) => e.status === ExpenseStatus.APPROVED);
  const defaultCurrency = expenses[0]?.currency ?? "ARS";

  const totalPendingCents = pendingExpenses.reduce((s, e) => s + e.amountCents, 0);
  const totalApprovedCents = approvedExpenses.reduce((s, e) => s + e.amountCents, 0);

  const kpis = [
    {
      icon: Hourglass,
      label: "Gastos pendientes",
      value: String(pendingExpenses.length),
      sub: pendingExpenses.length > 0 ? fmtAmount(totalPendingCents, defaultCurrency) : "Sin monto pendiente",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-100 dark:border-amber-800",
    },
    {
      icon: CheckCircle2,
      label: "Gastos aprobados",
      value: String(approvedExpenses.length),
      sub: approvedExpenses.length > 0 ? fmtAmount(totalApprovedCents, defaultCurrency) : "Sin monto aprobado",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-100 dark:border-emerald-800",
    },
    {
      icon: DollarSign,
      label: "Total aprobado",
      value: fmtAmount(totalApprovedCents, defaultCurrency),
      sub: `${approvedExpenses.length} gasto${approvedExpenses.length !== 1 ? "s" : ""}`,
      color: "text-sky-600",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      border: "border-sky-100 dark:border-sky-800",
    },
    {
      icon: TrendingDown,
      label: "Total registrado",
      value: fmtAmount(
        expenses
          .filter((e) => e.status !== ExpenseStatus.VOIDED)
          .reduce((s, e) => s + e.amountCents, 0),
        defaultCurrency
      ),
      sub: `${expenses.filter((e) => e.status !== ExpenseStatus.VOIDED).length} gasto${expenses.filter((e) => e.status !== ExpenseStatus.VOIDED).length !== 1 ? "s" : ""} activos`,
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

      {/* Header del módulo */}
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

        {/* Responsable + Actividad */}
        <div className="grid grid-cols-2 gap-3">
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
                Actividad
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
            <p className="text-[10px] text-slate-400 mt-1">Activado: {fmtDate(vault.activatedAt)}</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <p className="text-[10px] text-slate-500">
            Sesión activa como{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{userEmail}</span> · Rol:{" "}
            <span className="font-semibold text-brand-600">Responsable financiero</span>
          </p>
        </div>
      </div>

      {/* Resumen económico del desarrollo */}
      <EconomicSummarySection summary={economicSummary} />

      {/* KPIs de gastos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ icon: Icon, label, value, sub, color, bg, border }) => (
          <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 flex flex-col gap-2`}>
            <div className="w-8 h-8 rounded-lg bg-white/60 dark:bg-white/10 flex items-center justify-center">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">{value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-tight">{label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gastos */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white">Gastos registrados</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{expenses.length} gasto{expenses.length !== 1 ? "s" : ""} en total</p>
          </div>
          <button
            onClick={() => setShowExpenseForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Cargar gasto
          </button>
        </div>

        <ExpenseTable
          orgSlug={orgSlug}
          developmentId={developmentId}
          expenses={expenses}
        />
      </div>

      {/* Nota de privacidad */}
      <div className="border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-900/50">
        <p className="text-[10px] text-slate-400 leading-relaxed text-center">
          Todo acceso y operación en este módulo queda registrado en la auditoría financiera. Los datos de
          Balance y Rendición son privados del tenant y no son accesibles por la plataforma.
        </p>
      </div>
    </div>
  );
}
