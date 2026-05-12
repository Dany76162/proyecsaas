import { getAgentLibraryData } from "@/modules/agents/service";
import { Users, ShieldCheck, Zap, Activity, Clock, ChevronRight, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function AgentLibraryPage() {
  const library = await getAgentLibraryData();

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-brand-600">
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Agent Intelligence</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-950 uppercase">Biblioteca de <span className="text-brand-600">Agentes</span></h1>
        <p className="text-sm font-medium text-slate-500">
          Perfiles de IA disponibles para la operación interna de RaicesPilot.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {library.map((agent) => (
          <div 
            key={agent.id}
            className={cn(
              "group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border p-8 transition-all hover:shadow-xl",
              agent.status === 'ACTIVE' 
                ? "border-slate-200 bg-white hover:border-brand-200" 
                : "border-slate-100 bg-slate-50/50 grayscale opacity-80"
            )}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110",
                  agent.status === 'ACTIVE' ? "bg-brand-50 text-brand-600" : "bg-slate-200 text-slate-400"
                )}>
                  {agent.type === 'ORCHESTRATOR' ? <Zap className="h-6 w-6" /> : <Activity className="h-6 w-6" />}
                </div>
                <div className={cn(
                  "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
                  agent.status === 'ACTIVE' 
                    ? "border-emerald-100 bg-emerald-50 text-emerald-600" 
                    : "border-slate-200 bg-slate-100 text-slate-400"
                )}>
                  {agent.status === 'ACTIVE' ? 'Activo' : 'Próximamente'}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">{agent.name}</h3>
                <p className="text-xs font-bold text-brand-600 uppercase tracking-widest">{agent.role}</p>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  {agent.capabilities.join(", ")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Clock className="h-4 w-4" />
                  Disponibilidad: {agent.availability}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {agent.capabilities.map(cap => (
                    <span key={cap} className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8">
              {agent.status === 'ACTIVE' ? (
                <Link 
                  href={`/platform/agents/tasks?agentId=${agent.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800"
                >
                  Ver actividad
                  <ChevronRight className="h-3 w-3" />
                </Link>
              ) : (
                <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-not-allowed">
                  <Info className="h-3 w-3" />
                  En desarrollo
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-blue-100 bg-blue-50/50 p-8 flex gap-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
           <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h4 className="text-lg font-black text-blue-900 uppercase tracking-tight">Arquitectura de Seguridad</h4>
          <p className="text-xs font-medium text-blue-700/80 leading-relaxed max-w-3xl">
            Todos los agentes en esta biblioteca operan bajo un estricto modelo de "Borrador Primero". 
            Ningún agente tiene permiso para modificar directamente datos de usuarios, facturación o realizar publicaciones externas sin aprobación humana explícita.
          </p>
        </div>
      </div>
    </div>
  );
}
