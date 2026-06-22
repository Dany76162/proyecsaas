import Link from "next/link";
import { 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  Activity, 
  Network, 
  Terminal, 
  Plus, 
  ShieldCheck, 
  AlertCircle, 
  Target,
  Zap,
  Calendar,
  Share2,
  Rocket,
  Link2,
  FileText,
  ListChecks,
  BookOpen
} from "lucide-react";
import { getAgentDashboardSummary, getDirectorAgentStatus, getExecutiveMetrics } from "@/modules/agents/service";
import { cn } from "@/lib/utils";
import DirectorPanelClient from "./DirectorPanelClient";

export default async function PlatformAgentsPage() {
  const [summary, directorStatus, executiveMetrics] = await Promise.all([
    getAgentDashboardSummary(),
    getDirectorAgentStatus(),
    getExecutiveMetrics(),
  ]);

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
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Centro de Mando Operativo</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 uppercase">AgentOS — <span className="text-brand-600">Director IA</span></h1>
          <p className="text-sm font-medium text-slate-500">
            Centro de dirección IA para supervisar activación, soporte, costos, operaciones, QA y próximas acciones de Raíces Pilot.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/platform/activation"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 active:scale-95"
          >
            Activación
          </Link>
          <Link
            href="/platform/support"
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95"
          >
            Soporte B2B
          </Link>
          <Link
            href="/platform/qa"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-800/20 transition hover:bg-slate-900 active:scale-95"
          >
            QA
          </Link>
          <Link
            href="/platform/ai-operations"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
          >
            Operaciones IA
          </Link>
          <Link
            href="/platform/agents/canvas"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <Network className="h-3 w-3" />
            Canvas
          </Link>
        </div>
      </div>

      {/* ── Director Operativo IA — Fase 4A ── */}
      <DirectorPanelClient initialStatus={directorStatus} executiveMetrics={executiveMetrics} />

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/platform/agents/goals"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
               <Target className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Objetivos</h3>
            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              Metas estratégicas que el Director Operativo IA desglosa en tareas.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
            Ver estrategia <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/approvals"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              summary.pendingApproval > 0 ? "bg-amber-50 text-amber-600 animate-pulse" : "bg-slate-50 text-slate-400"
            )}>
               <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Aprobaciones</h3>
            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              Control humano centralizado de borradores generados.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
            {summary.pendingApproval} Pendientes <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/governance"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-slate-950 p-8 shadow-sm transition-all hover:shadow-xl"
        >
          <div className="space-y-4 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400">
               <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">Gobernanza</h3>
            <p className="text-xs leading-relaxed text-slate-400 font-medium">
              Control de límites operativos (Budget Guard) y autonomía.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-400 group-hover:translate-x-1 transition-transform">
            Ver límites <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/readiness"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-amber-200 hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
               <Rocket className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Preparación</h3>
            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              Checklist crítico pre-deploy y validación técnica.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 group-hover:translate-x-1 transition-transform">
            Validar deploy <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/platform/agents/org-chart"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-indigo-200 hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
               <Network className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Estructura</h3>
            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              Organigrama y jerarquía del equipo de agentes IA.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 group-hover:translate-x-1 transition-transform">
            Ver equipo <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/feature-flags"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
               <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Flags</h3>
            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              Capacidades dinámicas y riesgo operativo.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
            Ver flags <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/automations"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-slate-900 p-8 shadow-sm transition-all hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400">
               <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Automatizaciones</h3>
            <p className="text-xs leading-relaxed text-slate-400 font-medium">
               Motor de tareas recurrentes y flujos programados.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-400 group-hover:translate-x-1 transition-transform">
            Gestionar <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/calendar"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
               <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Calendario</h3>
            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              Agenda interna y planificación de contenidos.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:translate-x-1 transition-transform">
            Ver agenda <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/platform/agents/prospecting"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
               <Target className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Prospección</h3>
            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              Gestión B2B asistida para búsqueda de nuevos clientes inmobiliarios.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
            Abrir Prospecting Center <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>

      {/* ── Contenido y herramientas ── */}
      <div>
        <p className="mb-4 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Contenido y herramientas
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/platform/agents/content"
            className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Contenido</h3>
              <p className="text-xs leading-relaxed text-slate-500 font-medium">
                Borradores de contenido generados por los agentes para redes y publicación.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
              Ver borradores <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/platform/agents/integrations"
            className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <Link2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Integraciones</h3>
              <p className="text-xs leading-relaxed text-slate-500 font-medium">
                Conexión con Meta (Facebook/Instagram) para publicación de contenido.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
              Conectar <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/platform/agents/tasks"
            className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <ListChecks className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Tareas</h3>
              <p className="text-xs leading-relaxed text-slate-500 font-medium">
                Tareas accionables que el Director IA asigna a partir de los objetivos.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
              Ver tareas <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/platform/agents/library"
            className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-brand-200 hover:shadow-xl"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Biblioteca</h3>
              <p className="text-xs leading-relaxed text-slate-500 font-medium">
                Catálogo de agentes disponibles y próximos a habilitar.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 group-hover:translate-x-1 transition-transform">
              Ver catálogo <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         <section className="rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">Indicadores de Eficiencia</p>
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
                     <span className="mb-1 text-[10px] font-bold text-emerald-600">Calidad Promedio</span>
                  </div>
               </div>
               <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tiempo de Revisión</p>
                  <div className="flex items-end gap-2">
                     <p className="text-3xl font-black text-slate-900">{summary.avgApprovalTimeMinutes ? `${summary.avgApprovalTimeMinutes}m` : 'N/A'}</p>
                     <span className="mb-1 text-[10px] font-bold text-blue-600">Velocidad de Decisión</span>
                  </div>
               </div>
            </div>
         </section>

         <section className="rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">Bitácora de Auditoría</p>
                  <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Eventos Recientes</h3>
               </div>
               <Link href="/platform/agents/logs" className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:underline">
                  Ver todos
               </Link>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-4 rounded-2xl border border-slate-50 bg-slate-50/30 p-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                     <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                     <p className="text-xs font-bold text-slate-900">Sistema AgentOS 3.1 Operativo</p>
                     <p className="text-[10px] text-slate-500">Gobernanza y seguridad integradas.</p>
                  </div>
                  <div className="ml-auto text-[10px] font-bold text-slate-400">Ahora</div>
               </div>
               {/* Más logs simplificados aquí si fuera necesario */}
            </div>
         </section>
      </div>
    </div>
  );
}
