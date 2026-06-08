"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Zap, Clock, Play, Pause, ChevronRight, Activity, Calendar, Bot, Target, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { runAutomationNowAction, toggleAutomationAction, runDueAutomationsAction } from "@/modules/agents/actions";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function AutomationListClient({ initialAutomations }: { initialAutomations: any[] }) {
  const [automations, setAutomations] = useState(initialAutomations);
  const [running, setRunning] = useState<string | null>(null);

  async function handleRunNow(id: string) {
    try {
      setRunning(id);
      await runAutomationNowAction(id);
      toast.success("Tarea generada correctamente");
    } catch (err) {
      toast.error("Error al ejecutar automatización");
    } finally {
      setRunning(null);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      await toggleAutomationAction(id, active);
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, isActive: active, status: active ? "ACTIVE" : "PAUSED" } : a));
      toast.success(active ? "Automatización activada" : "Automatización pausada");
    } catch (err) {
      toast.error("Error al cambiar estado");
    }
  }

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

  const handleRunDue = async () => {
    try {
      const results = await runDueAutomationsAction();
      toast.success(`Scheduler: ${results.processed} automatizaciones procesadas, ${results.tasksCreated} tareas creadas.`);
    } catch (err) {
      toast.error("Error al ejecutar scheduler");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleRunDue}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 hover:shadow-sm"
        >
          <RefreshCw className="h-3 w-3" />
          Revisar vencidas ahora
        </button>
      </div>

      <div className="grid gap-6">
      {automations.map((auto) => {
        const Icon = typeIcons[auto.type] || Bot;
        const isActive = auto.isActive;

        return (
          <div
            key={auto.id}
            className={cn(
              "group relative overflow-hidden rounded-[2.5rem] border bg-white p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50",
              !isActive && "opacity-60"
            )}
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-1 items-start gap-6">
                <div className={cn(
                  "flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] shadow-sm transition-transform group-hover:scale-110",
                  isActive ? "bg-brand-50 text-brand-600" : "bg-slate-50 text-slate-400"
                )}>
                  <Icon className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">{auto.title}</h3>
                    <span className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                      isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {isActive ? "Activa" : "Pausada"}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-500 line-clamp-2">
                    {auto.description || "Sin descripción"}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 border border-slate-100">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        {freqLabels[auto.frequency]} {auto.dayOfWeek !== null && auto.dayOfWeek !== undefined ? `(Día ${auto.dayOfWeek})` : ""} {auto.timeOfDay || ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 border border-slate-100">
                      <Bot className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        {auto.agent?.name || "Orquestador"}
                      </span>
                    </div>
                    {auto.goal && (
                      <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 border border-slate-100">
                        <Target className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Meta: {auto.goal.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-start">
                <button
                  onClick={() => handleToggle(auto.id, !isActive)}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300",
                    isActive 
                      ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-amber-600" 
                      : "border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100"
                  )}
                  title={isActive ? "Pausar" : "Activar"}
                >
                  {isActive ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => handleRunNow(auto.id)}
                  disabled={running === auto.id}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-slate-950 px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-950/10 transition-all hover:bg-slate-800 disabled:opacity-50"
                >
                  {running === auto.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Ejecutar ahora
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-slate-50 pt-6">
              <div className="flex items-center gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Última ejecución</p>
                  <p className="text-xs font-bold text-slate-600 tracking-tight">
                    {auto.lastRunAt ? format(new Date(auto.lastRunAt), "d MMM, HH:mm", { locale: es }) : "Nunca"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próxima ejecución</p>
                  <p className="text-xs font-bold text-slate-600 tracking-tight">
                    {auto.nextRunAt ? format(new Date(auto.nextRunAt), "d MMM, HH:mm", { locale: es }) : "Manual"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tareas creadas</p>
                  <p className="text-xs font-bold text-slate-600 tracking-tight">{auto._count.tasks}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
