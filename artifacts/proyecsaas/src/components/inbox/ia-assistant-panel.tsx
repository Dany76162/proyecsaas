import { cn } from "@/lib/utils";
import { Sparkles, Target, Zap, ArrowRight, Home } from "lucide-react";
import { StatusBadge } from "@/components/workspace/status-badge";

type IaAssistantPanelProps = {
  summary?: string | null;
  intent?: string | null;
  reasons?: string[];
  signals?: string[];
  nextAction?: string | null;
  className?: string;
};

export function IaAssistantPanel({
  summary,
  intent,
  reasons = [],
  signals = [],
  nextAction,
  className,
}: IaAssistantPanelProps) {
  if (!summary && !reasons.length && !nextAction) return null;

  return (
    <div className={cn("space-y-4 rounded-2xl border border-brand-100 bg-brand-50/30 p-5", className)}>
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-900">
          Asistente IA
        </h4>
        <StatusBadge label="Analizando" tone="info" dot className="ml-auto" />
      </div>

      {summary && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Resumen operativo</p>
            <p className="text-[15px] font-semibold leading-relaxed text-slate-700 italic">
            "{summary}"
          </p>
        </div>
      )}

      {(signals.length > 0 || intent) && (
        <div className="flex flex-wrap gap-1.5">
          {intent && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 shadow-sm ring-1 ring-brand-100">
              <Target className="h-3 w-3" />
              Intención: {intent}
            </span>
          )}
          {signals.map((s) => (
              <span key={s} className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
              {s}
            </span>
          ))}
        </div>
      )}

      {reasons.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Puntos clave detectados</p>
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-xs font-medium leading-relaxed text-slate-700">
                <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextAction && (
        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-brand-100">
          <div className="flex items-center gap-2 text-brand-600 mb-1">
            <Zap className="h-3.5 w-3.5" />
            <p className="text-[11px] font-extrabold uppercase tracking-widest">Sugerencia de acción</p>
          </div>
          <p className="text-sm font-bold text-slate-900 leading-tight">
            {nextAction}
          </p>
        </div>
      )}
    </div>
  );
}
