import { Users, ShieldCheck, Eye } from "lucide-react";
import type { AgentSpecialistReport, AgentSpecialistStatus } from "@/modules/agents/service";

const STATUS_STYLES: Record<AgentSpecialistStatus, { label: string; chip: string; dot: string }> = {
  OK: { label: "OK", chip: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  ATENCION: { label: "Atención", chip: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  CRITICO: { label: "Crítico", chip: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" },
  SIN_DATO: { label: "Sin dato", chip: "border-slate-200 bg-slate-100 text-slate-500", dot: "bg-slate-400" },
};

export default function AgentSpecialistsPanel({ reports }: { reports: AgentSpecialistReport[] }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-indigo-600">
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Equipo de especialistas IA</span>
        </div>
        <p className="text-sm font-medium text-slate-500">
          Diagnósticos read-only por área. Los especialistas analizan señales reales y proponen prioridades bajo supervisión humana.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => {
          const s = STATUS_STYLES[r.status];
          return (
            <div key={r.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {/* Header: nombre + estado */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{r.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{r.area}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shrink-0 ${s.chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </div>

              {/* Resumen */}
              <p className="mt-3 text-sm font-semibold text-slate-700">{r.summary}</p>

              {/* Hallazgos */}
              {r.findings.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {r.findings.map((f, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-500">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Recomendación */}
              <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-0.5">Recomendación</p>
                <p className="text-xs font-semibold text-slate-700">{r.recommendation}</p>
              </div>

              {/* Footer: fuente + actualización + badges */}
              <div className="mt-auto pt-3 space-y-2">
                <p className="text-[10px] text-slate-400">
                  Fuente: <span className="font-semibold text-slate-500">{r.source}</span>
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <Eye className="h-3 w-3" /> Solo lectura
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700">
                    <ShieldCheck className="h-3 w-3" /> HITL
                  </span>
                  <span className="text-[9px] text-slate-300" suppressHydrationWarning>
                    {new Date(r.lastUpdatedAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] font-medium text-slate-400">
        Los especialistas son módulos de análisis del Director IA en modo solo lectura (HITL): no ejecutan acciones, no escriben en la base de datos ni envían mensajes. Cualquier acción requiere decisión humana.
      </p>
    </section>
  );
}
