import { requirePlatformAdmin } from "@/server/auth/access";
import { AppCard } from "@/components/ui/app-card";
import {
  Network,
  Bot,
  CheckCircle2,
  Clock,
  ShieldCheck,
  BrainCircuit,
  Megaphone,
  Briefcase,
  UserCog,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mapa de niveles de autonomía → español
const AUTONOMY_LABEL: Record<string, string> = {
  HIGH:   "ALTA",
  MEDIUM: "MEDIA",
  NONE:   "SIN AUTONOMÍA",
};

export default async function AgentOrgChartPage() {
  await requirePlatformAdmin();

  // Datos del organigrama.
  // NOTA: Este organigrama combina agentes activos y agentes planificados.
  // El estado "Próximo" indica que el agente está diseñado pero aún no ejecuta tareas operativas.
  const agents = [
    {
      id: "director",
      name: "Director Operativo IA",
      role: "Estrategia y Orquestación",
      type: "DIRECTOR",
      status: "ACTIVE",
      supervised: true, // modo HITL
      autonomy: "HIGH",
      description: "Gestiona objetivos tácticos, genera diagnósticos operativos y desglosa metas en tareas para agentes subordinados. Opera en modo supervisado (HITL).",
      icon: UserCog,
      color: "bg-slate-900",
      level: 0,
    },
    {
      id: "marketing",
      name: "Agente de Marketing",
      role: "Contenido y Redes Sociales",
      type: "MARKETING",
      status: "ACTIVE",
      supervised: false,
      autonomy: "MEDIUM",
      description: "Genera borradores de contenido, gestiona el calendario y prepara publicaciones en Meta.",
      icon: Megaphone,
      color: "bg-blue-600",
      level: 1,
      parentId: "director",
    },
    {
      id: "comercial",
      name: "Comercial IA",
      role: "Seguimiento de Leads y CRM",
      type: "SALES",
      status: "UPCOMING",
      supervised: false,
      autonomy: "NONE",
      description: "Seguimiento automatizado de prospectos y calificación de leads en el CRM.",
      icon: Briefcase,
      color: "bg-slate-200",
      level: 1,
      parentId: "director",
    },
    {
      id: "onboarding",
      name: "Calidad y Onboarding IA",
      role: "Calidad y Soporte",
      type: "SUPPORT",
      status: "UPCOMING",
      supervised: false,
      autonomy: "NONE",
      description: "Validación de datos de propiedades y asistencia en el alta de nuevos usuarios.",
      icon: ShieldCheck,
      color: "bg-slate-200",
      level: 1,
      parentId: "director",
    },
  ];

  const director = agents[0];
  const subordinates = agents.slice(1);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-10">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shrink-0">
          <Network className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Organigrama de Agentes</h1>
          <p className="text-slate-500 text-sm">Jerarquía y flujos de mando del ecosistema AgentOS.</p>
        </div>
      </div>

      {/* Nota de honestidad operativa */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Este organigrama combina agentes activos y agentes planificados.
          Las tarjetas marcadas como <span className="font-bold text-slate-700">Próximo</span> representan roles diseñados que aún no ejecutan tareas operativas.
          El <span className="font-bold text-slate-700">Director Operativo IA</span> está activo en modo supervisado (HITL) — genera diagnósticos bajo demanda sin ejecutar acciones autónomas.
        </p>
      </div>

      {/* Organigrama */}
      <div className="relative flex flex-col items-center gap-0">

        {/* Nivel 0 — Director */}
        <div className="relative z-10">
          <AgentNode agent={director} />
        </div>

        {/* Línea vertical Director → Level 1 */}
        <div className="w-px h-10 bg-slate-200" />

        {/* Conector horizontal + Nivel 1 */}
        <div className="relative w-full max-w-[1100px] px-4">
          {/* Línea horizontal superior */}
          <div className="absolute top-0 left-[17%] right-[17%] h-px bg-slate-200" />

          {/* Grid de 3 agentes subordinados */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10">
            {subordinates.map((agent) => (
              <div key={agent.id} className="flex flex-col items-center relative">
                {/* Línea vertical descendente */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-px h-10 bg-slate-200" />
                <AgentNode agent={agent} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Arquitectura de Mando */}
      <AppCard className="bg-slate-50 border-slate-200">
        <div className="p-8 flex items-start gap-6">
          <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
            <BrainCircuit className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Arquitectura de Mando</h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
              En AgentOS, el Director Operativo IA coordina la estrategia, genera diagnósticos operativos y propone acciones al operador humano. Los agentes especialistas ejecutan tareas solo cuando están activos y dentro de las reglas de gobernanza configuradas. Las acciones sensibles requieren aprobación humana (HITL). Los agentes marcados como "Próximo" están diseñados en la arquitectura pero aún no ejecutan tareas en producción.
            </p>
          </div>
        </div>
      </AppCard>
    </div>
  );
}

function AgentNode({ agent }: { agent: any }) {
  const Icon = agent.icon;
  const isActive = agent.status === "ACTIVE";
  const autonomyLabel = AUTONOMY_LABEL[agent.autonomy] ?? agent.autonomy;

  return (
    <AppCard className={cn(
      "w-full max-w-[320px] overflow-hidden transition-all duration-300",
      isActive
        ? "border-slate-300 shadow-lg hover:border-brand-500"
        : "opacity-60 border-slate-200 bg-slate-50"
    )}>
      {/* Color bar */}
      <div className={cn("h-2", isActive ? agent.color : "bg-slate-300")} />

      <div className="p-5">
        {/* Header: icon + badge estado */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center text-white",
            isActive ? agent.color : "bg-slate-300"
          )}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-1.5">
            {agent.supervised && isActive && (
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                HITL
              </span>
            )}
            {isActive ? (
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                Activo
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                Próximo
              </div>
            )}
          </div>
        </div>

        {/* Nombre y rol */}
        <h4 className="font-black text-slate-900 leading-tight mb-1">{agent.name}</h4>
        <p className="text-xs font-bold text-slate-500 mb-4">{agent.role}</p>

        {/* Descripción */}
        <p className="text-[10px] text-slate-400 leading-relaxed mb-4 line-clamp-3">
          {agent.description}
        </p>

        {/* Footer: avatares + autonomía */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex -space-x-2">
            <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
              <Bot className="h-3 w-3 text-slate-400" />
            </div>
            <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Autonomía: {autonomyLabel}
          </span>
        </div>
      </div>
    </AppCard>
  );
}
