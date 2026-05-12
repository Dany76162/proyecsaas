import Link from "next/link";
import { Plus, Target, Clock, CheckCircle2, ChevronRight, Activity, TrendingUp } from "lucide-react";
import { listAgentGoals } from "@/modules/agents/goals-service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function AgentGoalsPage() {
  const goals = await listAgentGoals();

  const statusColors = {
    PENDING: "text-slate-400 bg-slate-50 border-slate-100",
    IN_PROGRESS: "text-blue-600 bg-blue-50 border-blue-100",
    COMPLETED: "text-emerald-600 bg-emerald-50 border-emerald-100",
    PAUSED: "text-amber-600 bg-amber-50 border-amber-100",
    FAILED: "text-red-600 bg-red-50 border-red-100",
  };

  const typeColors = {
    MARKETING: "bg-indigo-500",
    OPERATIONS: "bg-blue-500",
    ONBOARDING: "bg-emerald-500",
    COMMERCIAL: "bg-amber-500",
    AUDIT: "bg-rose-500",
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-brand-600">
            <Target className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Strategy</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 uppercase">Objetivos <span className="text-brand-600">IA</span></h1>
          <p className="text-sm font-medium text-slate-500">
            Metas estratégicas divididas en tareas accionables por el Director Operativo.
          </p>
        </div>

        <Link
          href="/platform/agents/goals/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-600/20 transition hover:bg-brand-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Nuevo objetivo
        </Link>
      </div>

      <div className="grid gap-6">
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm">
              <Target className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Sin objetivos activos</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
              Comienza creando un objetivo estratégico para que el Director Operativo IA pueda planificar las tareas necesarias.
            </p>
            <Link
              href="/platform/agents/goals/new"
              className="mt-8 rounded-2xl border border-slate-200 bg-white px-8 py-3 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Crear primer objetivo
            </Link>
          </div>
        ) : (
          goals.map((goal: any) => (
            <Link
              key={goal.id}
              href={`/platform/agents/goals/${goal.id}`}
              className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 transition-all hover:border-brand-200 hover:shadow-xl md:flex-row md:items-center md:gap-10"
            >
              <div className="absolute left-0 top-0 h-full w-2 transition-all group-hover:w-3" style={{ backgroundColor: "var(--brand-600)" }} />
              
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn("h-2.5 w-2.5 rounded-full", typeColors[goal.type as keyof typeof typeColors])} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{goal.type}</span>
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest", statusColors[goal.status as keyof typeof statusColors])}>
                    {goal.status}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight group-hover:text-brand-600 transition-colors">{goal.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">{goal.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span className="text-[11px] font-bold">{format(goal.createdAt, "d MMM, yyyy", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[11px] font-bold">{goal._count.tasks} tareas asociadas</span>
                  </div>
                  {goal.targetDate && (
                    <div className="flex items-center gap-2 text-brand-600">
                      <Plus className="h-4 w-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Meta: {format(goal.targetDate, "d MMM", { locale: es })}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 shrink-0 md:mt-0 md:w-64">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progreso</span>
                    <span className="text-sm font-black text-slate-950">{goal.progress}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div 
                      className="h-full bg-brand-600 transition-all duration-1000 ease-out" 
                      style={{ width: `${goal.progress}%` }} 
                    />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="text-blue-600">{goal.tasks.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length} active</span>
                    <span className="text-emerald-600">{goal.tasks.filter((t: any) => t.status === 'COMPLETED').length} done</span>
                  </div>
                  </div>
                </div>
              </div>

              <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 transition-all group-hover:translate-x-2 group-hover:opacity-100 hidden md:block">
                <ChevronRight className="h-6 w-6 text-brand-600" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
