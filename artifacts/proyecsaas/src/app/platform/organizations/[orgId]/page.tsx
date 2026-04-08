import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrgAiAudit } from "./actions";
import { 
  Building2, 
  ArrowLeft,
  MessageSquare,
  BotPulse,
  Home,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ExternalLink,
  Zap,
  Settings,
  FolderTree,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Auditoría de Inquilino | Superadmin",
};

export default async function OrgAuditPage({ params }: { params: { orgId: string } }) {
  const audit = await getOrgAiAudit(params.orgId).catch(() => null);

  if (!audit) {
    notFound();
  }

  const { org, whatsapp, aiAgent, catalog, recentHandoffs, subscription } = audit;

  const isWaActive = whatsapp.status === "ACTIVE";
  const isAiActive = aiAgent.status === "ACTIVE";

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto w-full pb-20">
      
      {/* Header & Back */}
      <div className="flex flex-col gap-6">
        <Link 
          href="/platform/ai-operations"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Radar IA
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                {org.name}
              </h1>
              <p className="mt-1 text-sm text-slate-400 flex items-center gap-2">
                Slug: <span className="text-slate-300 font-mono bg-white/5 px-2 rounded-md">{org.slug}</span> • 
                Plan: <span className="text-violet-300">{org.planLabel || "Desconocido"}</span> •
                Suscripción: <span className={cn(
                  "font-medium",
                  subscription.status === "TRIALING" ? "text-amber-400" :
                  subscription.status === "ACTIVE" ? "text-emerald-400" : "text-slate-400"
                )}>{subscription.status}</span>
                {subscription.daysLeft !== null && ` (${subscription.daysLeft} días funcionales)`}
              </p>
            </div>
          </div>
          
          <a
            href={`/${org.slug}/catalogo`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Ver Sitio Público
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Suggested Action Bar */}
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-6 flex flex-col md:flex-row gap-6 md:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
          <Zap className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400 mb-1">
            Recomendación de Customer Success
          </h3>
          <p className="text-lg font-medium text-white">
            {audit.suggestedAction}
          </p>
          <p className="text-sm text-violet-200/70 mt-1">
            {audit.suggestedActionReason}
          </p>
        </div>
      </div>

      {/* Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WhatsApp Check */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Canal WhatsApp
              </h3>
              {isWaActive ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {whatsapp.status}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Último mensaje: {whatsapp.lastInbound ? formatDistanceToNow(whatsapp.lastInbound, { locale: es, addSuffix: true }) : "Nunca"}
            </p>
          </div>
          <Link 
            href={`/${org.slug}/settings/integrations/whatsapp`} 
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/5 py-2 px-3 text-xs font-medium text-white transition hover:bg-white/10 w-full"
            target="_blank"
          >
            <Settings className="w-3.5 h-3.5" />
            Configurar WhatsApp
          </Link>
        </div>

        {/* AI Agent Check */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <BotPulse className="w-4 h-4 text-violet-400" />
                Agente IA
              </h3>
              {isAiActive ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-amber-400" />}
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {aiAgent.status}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              {aiAgent.name ? `Agente: ${aiAgent.name}` : "Aún no configurado"}
            </p>
          </div>
          <Link 
            href={`/${org.slug}/agents`} 
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/5 py-2 px-3 text-xs font-medium text-white transition hover:bg-white/10 w-full"
            target="_blank"
          >
            <BotPulse className="w-3.5 h-3.5" />
            Gestionar Agente
          </Link>
        </div>

        {/* Catalog Check */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Home className="w-4 h-4 text-blue-400" />
                Catálogo Operativo
              </h3>
              {catalog.public > 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {catalog.public} <span className="text-lg font-medium text-slate-400">visibles</span>
            </p>
            <p className="text-sm text-slate-500 mb-4">
              De {catalog.total} listados totales.
            </p>
          </div>
          <Link 
            href={`/${org.slug}/catalog`} 
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/5 py-2 px-3 text-xs font-medium text-white transition hover:bg-white/10 w-full"
            target="_blank"
          >
            <FolderTree className="w-3.5 h-3.5" />
            Revisar Catálogo
          </Link>
        </div>
      </div>

      {/* Handoffs Audit */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Auditoría de Derivaciones (Handoffs)</h2>
            <p className="text-sm text-slate-400">Las últimas 10 conversaciones donde la IA cedió el control a humanos.</p>
          </div>
        </div>
        
        <div className="divide-y divide-white/5">
          {recentHandoffs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p>No hay derivaciones recientes para auditar.</p>
            </div>
          ) : (
            recentHandoffs.map((handoff) => (
              <div key={handoff.id} className={cn(
                "p-6 transition-colors hover:bg-white/5 flex flex-col md:flex-row md:items-center gap-6 justify-between",
                handoff.unanswered ? "bg-rose-500/5" : ""
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-white truncate max-w-[200px]">
                      {handoff.participantName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {handoff.lastMessageAt ? formatDistanceToNow(handoff.lastMessageAt, { locale: es, addSuffix: true }) : "Sin fecha"}
                    </span>
                    {handoff.unanswered ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400 uppercase tracking-widest border border-rose-500/30">
                        Atascado (Sin Respuesta)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                        Atendido
                      </span>
                    )}
                  </div>
                  <div className="relative mb-2">
                    <MessageCircle className="absolute left-0 top-1 w-4 h-4 text-slate-500" />
                    <p className="text-sm text-slate-400 pl-6 line-clamp-2 italic">
                      "{handoff.snippet || "Mensaje ilegible"}"
                    </p>
                  </div>
                </div>
                <div>
                  <Link
                    href={`/${org.slug}/conversations`}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/20 whitespace-nowrap"
                  >
                    Ver en Inbox
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
