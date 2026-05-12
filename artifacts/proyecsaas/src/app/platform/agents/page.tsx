import Link from "next/link";
import { ArrowRight, Layers, FileText, CheckCircle2, Activity, Clock, Network, Terminal, Plus, ShieldCheck, AlertCircle, Target, Zap } from "lucide-react";
import { getAgentDashboardSummary } from "@/modules/agents/service";
import { cn } from "@/lib/utils";

export default async function PlatformAgentsPage() {
  const summary = await getAgentDashboardSummary();

  const metrics = [
    { label: "Objetivos Activos", value: summary.activeGoals, icon: Target, color: "text-brand-600 bg-brand-50" },
    { label: "Automatizaciones", value: summary.activeAutomations, icon: Zap, color: "text-amber-600 bg-amber-50" },
    { label: "Tareas Totales", value: summary.totalTasks, icon: Layers, color: "text-blue-600 bg-blue-50" },
    { label: "Por Aprobar", value: summary.pendingApproval, icon: Activity, color: (summary.pendingApproval ?? 0) > 0 ? "text-amber-600 bg-amber-50 animate-pulse" : "text-slate-400 bg-slate-50" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-brand-600">
             <Terminal className="h-5 w-5" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">System Overview</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 uppercase">AgentOS 2.4 <span className="text-brand-600">PRO</span></h1>
          <p className="text-sm font-medium text-slate-500">
            Estrategia operativa y gestión de agentes para administración de plataforma.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/platform/agents/automations/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-600/20 transition hover:bg-brand-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nueva automatización
          </Link>
          <Link
            href="/platform/agents/canvas"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <Network className="h-4 w-4" />
            Canvas
          </Link>
        </div>
      </div>

      {summary.hasOpenAIQuotaError && (
        <div className="flex items-center gap-4 rounded-[2rem] border border-red-200 bg-red-50/50 p-6 animate-pulse">
           <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertCircle className="h-6 w-6" />
           </div>
           <div className="flex-1">
              <p className="text-sm font-black text-red-900 uppercase tracking-tight">Limitación de Cuota Detectada</p>
              <p className="text-xs font-bold text-red-700/80">La generación de contenido está temporalmente limitada por cuota de OpenAI. El sistema registró el error y mantiene la operación segura.</p>
           </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
            <div className={cn("mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-transparent transition-all group-hover:scale-110", m.color)}>
               <m.icon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{m.label}</p>
              <p className="text-4xl font-black text-slate-900">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Link
          href="/platform/agents/goals"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
               <Target className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Objetivos</h3>
            <p className="text-sm leading-relaxed text-slate-500 font-medium">
              Define metas estratégicas para RaicesPilot y deja que el Director Operativo IA planifique las tareas.
            </p>
          </div>
          <div className="mt-10 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
            Ver estrategia <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/library"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
               <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Biblioteca</h3>
            <p className="text-sm leading-relaxed text-slate-500 font-medium">
              Gestiona el equipo de agentes disponibles, sus roles, capacidades y estado de activación.
            </p>
          </div>
          <div className="mt-10 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
            Equipo de Agentes <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/approvals"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
               <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Aprobaciones</h3>
            <p className="text-sm leading-relaxed text-slate-500 font-medium">
              Control humano centralizado. Valida borradores generados por los agentes antes de su uso.
            </p>
          </div>
          <div className="mt-10 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
            Revisar pendientes <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         <section className="rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">Efficiency Insights</p>
                  <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Métricas Operativas</h3>
               </div>
               <div className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Últimos 7 días
               </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
               <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tasa de Aprobación</p>
                  <div className="flex items-end gap-2">
                     <p className="text-3xl font-black text-slate-900">{summary.approvalRate.toFixed(1)}%</p>
                     <span className="mb-1 text-[10px] font-bold text-emerald-600">Avg Quality</span>
                  </div>
               </div>
               <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tiempo de Revisión</p>
                  <div className="flex items-end gap-2">
                     <p className="text-3xl font-black text-slate-900">
                        {summary.avgApprovalTimeMinutes ? `${summary.avgApprovalTimeMinutes.toFixed(0)}m` : '---'}
                     </p>
                     <span className="mb-1 text-[10px] font-bold text-blue-600">Response Time</span>
                  </div>
               </div>
               <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Throughput</p>
                  <div className="flex items-end gap-2">
                     <p className="text-3xl font-black text-slate-900">{summary.completedLast7Days}</p>
                     <span className="mb-1 text-[10px] font-bold text-indigo-600">Tasks / week</span>
                  </div>
               </div>
               <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Errores Críticos</p>
                  <div className="flex items-end gap-2">
                     <p className={cn("text-3xl font-black", summary.recentErrors > 0 ? "text-red-600" : "text-slate-900")}>
                        {summary.recentErrors}
                     </p>
                     <span className="mb-1 text-[10px] font-bold text-slate-400">System Stability</span>
                  </div>
               </div>
            </div>
         </section>

         <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="rounded-3xl border border-emerald-100 bg-emerald-50/30 p-6 flex flex-col justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Aprobados</p>
                  <p className="mt-2 text-3xl font-black text-emerald-950">{summary.approvedCount}</p>
               </div>
               <div className="rounded-3xl border border-red-100 bg-red-50/30 p-6 flex flex-col justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Rechazados</p>
                  <p className="mt-2 text-3xl font-black text-red-950">{summary.rejectedCount}</p>
               </div>
            </div>
            <Link
               href="/platform/agents/automations"
               className="rounded-[2.5rem] border border-slate-200 bg-slate-900 p-8 text-white relative overflow-hidden group block transition-all hover:shadow-2xl hover:shadow-slate-900/40"
            >
               <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2">
                     <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
                        <Zap className="h-4 w-4 fill-current" />
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400">Status: {summary.activeAutomations} Active</p>
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-tight">Automatizaciones Controladas</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">
                    Programa tareas recurrentes de forma segura. El sistema no publica contenido sin revisión.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-400 group-hover:translate-x-1 transition-transform">
                     Gestionar reglas <ArrowRight className="h-3 w-3" />
                  </div>
               </div>
               <Zap className="absolute -right-4 -bottom-4 h-32 w-32 text-white/5 group-hover:scale-110 transition-transform duration-700" />
            </Link>
         </div>
      </div>

      {summary.pendingApproval > 0 && !summary.hasOpenAIQuotaError && (
        <div className="flex items-center gap-4 rounded-[2rem] border border-amber-200 bg-amber-50/50 p-6">
           <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <AlertCircle className="h-5 w-5" />
           </div>
           <div className="flex-1">
              <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Acción requerida</p>
              <p className="text-xs font-bold text-amber-700/80">Hay {summary.pendingApproval} borradores esperando tu aprobación para completar el flujo operativo.</p>
           </div>
           <Link href="/platform/agents/approvals" className="rounded-xl bg-amber-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700">
              Revisar ahora
           </Link>
        </div>
      )}
    </div>
  );
}
