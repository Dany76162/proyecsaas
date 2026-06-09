import { requirePlatformAdmin } from "@/server/auth/access";
import { AppCard } from "@/components/ui/app-card";
import {
  Zap,
  CheckCircle2,
  Info,
  Lock,
  Globe,
  MessageSquare,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMetaAuthConfig } from "@/modules/agents/meta-service";

export default async function FeatureFlagsPage() {
  await requirePlatformAdmin();

  const metaConfig = getMetaAuthConfig();

  const flags = [
    {
      key: "AGENTOS_ENABLE_META_READONLY",
      friendlyName: "Meta solo lectura",
      active: metaConfig?.flags.readonly,
      risk: "BAJO" as const,
      icon: Globe,
      color: "blue",
      desc: "Habilita la sincronización y visualización de páginas de Facebook y cuentas de Instagram vinculadas, sin realizar publicaciones.",
      recommendation: "Habilitada por defecto para monitoreo. No implica riesgo de publicación.",
    },
    {
      key: "AGENTOS_ENABLE_META_PUBLISHING",
      friendlyName: "Publicación en Meta",
      active: metaConfig?.flags.publishing,
      risk: "MEDIO" as const,
      icon: MessageSquare,
      color: "emerald",
      desc: "Permite publicar contenido manualmente desde el Panel Superadmin hacia las páginas de Meta vinculadas.",
      recommendation: "Habilitar solo después de validar la conexión OAuth y los permisos de publicación en Meta Dev.",
    },
    {
      key: "AGENTOS_ENABLE_SCHEDULED_PUBLISHING",
      friendlyName: "Publicación programada",
      active: metaConfig?.flags.scheduled,
      risk: "ALTO" as const,
      icon: Activity,
      color: "red",
      desc: "Activa el motor de publicación automática para borradores programados en el calendario de contenido.",
      recommendation: "NIVEL CRÍTICO. Mantener desactivada durante demo/preventa hasta completar QA manual de extremo a extremo. Requiere monitoreo constante de logs.",
    },
  ];

  const riskColor = {
    BAJO: "bg-emerald-50 text-emerald-700",
    MEDIO: "bg-amber-50 text-amber-700",
    ALTO: "bg-red-50 text-red-700",
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xl shrink-0">
          <Zap className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Centro de Funciones Controladas
          </h1>
          <p className="text-slate-500 text-sm">
            Estado de capacidades dinámicas (Feature Flags) y control de riesgo operativo.
          </p>
        </div>
      </div>

      {/* Flag cards */}
      <div className="grid gap-6">
        {flags.map((flag, i) => (
          <AppCard
            key={i}
            className={cn(
              "overflow-hidden border-slate-200 transition-all",
              flag.active ? "border-slate-300 shadow-md" : "opacity-80 bg-slate-50/60"
            )}
          >
            <div className="flex flex-col lg:flex-row">
              {/* Left column — identity */}
              <div
                className={cn(
                  "lg:w-80 xl:w-96 p-8 flex flex-col items-center justify-center text-center border-b lg:border-b-0 lg:border-r border-slate-100 shrink-0",
                  flag.active ? "bg-slate-50/40" : "bg-slate-100/40"
                )}
              >
                <div
                  className={cn(
                    "h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm mb-4",
                    flag.active ? `bg-${flag.color}-600 text-white` : "bg-slate-300 text-white"
                  )}
                >
                  <flag.icon className="h-8 w-8" />
                </div>

                {/* Nombre amigable */}
                <h3 className="font-black text-slate-900 text-base leading-tight mb-1">
                  {flag.friendlyName}
                </h3>

                {/* Nombre técnico completo en mono */}
                <p className="text-[10px] font-mono text-slate-400 break-all mb-3 leading-relaxed px-2">
                  {flag.key}
                </p>

                {/* Badge estado */}
                <div
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                    flag.active
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-slate-200 text-slate-500 border-slate-300"
                  )}
                >
                  {flag.active ? "ACTIVA" : "INACTIVA"}
                </div>
              </div>

              {/* Right column — details */}
              <div className="flex-1 p-8 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-slate-900 mb-1">
                      Descripción de la funcionalidad
                    </h4>
                    <p className="text-sm text-slate-500 leading-relaxed">{flag.desc}</p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md shrink-0",
                      riskColor[flag.risk]
                    )}
                  >
                    Riesgo {flag.risk}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Recomendación técnica
                    </h5>
                    <div className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {flag.recommendation}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Dependencias críticas
                    </h5>
                    <ul className="space-y-2">
                      {[
                        "Configuración de Meta App",
                        "Tokens cifrados AES-256",
                        "Permisos de Superadmin",
                      ].map((dep, j) => (
                        <li key={j} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
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

      {/* Read-only notice */}
      <AppCard className="bg-slate-950 text-white overflow-hidden border-none shadow-2xl">
        <div className="p-8 flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Lock className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight mb-2">Modo de lectura operativa</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
              Las funciones controladas (Feature Flags) de AgentOS están vinculadas directamente a variables de entorno del servidor. Por seguridad, no pueden modificarse desde la interfaz web para evitar cambios accidentales en producción. Para realizar cambios, actualizar la configuración en el panel de Railway o en el archivo <span className="font-mono text-slate-300">.env</span> local.
            </p>
          </div>
        </div>
      </AppCard>
    </div>
  );
}
