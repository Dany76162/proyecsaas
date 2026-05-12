import { requirePlatformAdmin } from "@/server/auth/access";
import { AppCard } from "@/components/ui/app-card";
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Settings,
  Info,
  Lock,
  Globe,
  MessageSquare,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMetaAuthConfig } from "@/modules/agents/meta-service";

export default async function FeatureFlagsPage() {
  await requirePlatformAdmin();
  
  const metaConfig = getMetaAuthConfig();
  
  const flags = [
    { 
      key: "AGENTOS_ENABLE_META_READONLY", 
      active: metaConfig?.flags.readonly, 
      risk: "LOW", 
      icon: Globe,
      color: "blue",
      desc: "Habilita la sincronización y visualización de páginas de Facebook y cuentas de Instagram vinculadas.",
      recommendation: "Habilitado por defecto para monitoreo."
    },
    { 
      key: "AGENTOS_ENABLE_META_PUBLISHING", 
      active: metaConfig?.flags.publishing, 
      risk: "MEDIUM", 
      icon: MessageSquare,
      color: "emerald",
      desc: "Permite publicar contenido manualmente desde el panel Superadmin hacia las páginas de Meta.",
      recommendation: "Habilitar solo después de validar la conexión OAuth."
    },
    { 
      key: "AGENTOS_ENABLE_SCHEDULED_PUBLISHING", 
      active: metaConfig?.flags.scheduled, 
      risk: "HIGH", 
      icon: Activity,
      color: "red",
      desc: "Activa el motor de publicación automática para borradores programados en el calendario.",
      recommendation: "NIVEL CRÍTICO. Requiere monitoreo constante de logs."
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-12">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xl">
          <Zap className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Feature Flag Center</h1>
          <p className="text-slate-500">Estado de capacidades dinámicas y control de riesgo operativo.</p>
        </div>
      </div>

      <div className="grid gap-8">
        {flags.map((flag, i) => (
          <AppCard key={i} className={cn(
            "overflow-hidden border-slate-200 transition-all",
            flag.active ? "border-slate-300 shadow-md" : "opacity-75 bg-slate-50"
          )}>
            <div className="flex flex-col md:flex-row">
              <div className={cn(
                "md:w-64 p-8 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-100",
                flag.active ? `bg-${flag.color}-50/30` : "bg-slate-100/50"
              )}>
                <div className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm mb-4",
                  flag.active ? `bg-${flag.color}-600 text-white` : "bg-slate-300 text-white"
                )}>
                  <flag.icon className="h-8 w-8" />
                </div>
                <h3 className="font-black text-slate-900 leading-tight mb-2">{flag.key}</h3>
                <div className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                  flag.active ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-200 text-slate-500 border border-slate-300"
                )}>
                  {flag.active ? "ACTIVA" : "INACTIVA"}
                </div>
              </div>
              
              <div className="flex-1 p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Descripción de la Funcionalidad</h4>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      {flag.desc}
                    </p>
                  </div>
                  <div className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md",
                    flag.risk === "HIGH" ? "bg-red-50 text-red-700" : 
                    flag.risk === "MEDIUM" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                  )}>
                    Riesgo {flag.risk}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recomendación Técnica</h5>
                     <div className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                       <Info className="h-5 w-5 text-slate-400 shrink-0" />
                       <p className="text-xs text-slate-600 font-medium">
                         {flag.recommendation}
                       </p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dependencias Críticas</h5>
                     <ul className="space-y-2">
                        {[
                          "Configuración de Meta App",
                          "Tokens Cifrados AES-256",
                          "Permisos de Superadmin"
                        ].map((dep, j) => (
                          <li key={j} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {dep}
                          </li>
                        ))}
                     </ul>
                  </div>
                </div>
              </div>
            </div>
          </AppCard>
        ))}
      </div>

      <AppCard className="bg-slate-950 text-white overflow-hidden border-none shadow-2xl">
        <div className="p-8 flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Lock className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight mb-2">Modo de Edición Restringido</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
              Las Feature Flags de AgentOS están vinculadas directamente a variables de entorno del servidor. 
              Por seguridad, no pueden ser modificadas desde la interfaz web. Para realizar cambios, 
              debe actualizar la configuración en el panel de control de Railway o su archivo .env local.
            </p>
          </div>
        </div>
      </AppCard>
    </div>
  );
}
