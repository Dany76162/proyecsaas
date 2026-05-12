import { requirePlatformAdmin } from "@/server/auth/access";
import { AppCard } from "@/components/ui/app-card";
import { 
  Network, 
  Bot, 
  UserCog, 
  Users, 
  ArrowDown, 
  CheckCircle2, 
  Clock,
  ShieldCheck,
  BrainCircuit,
  Megaphone,
  Briefcase,
  Users2,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AgentOrgChartPage() {
  await requirePlatformAdmin();

  const agents = [
    {
      id: "director",
      name: "Director Operativo IA",
      role: "Estrategia y Orquestación",
      type: "DIRECTOR",
      status: "ACTIVE",
      autonomy: "HIGH",
      description: "Gestiona objetivos tácticos y desglosa metas en tareas para agentes subordinados.",
      icon: UserCog,
      color: "bg-slate-900",
      level: 0
    },
    {
      id: "marketing",
      name: "Agente de Marketing",
      role: "Contenido y Social Media",
      type: "MARKETING",
      status: "ACTIVE",
      autonomy: "MEDIUM",
      description: "Genera borradores de contenido, gestiona el calendario y prepara publicaciones en Meta.",
      icon: Megaphone,
      color: "bg-blue-600",
      level: 1,
      parentId: "director"
    },
    {
      id: "comercial",
      name: "Comercial IA",
      role: "Lead Nurturing & CRM",
      type: "SALES",
      status: "UPCOMING",
      autonomy: "NONE",
      description: "Seguimiento automatizado de prospectos y calificación de leads en el CRM.",
      icon: Briefcase,
      color: "bg-slate-200",
      level: 1,
      parentId: "director"
    },
    {
      id: "onboarding",
      name: "QA & Onboarding IA",
      role: "Calidad y Soporte",
      type: "SUPPORT",
      status: "UPCOMING",
      autonomy: "NONE",
      description: "Validación de datos de propiedades y asistencia en el alta de nuevos usuarios.",
      icon: ShieldCheck,
      color: "bg-slate-200",
      level: 1,
      parentId: "director"
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-12">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl">
          <Network className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Organigrama de Agentes</h1>
          <p className="text-slate-500">Jerarquía y flujos de mando del ecosistema AgentOS.</p>
        </div>
      </div>

      <div className="relative flex flex-col items-center">
        {/* Level 0: Director */}
        <div className="relative z-10">
          <AgentNode agent={agents[0]} />
        </div>

        {/* Vertical Line from Director to Level 1 */}
        <div className="w-1 h-12 bg-slate-200" />
        
        {/* Horizontal Line Connecting Level 1 Nodes */}
        <div className="relative w-full max-w-4xl">
          <div className="absolute top-0 left-[16%] right-[16%] h-1 bg-slate-200" />
          
          <div className="flex justify-between pt-8 px-4">
             {agents.slice(1).map((agent) => (
               <div key={agent.id} className="flex flex-col items-center relative">
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-1 h-8 bg-slate-200" />
                 <AgentNode agent={agent} />
               </div>
             ))}
          </div>
        </div>
      </div>

      <AppCard className="bg-slate-50 border-slate-200 mt-20">
        <div className="p-8 flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
            <BrainCircuit className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Arquitectura de Mando</h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
              En AgentOS, los agentes operan en una estructura de reporteo clara. El Director Operativo IA 
              mantiene la visión de los objetivos empresariales, delegando la ejecución creativa y técnica 
              a los agentes especialistas. Esta jerarquía garantiza que cada tarea tenga un responsable 
              y un propósito estratégico.
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

  return (
    <AppCard className={cn(
      "w-72 overflow-hidden transition-all duration-300",
      isActive ? "border-slate-300 shadow-lg hover:border-brand-500" : "opacity-60 border-slate-200 bg-slate-50"
    )}>
      <div className={cn("h-2", isActive ? agent.color : "bg-slate-300")} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center text-white",
            isActive ? agent.color : "bg-slate-300"
          )}>
            <Icon className="h-5 w-5" />
          </div>
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
        
        <h4 className="font-black text-slate-900 leading-tight mb-1">{agent.name}</h4>
        <p className="text-xs font-bold text-slate-500 mb-4">{agent.role}</p>
        
        <p className="text-[10px] text-slate-400 leading-relaxed mb-4 line-clamp-2">
          {agent.description}
        </p>

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
             Autonomía: {agent.autonomy}
           </span>
        </div>
      </div>
    </AppCard>
  );
}
