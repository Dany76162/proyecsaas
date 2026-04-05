"use client";

import { useState, useTransition } from "react";
import { UserPlus, CalendarCheck, MessageCircle, Bot, Loader2 } from "lucide-react";
import { getImpactMetrics, type ImpactMetrics, type ImpactPeriod } from "./analytics-actions";
import { cn } from "@/lib/utils";

const PERIODS: { value: ImpactPeriod; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "Este mes" },
  { value: "365d", label: "Este año" },
];

function AgentBadge({ status }: { status: "ACTIVE" | "PAUSED" | "DRAFT" | null }) {
  if (!status) return <span className="text-xs text-slate-400">Sin agente</span>;
  if (status === "ACTIVE")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Activo
      </span>
    );
  if (status === "PAUSED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Pausado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Borrador
    </span>
  );
}

export default function ImpactSection({ initial }: { initial: ImpactMetrics }) {
  const [period, setPeriod] = useState<ImpactPeriod>("30d");
  const [data, setData] = useState<ImpactMetrics>(initial);
  const [isPending, startTransition] = useTransition();

  const handlePeriod = (p: ImpactPeriod) => {
    if (p === period) return;
    setPeriod(p);
    startTransition(async () => {
      const result = await getImpactMetrics(p);
      setData(result);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Rendimiento del Sistema</h2>
          <p className="text-sm text-slate-500">
            Actividad real de cada inmobiliaria y estado de los agentes IA.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriod(p.value)}
              disabled={isPending}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-bold transition-all",
                period === p.value
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-3 gap-4 relative">
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        )}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-500 mb-3">
            <UserPlus className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Leads</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
              {data.totals.leads}
            </span>
            <span className="text-sm text-slate-400">capturados</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500 mb-3">
            <CalendarCheck className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Visitas</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
              {data.totals.visits}
            </span>
            <span className="text-sm text-slate-400">concretadas</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-violet-500 mb-3">
            <MessageCircle className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversaciones</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
              {data.totals.conversations}
            </span>
            <span className="text-sm text-slate-400">iniciadas</span>
          </div>
        </div>
      </div>

      {/* Per-org table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b bg-slate-50 px-6 py-4 flex items-center gap-2">
          <Bot className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-800">Detalle por Inmobiliaria</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Inmobiliaria
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Leads
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Visitas
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Convs.
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Agente IA
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  WhatsApp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.byOrg.map((row) => (
                <tr key={row.orgId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{row.orgName}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn(
                      "font-bold",
                      row.leads > 0 ? "text-indigo-600" : "text-slate-300"
                    )}>
                      {row.leads}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn(
                      "font-bold",
                      row.visits > 0 ? "text-emerald-600" : "text-slate-300"
                    )}>
                      {row.visits}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn(
                      "font-bold",
                      row.conversations > 0 ? "text-violet-600" : "text-slate-300"
                    )}>
                      {row.conversations}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <AgentBadge status={row.agentStatus} />
                      {row.agentName && (
                        <span className="text-xs text-slate-400">{row.agentName}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-mono">
                    {row.whatsappPhone ?? "—"}
                  </td>
                </tr>
              ))}
              {data.byOrg.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                    Sin organizaciones activas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
