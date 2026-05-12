import Link from "next/link";
import { ChevronLeft, Target, Send, Calendar, AlertCircle } from "lucide-react";
import { createGoalAction } from "@/modules/agents/actions";

export default function NewGoalPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <Link 
          href="/platform/agents/goals" 
          className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 transition hover:text-brand-600"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver a objetivos
        </Link>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-brand-600">
            <Target className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Strategy Definition</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 uppercase">Definir <span className="text-brand-600">Objetivo</span></h1>
          <p className="text-sm font-medium text-slate-500">
            Establece una meta clara para que el Director Operativo IA pueda planificar la ejecución.
          </p>
        </div>
      </div>

      <form action={createGoalAction} className="rounded-[3rem] border border-slate-200 bg-white p-12 shadow-2xl shadow-slate-200/50">
        <div className="space-y-8">
          <div className="space-y-4">
            <label htmlFor="title" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Título del Objetivo</label>
            <input
              type="text"
              id="title"
              name="title"
              required
              placeholder="Ej: Aumentar solicitudes de demo esta semana"
              className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-lg font-bold transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
          </div>

          <div className="space-y-4">
            <label htmlFor="description" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Descripción Estratégica</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Explica el contexto y lo que esperas lograr..."
              className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-medium transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            ></textarea>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <label htmlFor="type" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tipo de Objetivo</label>
              <select
                id="type"
                name="type"
                required
                className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-bold transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              >
                <option value="MARKETING">Marketing</option>
                <option value="OPERATIONS">Operaciones</option>
                <option value="ONBOARDING">Onboarding</option>
                <option value="COMMERCIAL">Comercial</option>
                <option value="AUDIT">Auditoría</option>
              </select>
            </div>

            <div className="space-y-4">
              <label htmlFor="priority" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Prioridad</label>
              <select
                id="priority"
                name="priority"
                required
                className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-bold transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM" selected>Media</option>
                <option value="HIGH">Alta</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label htmlFor="targetDate" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Fecha Objetivo (Opcional)
            </label>
            <input
              type="date"
              id="targetDate"
              name="targetDate"
              className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-bold transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
          </div>

          <div className="rounded-2xl bg-amber-50 p-6 flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
               <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-tight text-amber-900">Validación IA</p>
              <p className="text-[11px] font-bold text-amber-700/80 leading-relaxed">
                Al crear este objetivo, el Director Operativo IA estará disponible para desglosarlo en tareas. No se ejecutarán acciones externas automáticamente.
              </p>
            </div>
          </div>

          <div className="flex pt-4">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-600 py-5 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-brand-600/20 transition hover:bg-brand-700 active:scale-95"
            >
              <Send className="h-5 w-5" />
              Crear objetivo estratégico
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
