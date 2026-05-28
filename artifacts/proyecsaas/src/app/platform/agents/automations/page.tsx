import Link from "next/link";
import { Plus, Zap, Clock, Play, Pause, ChevronRight, Activity, Calendar, Bot, Target } from "lucide-react";
import { listAgentAutomations } from "@/modules/agents/automations-service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AutomationListClient from "./AutomationListClient";

export default async function AgentAutomationsPage() {
  const automations = await listAgentAutomations();

  const typeIcons: Record<string, any> = {
    CONTENT: Zap,
    REPORT: Activity,
    GOAL_REVIEW: Target,
    AUDIT: Activity,
    CUSTOM: Bot,
  };

  const freqLabels: Record<string, string> = {
    DAILY: "Diaria",
    WEEKLY: "Semanal",
    MONTHLY: "Mensual",
    MANUAL: "Manual",
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-brand-600">
            <Zap className="h-5 w-5 fill-current" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Automatización Controlada</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 uppercase">Automatizaciones <span className="text-brand-600">IA</span></h1>
          <p className="text-sm font-medium text-slate-500">
            Reglas para la creación automática de tareas internas. Nada se publica sin aprobación.
          </p>
        </div>

        <Link
          href="/platform/agents/automations/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-600/20 transition hover:bg-brand-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Nueva automatización
        </Link>
      </div>

      <div className="grid gap-6">
        {automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm">
              <Zap className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Sin automatizaciones activas</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
              Programa la creación de tareas recurrentes para que tus agentes IA trabajen de forma constante.
            </p>
            <Link
              href="/platform/agents/automations/new"
              className="mt-8 rounded-2xl border border-slate-200 bg-white px-8 py-3 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Crear primera regla
            </Link>
          </div>
        ) : (
          <AutomationListClient initialAutomations={automations as any} />
        )}
      </div>
    </div>
  );
}
