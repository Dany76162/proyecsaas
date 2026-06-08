import { requirePlatformAdmin } from "@/server/auth/access";
import { AppCard } from "@/components/ui/app-card";
import Link from "next/link";
import { Share2, Globe, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { getMetaConnectionStatus } from "@/modules/agents/meta-service";

export default async function AgentIntegrationsPage() {
  await requirePlatformAdmin();
  const metaStatus = await getMetaConnectionStatus();

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Integraciones de AgentOS</h1>
          <p className="mt-2 text-slate-500">Conecta la inteligencia de RaicesPilot con plataformas externas.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AppCard className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
              <Share2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Meta (FB/IG)</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Conecta tus páginas de Facebook y cuentas de Instagram para visualización y futura publicación.
            </p>
            
            <div className="mt-6 flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                metaStatus.isConnected 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                  : "bg-slate-50 text-slate-500 border border-slate-200"
              }`}>
                {metaStatus.isConnected ? "Conectado" : "No conectado"}
              </span>
              
              <Link 
                href="/platform/agents/integrations/meta"
                className="text-xs font-black uppercase tracking-widest text-brand-600 hover:underline"
              >
                Configurar
              </Link>
            </div>
          </div>
        </AppCard>

        {/* Integraciones en hoja de ruta */}
        <AppCard className="opacity-50 border-slate-200 bg-slate-50/30 cursor-default">
          <div className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-300 mb-4">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-400">WhatsApp Cloud</h3>
            <p className="mt-2 text-sm text-slate-400">
              Integración nativa con la API de WhatsApp para envío de mensajes transaccionales.
            </p>
            <div className="mt-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <ShieldCheck className="h-3 w-3" />
                Hoja de ruta
              </span>
            </div>
          </div>
        </AppCard>

        <AppCard className="opacity-50 border-slate-200 bg-slate-50/30 cursor-default">
          <div className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-300 mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-400">Webhooks</h3>
            <p className="mt-2 text-sm text-slate-400">
              Dispara eventos externos cuando AgentOS completa una tarea o requiere atención humana.
            </p>
            <div className="mt-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <ShieldCheck className="h-3 w-3" />
                Hoja de ruta
              </span>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
