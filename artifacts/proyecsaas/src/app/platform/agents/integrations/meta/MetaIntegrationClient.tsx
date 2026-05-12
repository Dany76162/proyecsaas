"use client";

import { useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { Button } from "@/components/ui/button";
import { 
  Share2, 
  Globe, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Link2, 
  Link2Off,
  ExternalLink,
  ShieldAlert,
  Info
} from "lucide-react";
import { 
  getMetaAuthUrlAction, 
  syncMetaPagesAction, 
  disconnectMetaAction 
} from "@/modules/agents/meta-actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type MetaPage = {
  id: string;
  name: string;
  platform: string;
  pageId: string;
  lastSyncAt: Date | string | null;
};

type MetaStatus = {
  isConnected: boolean;
  configComplete: boolean;
  status: string;
  errorMessage?: string | null;
  lastSyncAt?: Date | string | null;
  scopes?: string[];
  pages: MetaPage[];
  flags?: {
    readonly: boolean;
    publishing: boolean;
    scheduled: boolean;
  };
};

export default function MetaIntegrationClient({ initialStatus }: { initialStatus: any }) {
  const [status, setStatus] = useState<MetaStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const { url } = await getMetaAuthUrlAction();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message);
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await syncMetaPagesAction();
      window.location.reload(); // Simple way to refresh status
    } catch (err: any) {
      alert(err.message);
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("¿Estás seguro de desconectar Meta? Se eliminarán los tokens de acceso.")) return;
    setIsLoading(true);
    try {
      await disconnectMetaAction();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
          <Share2 className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Integración con Meta</h1>
          <p className="text-slate-500">Conecta Facebook e Instagram para visualizar tus canales en AgentOS.</p>
        </div>
      </div>

      {!status.configComplete && (
        <AppCard className="bg-amber-50 border-amber-200">
          <div className="p-6 flex gap-4">
            <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-amber-900">Configuración incompleta</h3>
              <p className="text-amber-800 text-sm mt-1">
                Faltan variables de entorno (<code className="bg-amber-100 px-1 rounded">META_APP_ID</code>, <code className="bg-amber-100 px-1 rounded">META_APP_SECRET</code>). 
                Contacta al administrador del sistema para completar la configuración.
              </p>
            </div>
          </div>
        </AppCard>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Status Overview */}
          <AppCard className="overflow-hidden border-slate-200 shadow-sm">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  {status.isConnected ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Link2Off className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Estado de Conexión</div>
                    <div className="text-xl font-black text-slate-900">
                      {status.isConnected ? "Conectado" : "No conectado"}
                    </div>
                  </div>
                </div>

                {!status.isConnected ? (
                  <Button 
                    onClick={handleConnect} 
                    disabled={isLoading || !status.configComplete}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest h-12 px-8 rounded-2xl"
                  >
                    {isLoading ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : <Link2 className="h-5 w-5 mr-2" />}
                    Conectar Meta
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleSync} 
                      disabled={isLoading}
                      className="border-slate-200 font-black uppercase tracking-widest h-12 px-6 rounded-2xl"
                    >
                      <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      Sincronizar
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={handleDisconnect} 
                      disabled={isLoading}
                      className="text-red-600 hover:bg-red-50 font-black uppercase tracking-widest h-12 px-6 rounded-2xl"
                    >
                      <Link2Off className="h-5 w-5 mr-2" />
                      Desconectar
                    </Button>
                  </div>
                )}
              </div>

              {status.isConnected && (
                <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Última Sincronización</div>
                    <div className="text-sm font-bold text-slate-700">
                      {status.lastSyncAt ? format(new Date(status.lastSyncAt), "d 'de' MMMM, HH:mm", { locale: es }) : "Nunca"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Páginas/Cuentas</div>
                    <div className="text-sm font-bold text-slate-700">{status.pages.length} detectadas</div>
                  </div>
                </div>
              )}

              {status.errorMessage && (
                <div className="mt-6 flex gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <p className="text-xs font-bold">{status.errorMessage}</p>
                </div>
              )}
            </div>
          </AppCard>

          {/* Scopes / Permissions Info */}
          {status.isConnected && status.scopes && (
            <div className="space-y-4">
              <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-slate-400" />
                Permisos Autorizados (Read-Only)
              </h2>
              <div className="flex flex-wrap gap-2">
                {status.scopes.map(scope => (
                  <span key={scope} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detected Pages List */}
          {status.isConnected && (
            <div className="space-y-4">
              <h2 className="text-lg font-black tracking-tight text-slate-900">Cuentas Disponibles</h2>
              {status.pages.length > 0 ? (
                <div className="grid gap-4">
                  {status.pages.map(page => (
                    <AppCard key={page.id} className="border-slate-200">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 flex items-center justify-center rounded-xl ${
                            page.platform === 'INSTAGRAM' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {page.platform === 'INSTAGRAM' ? <Globe className="h-6 w-6" /> : <Share2 className="h-6 w-6" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{page.name}</h4>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                              {page.platform} • ID: {page.pageId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Activo</span>
                        </div>
                      </div>
                    </AppCard>
                  ))}
                </div>
              ) : (
                <AppCard className="bg-slate-50 border-dashed border-slate-200">
                  <div className="p-12 text-center">
                    <Info className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">No se detectaron páginas o cuentas vinculadas.</p>
                  </div>
                </AppCard>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <AppCard className="bg-slate-900 text-white overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
                <ShieldAlert className="h-5 w-5 text-brand-400" />
                Seguridad Superadmin
              </h3>
              <p className="mt-4 text-slate-400 text-sm leading-relaxed">
                Esta integración funciona con permisos controlados. 
                RaicesPilot <span className="text-white font-bold">no publicará</span> contenido sin aprobación humana explícita.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Tokens cifrados con AES-256-GCM",
                  "Human-in-the-loop obligatorio",
                  "Exclusivo para Superadmin",
                  "Registro total en Audit Logs"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </AppCard>

          <AppCard className="border-slate-200">
            <div className="p-6">
              <h3 className="text-lg font-black tracking-tight text-slate-900 mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-slate-400" />
                Capacidades del Entorno
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Solo Lectura", enabled: status.flags?.readonly, desc: "Visualización de páginas y estados." },
                  { label: "Publicación Manual", enabled: status.flags?.publishing, desc: "Posteo asistido de borradores." },
                  { label: "Publicación Programada", enabled: status.flags?.scheduled, desc: "Ejecución automática de agenda." },
                ].map((flag, i) => (
                  <div key={i} className={cn("flex items-start gap-3", !flag.enabled && "opacity-50")}>
                    {flag.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-slate-300 mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800">{flag.label}</p>
                      <p className="text-[10px] text-slate-500">{flag.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AppCard>

          <AppCard className="border-slate-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Hoja de Ruta</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center font-black text-emerald-600 shrink-0">3.0</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Publicación Asistida</h4>
                    <p className="text-xs text-slate-500 mt-1">Elegir página y subir borradores aprobados desde el calendario.</p>
                  </div>
                </div>
                <div className="flex gap-4 opacity-50">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 shrink-0">4.0</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Full Automation</h4>
                    <p className="text-xs text-slate-500 mt-1">Programación directa y métricas de rendimiento en tiempo real.</p>
                  </div>
                </div>
              </div>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
