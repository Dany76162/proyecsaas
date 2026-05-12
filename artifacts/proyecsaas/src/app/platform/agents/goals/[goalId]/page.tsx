import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Target, Activity, CheckCircle2, AlertCircle, Sparkles, Plus, Clock, BrainCircuit, ChevronRight } from "lucide-react";
import { getAgentGoalDetail } from "@/modules/agents/goals-service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import GoalSuggestionsClient from "./GoalSuggestionsClient";
import { AgentTask } from "@prisma/client";

export default async function GoalDetailPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  const goal = await getAgentGoalDetail(goalId);

  if (!goal) notFound();

  const statusColors = {
    PENDING: "text-slate-400 bg-slate-50 border-slate-100",
    IN_PROGRESS: "text-blue-600 bg-blue-50 border-blue-100",
    COMPLETED: "text-emerald-600 bg-emerald-50 border-emerald-100",
    PAUSED: "text-amber-600 bg-amber-50 border-amber-100",
    FAILED: "text-red-600 bg-red-50 border-red-100",
  };

  const tasksByStatus = {
    PENDING: goal.tasks.filter((t: AgentTask) => t.status === 'PENDING').length,
    ASSIGNED: goal.tasks.filter((t: AgentTask) => t.status === 'ASSIGNED').length,
    IN_PROGRESS: goal.tasks.filter((t: AgentTask) => t.status === 'IN_PROGRESS').length,
    APPROVAL_PENDING: goal.tasks.filter((t: AgentTask) => t.status === 'APPROVAL_PENDING').length,
    COMPLETED: goal.tasks.filter((t: AgentTask) => t.status === 'COMPLETED').length,
    FAILED: goal.tasks.filter((t: AgentTask) => t.status === 'FAILED').length,
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-4">
        <Link 
          href="/platform/agents/goals" 
          className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 transition hover:text-brand-600"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver a objetivos
        </Link>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest", statusColors[goal.status as keyof typeof statusColors])}>
                {goal.status}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: {goal.id.slice(-8)}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 uppercase">{goal.title}</h1>
            <p className="max-w-2xl text-sm font-medium text-slate-500 leading-relaxed">
              {goal.description || "Sin descripción adicional."}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:w-64">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progreso</span>
                <span className="text-lg font-black text-slate-950">{goal.progress}%</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
                <div 
                  className="h-full bg-brand-600 transition-all duration-1000" 
                  style={{ width: `${goal.progress}%` }} 
                />
              </div>
              <p className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-widest">
                {tasksByStatus.COMPLETED} de {goal.tasks.length} tareas listas
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Tareas Desglosadas</h2>
              <Link 
                href={`/platform/agents/tasks/new?goalId=${goal.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva tarea manual
              </Link>
            </div>

            <div className="space-y-3">
              {goal.tasks.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-100 p-12 text-center">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay tareas asociadas aún</p>
                </div>
              ) : (
                goal.tasks.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        task.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                      )}>
                        {task.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-950">{task.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <span>{task.agent?.name || "Sin asignar"}</span>
                          <span>•</span>
                          <span>{task.status}</span>
                        </div>
                      </div>
                    </div>
                    <Link 
                      href={`/platform/agents/tasks?id=${task.id}`}
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-brand-600">
                <BrainCircuit className="h-6 w-6" />
                <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight">Director Operativo</h3>
              </div>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                El Director Operativo IA puede analizar este objetivo y proponer un desglose de tareas accionables para el equipo.
              </p>
              
              <GoalSuggestionsClient goalId={goal.id} />
           </section>

           <section className="rounded-[2.5rem] bg-slate-900 p-8 text-white space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400">Detalles de Operación</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{goal.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prioridad</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{goal.priority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Creado</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{format(goal.createdAt, "d MMM, yyyy", { locale: es })}</span>
                </div>
                {goal.targetDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Meta</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-400">{format(goal.targetDate, "d MMM", { locale: es })}</span>
                  </div>
                )}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
