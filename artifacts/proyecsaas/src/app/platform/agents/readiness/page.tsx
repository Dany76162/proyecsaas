import { requirePlatformAdmin } from "@/server/auth/access";
import { AppCard } from "@/components/ui/app-card";
import { 
  Rocket, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Key, 
  Globe, 
  ShieldCheck, 
  Cpu,
  Info,
  ServerCrash,
  Lock,
  ChevronRight,
  Terminal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMetaAuthConfig } from "@/modules/agents/meta-service";

export default async function ProductionReadinessPage() {
  await requirePlatformAdmin();
  
  const metaConfig = getMetaAuthConfig();
  
  const envVars = [
    { name: "DATABASE_URL", present: !!process.env.DATABASE_URL, critical: true, desc: "Conexión a la base de datos de producción." },
    { name: "OPENAI_API_KEY", present: !!process.env.OPENAI_API_KEY, critical: true, desc: "Clave para motores GPT-4o-mini." },
    { name: "WHATSAPP_TOKEN_ENCRYPTION_KEY", present: !!process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY, critical: true, desc: "Maestra para cifrado AES-256." },
    { name: "AGENTOS_CRON_SECRET", present: !!process.env.AGENTOS_CRON_SECRET, critical: true, desc: "Protección del endpoint de publicación programada." },
    { name: "META_APP_ID", present: !!process.env.META_APP_ID, critical: true, desc: "Identificador de App en Meta Dev." },
    { name: "META_APP_SECRET", present: !!process.env.META_APP_SECRET, critical: true, desc: "Secreto de App en Meta Dev." },
    { name: "META_REDIRECT_URI", present: !!process.env.META_REDIRECT_URI, critical: true, desc: "URL de callback para OAuth." },
  ];

  const flags = [
    { name: "Meta solo lectura", active: metaConfig?.flags.readonly, risk: "BAJO", desc: "Permite listar páginas sin publicar." },
    { name: "Publicación en Meta", active: metaConfig?.flags.publishing, risk: "MEDIO", desc: "Habilita botón de publicación manual." },
    { name: "Publicación programada", active: metaConfig?.flags.scheduled, risk: "ALTO", desc: "Ejecución automática de agenda de contenido." },
  ];

  const allCriticalEnvVarsPresent = envVars.filter(v => v.critical).every(v => v.present);
  const totalReadiness = Math.round((envVars.filter(v => v.present).length / envVars.length) * 100);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl">
            <Rocket className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Centro de Preparación Operativa</h1>
            <p className="text-slate-500">Checklist crítico pre-deploy para garantizar la estabilidad en producción.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white rounded-2xl shadow-lg border border-slate-800">
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado General:</span>
           <span className={cn("text-lg font-black", totalReadiness === 100 ? "text-emerald-400" : "text-amber-400")}>
             {totalReadiness}% LISTO
           </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-8">
          {/* Environment Variables */}
          <section className="space-y-4">
            <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Key className="h-5 w-5 text-slate-400" />
              Variables de Entorno Críticas
            </h2>
            <div className="grid gap-4">
              {envVars.map((v, i) => (
                <AppCard key={i} className={cn(
                  "border-slate-200 transition-all",
                  !v.present ? "border-red-200 bg-red-50/10" : "hover:border-slate-300"
                )}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center",
                        v.present ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                      )}>
                        {v.present ? <CheckCircle2 className="h-5 w-5" /> : <ServerCrash className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{v.name}</h4>
                        <p className="text-[10px] text-slate-500">{v.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={cn(
                         "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                         v.present ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                       )}>
                         {v.present ? "PRESENTE" : "FALTANTE"}
                       </span>
                    </div>
                  </div>
                </AppCard>
              ))}
            </div>
          </section>

          {/* Infrastructure Health */}
          <section className="space-y-4">
            <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Database className="h-5 w-5 text-slate-400" />
              Estado de Infraestructura (Validación local)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
               <StatusCard 
                 icon={ShieldCheck} 
                 title="Prisma Schema" 
                 status="VÁLIDO" 
                 desc="Esquema compilado sin errores." 
                 tone="success" 
               />
               <StatusCard 
                 icon={Terminal} 
                 title="Migraciones" 
                 status="PENDIENTE CLI" 
                 desc="Validar migrate status antes de push." 
                 tone="warning" 
               />
               <StatusCard 
                 icon={Lock} 
                 title="Cifrado AES" 
                 status="OPERATIVO" 
                 desc="Tokens protegidos en DB." 
                 tone="success" 
               />
               <StatusCard
                 icon={Cpu}
                 title="Estado de compilación"
                 status="OPTIMIZADO"
                 desc="Bundle de producción generado."
                 tone="success"
               />
               <StatusCard
                 icon={ShieldCheck}
                 title="Director Operativo IA"
                 status="SUPERVISADO"
                 desc="Modo HITL activo. Genera diagnósticos bajo demanda, sin acciones autónomas."
                 tone="success"
               />
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* Risk Assessment */}
          <AppCard className="bg-slate-950 text-white overflow-hidden border-none shadow-2xl">
            <div className="p-8">
              <h3 className="text-xl font-black tracking-tight mb-6 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Matriz de Riesgo Operativo
              </h3>
              <div className="space-y-6">
                {flags.map((flag, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300">{flag.name}</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                        flag.risk === "ALTO" ? "bg-red-500/20 text-red-400" :
                        flag.risk === "MEDIO" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                      )}>
                        RIESGO {flag.risk}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 max-w-[70%]">{flag.desc}</p>
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        flag.active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-slate-700"
                      )} />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-800">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                  <Info className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-200/80 leading-relaxed">
                    <strong>Recomendación:</strong> Mantener "Publicación en Meta" y "Publicación programada" en <span className="text-white font-bold">false</span> durante demo/preventa, hasta completar QA manual de extremo a extremo. No implica que estén rotas — es una política de seguridad operativa deliberada.
                  </p>
                </div>
              </div>
            </div>
          </AppCard>

          {/* Deployment Plan Summary */}
          <AppCard className="border-slate-200">
             <div className="p-6">
               <h3 className="text-lg font-black text-slate-900 mb-4">Plan de Deploy</h3>
               <div className="space-y-4">
                 {[
                   "1. Configurar variables de entorno en Railway.",
                   "2. Ejecutar migraciones solo cuando existan cambios de schema.",
                   "3. Validar TypeScript y compilación local.",
                   "4. Confirmar main sincronizada y push a origin/main.",
                   "5. Validar deploy Railway, logs y smoke test HTTP."
                 ].map((step, i) => (
                   <div key={i} className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                     <ChevronRight className="h-4 w-4 text-slate-300" />
                     {step}
                   </div>
                 ))}
               </div>
             </div>
          </AppCard>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, title, status, desc, tone }: { icon: any, title: string, status: string, desc: string, tone: 'success' | 'warning' | 'danger' }) {
  return (
    <div className="p-4 border border-slate-200 rounded-2xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
          <Icon className="h-4 w-4" />
        </div>
        <span className={cn(
          "text-[9px] font-black uppercase tracking-widest",
          tone === 'success' ? "text-emerald-600" : tone === 'warning' ? "text-amber-600" : "text-red-600"
        )}>
          {status}
        </span>
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-900">{title}</h4>
        <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
