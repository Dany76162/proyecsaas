import { DollarSign, Zap, Activity } from "lucide-react";

import type { AiCostSummary } from "./ai-cost";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR").format(value);
}

export function AiCostPanel({ summary }: { summary: AiCostSummary }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
          Costo de IA — últimos {summary.windowDays} días
        </h2>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <DollarSign className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Costo total</span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatUsd(summary.totalCostUsd)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-brand-600">
            <Zap className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tokens</span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatNumber(summary.totalTokens)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-violet-600">
            <Activity className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Llamadas IA</span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatNumber(summary.totalCalls)}
          </p>
        </div>
      </div>

      {/* Tabla por tenant */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Cliente</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Llamadas</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Tokens</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Costo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                  Todavía no hay consumo de IA registrado en este período.
                </td>
              </tr>
            ) : (
              summary.rows.map((row) => (
                <tr key={row.organizationId ?? "platform"} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-semibold text-slate-900">{row.organizationName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{formatNumber(row.calls)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{formatNumber(row.totalTokens)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatUsd(row.costUsd)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
