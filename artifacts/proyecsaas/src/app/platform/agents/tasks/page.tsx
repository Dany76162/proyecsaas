import Link from "next/link";
import { Plus, AlertTriangle, Layers, Clock, Activity, CheckCircle2, XCircle, Terminal, ClipboardList } from "lucide-react";
import { listAgentTasks } from "@/modules/agents/service";
import { prisma } from "@/server/db/prisma";
import { cn } from "@/lib/utils";

const TASK_STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  PENDING: { label: "Pendiente", className: "border-slate-200 bg-slate-50 text-slate-500", icon: Clock },
  ASSIGNED: { label: "Asignada", className: "border-blue-200 bg-blue-50 text-blue-700", icon: Activity },
  IN_PROGRESS: { label: "En progreso", className: "border-indigo-200 bg-indigo-50 text-indigo-700", icon: Terminal },
  COMPLETED: { label: "Completada", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  FAILED: { label: "Fallida", className: "border-red-200 bg-red-50 text-red-700", icon: XCircle },
  APPROVAL_PENDING: { label: "Por Aprobar", className: "border-amber-200 bg-amber-50 text-amber-700", icon: AlertTriangle },
};

export default async function PlatformAgentsTasksPage() {
  const tasks = await listAgentTasks();

  // Find the latest failed run error to display a UI alert
  const failedTask = tasks.find((t) => t.status === "FAILED");
  let failedRunError: string | null = null;
  if (failedTask) {
    const latestRun = await prisma.agentRun.findFirst({
      where: { taskId: failedTask.id, status: "FAILED" },
      orderBy: { startedAt: "desc" },
      select: { error: true },
    });
    failedRunError = latestRun?.error ?? null;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400">
             <ClipboardList className="h-5 w-5" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Workflow Management</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase">Tareas de Agentes</h1>
          <p className="text-sm font-medium text-slate-500">Supervisa y coordina las ejecuciones del Director Operativo IA.</p>
        </div>
        <Link
          href="/platform/agents/tasks/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-600/20 transition hover:bg-brand-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </Link>
      </div>

      {failedRunError && (
        <div className="flex items-center gap-4 rounded-[2rem] border border-red-200 bg-red-50/50 p-6 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
             <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-red-900 uppercase tracking-tight">Incidencia en ejecución</p>
            <p className="mt-1 text-xs font-bold text-red-700/80 truncate">Error detectado: {failedRunError}</p>
          </div>
          <Link href="/platform/agents/logs" className="hidden sm:inline-flex rounded-xl bg-red-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-red-700">
             Ver Logs
          </Link>
        </div>
      )}

      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              <tr>
                <th className="px-8 py-5">Título y Contexto</th>
                <th className="px-8 py-5">Estado Operativo</th>
                <th className="px-8 py-5">Prioridad</th>
                <th className="px-8 py-5">Agente Asignado</th>
                <th className="px-8 py-5">Embudo</th>
                <th className="px-8 py-5">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tasks.map((task) => {
                const config = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.PENDING;
                const Icon = config.icon;
                
                return (
                  <tr key={task.id} className="group transition-colors hover:bg-slate-50/30">
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-slate-900 uppercase tracking-tight group-hover:text-brand-600 transition-colors">{task.title}</span>
                        <span className="text-[11px] font-medium text-slate-400 line-clamp-1">{task.description ?? "Sin descripción adicional"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-wider",
                        config.className
                      )}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                       <span className={cn(
                         "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                         task.priority === 'HIGH' ? 'border-red-100 bg-red-50/30 text-red-600' : 
                         task.priority === 'MEDIUM' ? 'border-blue-100 bg-blue-50/30 text-blue-600' : 
                         'border-slate-100 bg-slate-50/30 text-slate-400'
                       )}>
                         {task.priority}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                             <Terminal className="h-3 w-3" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                            {task.agent?.name ?? "No asignado"}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="flex h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                           <div 
                             className={cn(
                               "h-full transition-all duration-1000",
                               task.status === 'COMPLETED' ? 'w-full bg-emerald-500' : 
                               task.status === 'FAILED' ? 'w-1/2 bg-red-500' :
                               task.status === 'IN_PROGRESS' ? 'w-3/4 bg-brand-500 animate-pulse' :
                               'w-0'
                             )}
                           />
                        </div>
                        <span className="text-[10px] font-black text-slate-400">{task.drafts.length} output</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[11px] font-bold text-slate-400">
                       {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="mx-auto flex flex-col items-center gap-4">
                       <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-200">
                          <Layers className="h-8 w-8" />
                       </div>
                       <div className="space-y-1">
                          <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Sin tareas registradas</p>
                          <p className="text-xs text-slate-300">Las ejecuciones del sistema aparecerán aquí.</p>
                       </div>
                    </div>
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

