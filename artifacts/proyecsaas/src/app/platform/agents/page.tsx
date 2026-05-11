import Link from "next/link";
import { ArrowRight, Layers, FileText, CheckCircle2, Activity, Clock, Network } from "lucide-react";
import { getAgentDashboardSummary } from "@/modules/agents/service";

export default async function PlatformAgentsPage() {
  const summary = await getAgentDashboardSummary();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">AgentOS MVP</h1>
        <p className="text-sm text-slate-500">
          Centro de operaciones de agentes IA para Superadmin. Administra tareas, borradores y aprobaciones.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 mb-3">
            <Layers className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Tareas</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{summary.totalTasks}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 mb-3">
            <FileText className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Borradores</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{summary.draftCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 mb-3">
            <Activity className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Pendiente</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{summary.pendingApproval}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 mb-3">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Agentes activos</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{summary.activeAgents}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Link
          href="/platform/agents/canvas"
          className="rounded-3xl border border-brand-200 bg-brand-50 p-6 text-slate-900 shadow-sm transition hover:border-brand-300"
        >
          <div className="flex items-center gap-3 text-brand-700 mb-4">
            <Network className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.2em]">Canvas</span>
          </div>
          <p className="text-sm text-slate-700">Visualiza el flujo operativo de agentes, tareas, aprobaciones y logs.</p>
          <div className="mt-6 flex items-center justify-between text-sm font-semibold text-blue-700">
            Abrir canvas <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/tasks"
          className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition hover:border-slate-300"
        >
          <div className="flex items-center gap-3 text-slate-500 mb-4">
            <Clock className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.2em]">Tareas</span>
          </div>
          <p className="text-sm text-slate-600">Revisa, crea y gestiona el flujo de tareas de AgentOS.</p>
          <div className="mt-6 flex items-center justify-between text-sm font-semibold text-blue-600">
            Ver tareas <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/content"
          className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition hover:border-slate-300"
        >
          <div className="flex items-center gap-3 text-slate-500 mb-4">
            <FileText className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.2em]">Contenido</span>
          </div>
          <p className="text-sm text-slate-600">Visualiza los borradores generados por el Agente de Marketing.</p>
          <div className="mt-6 flex items-center justify-between text-sm font-semibold text-blue-600">
            Ver contenido <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/approvals"
          className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition hover:border-slate-300"
        >
          <div className="flex items-center gap-3 text-slate-500 mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.2em]">Aprobaciones</span>
          </div>
          <p className="text-sm text-slate-600">Aprueba o rechaza el contenido antes de usarlo manualmente.</p>
          <div className="mt-6 flex items-center justify-between text-sm font-semibold text-blue-600">
            Ver aprobaciones <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
