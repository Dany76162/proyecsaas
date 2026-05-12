import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2, ClipboardList, FileText, Plus } from "lucide-react";

import { AgentCanvas } from "@/components/agents/agent-canvas";
import { getAgentCanvasData } from "@/modules/agents/service";

const statusCopy = {
  operational: {
    label: "Operativo",
    description: "AgentOS no registra bloqueos crÃ­ticos en el estado agregado.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  attention: {
    label: "Requiere atenciÃ³n",
    description: "Hay aprobaciones pendientes, errores recientes o tareas fallidas para revisar.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  empty: {
    label: "Sin actividad",
    description: "El canvas estÃ¡ listo. Crea una tarea para iniciar el flujo operativo.",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
} as const;

export default async function PlatformAgentsCanvasPage() {
  const data = await getAgentCanvasData();
  const status = statusCopy[data.systemStatus];

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)" }}>
      {/* â”€â”€ Header section with its own padding â”€â”€ */}
      <div className="shrink-0 space-y-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-700">
                <Activity className="h-3.5 w-3.5" />
                AgentOS Canvas
              </span>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}>
                {status.label}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Canvas Operativo Visual
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Mapa visual de agentes, tareas, borradores, aprobaciones y actividad reciente. Es una
              vista de control: no publica, no agenda y no ejecuta automatizaciones peligrosas.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-400">{status.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/platform/agents/tasks/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              Crear tarea
            </Link>
            <Link
              href="/platform/agents/approvals"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Ver aprobaciones
            </Link>
            <Link
              href="/platform/agents/logs"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Ver logs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-brand-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Tareas</p>
                <p className="text-sm font-semibold text-slate-700">Creadas desde el formulario AgentOS.</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-brand-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Borradores</p>
                <p className="text-sm font-semibold text-slate-700">Contenido para revisiÃ³n humana.</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-brand-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Aprobaciones</p>
                <p className="text-sm font-semibold text-slate-700">Control manual antes de usar contenido.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Canvas fills ALL remaining space â”€â”€ */}
      <div className="min-h-0 flex-1">
        <AgentCanvas data={data} />
      </div>
    </div>
  );
}
