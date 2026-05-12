import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
import { listAgentTasks } from "@/modules/agents/service";
import { prisma } from "@/server/db/prisma";

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  ASSIGNED: "Asignada",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completada",
  FAILED: "Fallida",
  APPROVAL_PENDING: "Pendiente de aprobaciÃ³n",
};

function statusClasses(status: string) {
  switch (status) {
    case "FAILED":
      return "bg-red-100 text-red-700";
    case "APPROVAL_PENDING":
      return "bg-amber-100 text-amber-700";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

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
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tareas AgentOS</h1>
          <p className="text-sm text-slate-500">Crea y supervisa la generaciÃ³n de contenido con el Director Operativo IA.</p>
          <p className="mt-1 text-[10px] text-slate-400 italic">Este MVP genera un borrador por ejecuciÃ³n.</p>
        </div>
        <Link
          href="/platform/agents/tasks/new"
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Crear tarea
        </Link>
      </div>

      {failedRunError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              No se pudo generar contenido
            </p>
            <p className="mt-1 text-xs text-red-600">{failedRunError}</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold">TÃ­tulo</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Prioridad</th>
                <th className="px-6 py-4 font-semibold">Agente</th>
                <th className="px-6 py-4 font-semibold">Borradores</th>
                <th className="px-6 py-4 font-semibold">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-6 py-4 text-slate-900">
                    <div className="font-semibold">{task.title}</div>
                    <div className="text-xs text-slate-500">{task.description ?? "Sin descripciÃ³n"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusClasses(task.status)}`}>
                      {TASK_STATUS_LABELS[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{task.priority}</td>
                  <td className="px-6 py-4">{task.agent?.name ?? "Sin asignar"}</td>
                  <td className="px-6 py-4">{task.drafts.length}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(task.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No hay tareas creadas todavÃ­a.
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
