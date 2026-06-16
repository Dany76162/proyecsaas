import { DollarSign, Zap, Activity, AlertTriangle, AlertCircle } from "lucide-react";

import type { AiCostSummary, AiCostStatus } from "./ai-cost";
import { OrgLimitInput } from "./OrgLimitInput";

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

const STATUS_STYLES: Record<AiCostStatus, { label: string; cls: string }> = {
  ok: { label: "OK", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  warning: { label: "Cerca del límite", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  over: { label: "Excedido", cls: "bg-red-50 text-red-700 border-red-200" },
};

export function AiCostPanel({ summary }: { summary: AiCostSummary }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
          Costo de IA — {summary.monthLabel}
        </h2>
      </div>

      {/* Alertas de consumo */}
      {summary.overCount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">
            <strong>{summary.overCount}</strong> cliente{summary.overCount !== 1 ? "s" : ""} superó su
            límite mensual de costo de IA este mes. Revisá el detalle abajo.
          </p>
        </div>
      )}
      {summary.overCount === 0 && summary.warningCount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            <strong>{summary.warningCount}</strong> cliente{summary.warningCount !== 1 ? "s" : ""} está
            cerca de su límite mensual (≥ 80%).
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <DollarSign className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Costo del mes</span>
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
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Cliente</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Llamadas</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Tokens</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Costo</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Límite/mes</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Uso</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                  Todavía no hay consumo de IA registrado este mes.
                </td>
              </tr>
            ) : (
              summary.rows.map((row) => {
                const style = STATUS_STYLES[row.status];
                return (
                  <tr key={row.organizationId ?? "platform"} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {row.organizationName}
                      {row.organizationId && row.hasCustomLimit && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                          límite propio
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{formatNumber(row.calls)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{formatNumber(row.totalTokens)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatUsd(row.costUsd)}</td>
                    <td className="px-4 py-3">
                      {row.organizationId ? (
                        <OrgLimitInput
                          organizationId={row.organizationId}
                          initialLimit={row.hasCustomLimit ? row.limitUsd : null}
                          defaultLimit={summary.defaultLimitUsd}
                        />
                      ) : (
                        <p className="text-right text-xs text-slate-300">—</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {row.pctUsed != null ? `${Math.round(row.pctUsed * 100)}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.organizationId ? (
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${style.cls}`}>
                          {style.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Límite por defecto: {formatUsd(summary.defaultLimitUsd)}/mes. Editá el límite por cliente en la columna
        "Límite/mes" (vacío = usa el default). Las alertas son informativas; no cortan el servicio de IA.
      </p>
    </section>
  );
}
