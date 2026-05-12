import { getAgentLibraryData } from "@/modules/agents/service";
import { listAgentGoals } from "@/modules/agents/goals-service";
import { createAutomationAction } from "@/modules/agents/actions";
import { Zap, ArrowLeft, Bot, Calendar, Clock, Globe, Target, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function NewAutomationPage() {
  const agents = await getAgentLibraryData();
  const goals = await listAgentGoals();

  return (
    <div className="mx-auto max-w-4xl space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="space-y-6">
        <Link
          href="/platform/agents/automations"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 transition hover:text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a automatizaciones
        </Link>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-xl shadow-brand-600/20">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 uppercase">Programar <span className="text-brand-600">IA</span></h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Define reglas para que tus agentes trabajen de forma recurrente sin intervención manual.
          </p>
        </div>
      </div>

      <div className="rounded-[3.5rem] border border-slate-200 bg-white p-12 shadow-2xl shadow-slate-200/40">
        <form action={createAutomationAction} className="space-y-10">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Información General</label>
                <div className="space-y-4">
                  <input
                    name="title"
                    type="text"
                    required
                    placeholder="Título de la automatización (ej: Contenido Semanal)"
                    className="w-full rounded-3xl border-2 border-slate-100 bg-slate-50/50 px-6 py-4 text-sm font-bold tracking-tight outline-none transition focus:border-brand-600 focus:bg-white"
                  />
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="Describe qué debe hacer esta regla..."
                    className="w-full resize-none rounded-3xl border-2 border-slate-100 bg-slate-50/50 px-6 py-4 text-sm font-bold tracking-tight outline-none transition focus:border-brand-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Responsables y Contexto</label>
                <div className="grid gap-4">
                  <div className="relative">
                    <Bot className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <select
                      name="agentId"
                      className="w-full appearance-none rounded-3xl border-2 border-slate-100 bg-slate-50/50 py-4 pl-14 pr-6 text-sm font-bold tracking-tight outline-none transition focus:border-brand-600 focus:bg-white"
                    >
                      <option value="">Seleccionar agente responsable</option>
                      {agents.filter(a => a.isActive).map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <Target className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <select
                      name="goalId"
                      className="w-full appearance-none rounded-3xl border-2 border-slate-100 bg-slate-50/50 py-4 pl-14 pr-6 text-sm font-bold tracking-tight outline-none transition focus:border-brand-600 focus:bg-white"
                    >
                      <option value="">Vincular a un objetivo (Opcional)</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Programación y Frecuencia</label>
                <div className="space-y-4">
                  <div className="relative">
                    <Calendar className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <select
                      name="frequency"
                      required
                      className="w-full appearance-none rounded-3xl border-2 border-slate-100 bg-slate-50/50 py-4 pl-14 pr-6 text-sm font-bold tracking-tight outline-none transition focus:border-brand-600 focus:bg-white"
                    >
                      <option value="DAILY">Ejecución Diaria</option>
                      <option value="WEEKLY" selected>Ejecución Semanal</option>
                      <option value="MONTHLY">Ejecución Mensual</option>
                      <option value="MANUAL">Solo Manual</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Clock className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        name="timeOfDay"
                        type="time"
                        defaultValue="09:00"
                        className="w-full rounded-3xl border-2 border-slate-100 bg-slate-50/50 py-4 pl-14 pr-6 text-sm font-bold tracking-tight outline-none transition focus:border-brand-600 focus:bg-white"
                      />
                    </div>
                    <div className="relative">
                      <Globe className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <select
                        name="timezone"
                        className="w-full appearance-none rounded-3xl border-2 border-slate-100 bg-slate-50/50 py-4 pl-14 pr-6 text-sm font-bold tracking-tight outline-none transition focus:border-brand-600 focus:bg-white"
                      >
                        <option value="UTC-3">Buenos Aires (UTC-3)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 px-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Automatización</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'CONTENT', label: 'Contenido', icon: Zap },
                        { id: 'REPORT', label: 'Reportes', icon: Activity },
                        { id: 'GOAL_REVIEW', label: 'Estratégica', icon: Target },
                        { id: 'AUDIT', label: 'Auditoría', icon: ShieldCheck },
                      ].map((type) => (
                        <label key={type.id} className="relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50/30 p-4 transition hover:border-brand-200 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50/30">
                          <input type="radio" name="type" value={type.id} defaultChecked={type.id === 'CONTENT'} className="hidden" />
                          <type.icon className="h-4 w-4 text-slate-500" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-[2.5rem] bg-slate-950 p-10 text-white shadow-2xl shadow-slate-950/20 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
                <ShieldCheck className="h-6 w-6 text-brand-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-400">Seguridad Garantizada</p>
                <p className="text-[11px] font-medium text-slate-400 leading-relaxed max-w-md text-balance">
                  Esta automatización solo creará tareas internas. Nada será publicado ni enviado sin tu aprobación manual en el centro de control.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="group relative flex items-center gap-3 self-center overflow-hidden rounded-2xl bg-brand-600 px-10 py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:bg-brand-700 active:scale-95"
            >
              <Zap className="h-4 w-4 fill-current group-hover:animate-pulse" />
              Activar automatización
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
