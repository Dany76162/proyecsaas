import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrgAiAudit } from "./actions";
import { 
  Building2, 
  ArrowLeft,
  MessageSquare,
  Bot,
  Home,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ExternalLink,
  Zap,
  Settings,
  FolderTree,
  ShieldCheck,
  TrendingUp,
  Banknote,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import CommercialControls from "./CommercialControls";

export const metadata: Metadata = {
  title: "Ficha Comercial e Inteligente | Superadmin",
};

export default async function OrgAuditPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const audit = await getOrgAiAudit(orgId).catch(() => null);

  if (!audit) {
    notFound();
  }

  const { org, whatsapp, aiAgent, catalog, recentHandoffs, subscription } = audit;

  const isWaActive = whatsapp.status === "ACTIVE";
  const isAiActive = subscription.aiStatus === "ACTIVE";

  // Calculations for SaaS-to-Own
  const lifetimeProgress = Math.min((subscription.paidCycles / 12) * 100, 100);
  const isLifetimeEligible = subscription.paidCycles >= 12 && !subscription.lifetimeGrantedAt;
  const conversationUsagePct = Math.min((subscription.aiMonthlyConversationsUsed / subscription.aiMonthlyConversationLimit) * 100, 100);

  // Dynamic Alerts
  const alerts: Array<{ type: "warning" | "critical" | "success" | "info"; message: string; reason: string }> = [];

  if (subscription.status === "PAST_DUE") {
    alerts.push({
      type: "critical",
      message: "Cliente en mora (Impago)",
      reason: "La suscripción de CRM está en estado PAST_DUE. Se debe gestionar cobro o suspender."
    });
  }

  if (subscription.aiStatus === "PAUSED" && subscription.aiMonthlyConversationsUsed >= subscription.aiMonthlyConversationLimit) {
    alerts.push({
      type: "critical",
      message: "IA pausada automáticamente por límite de cuota",
      reason: `La IA fue pausada de forma aislada tras consumir la totalidad del límite mensual (${subscription.aiMonthlyConversationsUsed}/${subscription.aiMonthlyConversationLimit}).`
    });
  } else {
    if (subscription.aiStatus === "PAUSED" || subscription.aiStatus === "DISABLED") {
      alerts.push({
        type: "warning",
        message: `Agente IA Pausado (${subscription.aiStatus})`,
        reason: "El bot no responderá conversaciones. El CRM y el catálogo siguen totalmente activos."
      });
    }

    if (subscription.aiMonthlyConversationsUsed >= subscription.aiMonthlyConversationLimit) {
      alerts.push({
        type: "critical",
        message: "Límite de conversaciones superado",
        reason: `Consumo actual (${subscription.aiMonthlyConversationsUsed}) superó el límite de ${subscription.aiMonthlyConversationLimit} mensual.`
      });
    } else if (subscription.aiMonthlyConversationsUsed >= subscription.aiMonthlyConversationLimit * 0.85) {
      alerts.push({
        type: "warning",
        message: "Cerca del límite de conversaciones",
        reason: `Ha consumido el ${Math.round(conversationUsagePct)}% de sus conversaciones mensuales. Sugerir recarga.`
      });
    }
  }

  if (isLifetimeEligible) {
    alerts.push({
      type: "success",
      message: "¡Elegible para Licencia Vitalicia!",
      reason: "Completó los 12 ciclos de pago mensuales. Listo para otorgar Lifetime de por vida."
    });
  } else if (subscription.paidCycles >= 10 && !subscription.lifetimeGrantedAt) {
    alerts.push({
      type: "info",
      message: "Camino a Licencia Vitalicia (Lifetime)",
      reason: `Faltan pocos pagos (${12 - subscription.paidCycles}) para transferir la propiedad SaaS de por vida.`
    });
  }

  if (catalog.total >= 50 && subscription.planCode === "FOUNDER") {
    alerts.push({
      type: "info",
      message: "Candidato a Upgrade de Plan",
      reason: "Tiene alto tráfico y catálogo activo. Recomendado pasar a Plan Pro."
    });
  }

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto px-2">
      
      {/* Header & Back */}
      <div className="flex flex-col gap-6">
        <Link 
          href="/platform/ai-operations"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Radar IA
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white">
              <Building2 className="h-6 w-6 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="brand">{subscription.planCode || "PLAN NO ASIGNADO"}</Badge>
                {subscription.lifetimeGrantedAt ? (
                  <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">LIFETIME ACTIVO</Badge>
                ) : (
                  <Badge variant="info" className="bg-blue-500/10 text-blue-400 border-blue-500/20">SaaS-to-Own</Badge>
                )}
                <Badge className={cn(
                  subscription.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                  subscription.status === "TRIALING" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                  subscription.status === "PAST_DUE" ? "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse" :
                  "bg-slate-800 text-slate-400"
                )}>
                  CRM: {subscription.status}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                {org.name}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Slug: <span className="text-slate-300 font-mono bg-white/5 px-2 rounded-md">{org.slug}</span> • 
                Monto: <span className="text-emerald-400 font-medium">{org.planLabel || "—"}</span>
              </p>
            </div>
          </div>
          
          <a
            href={`/${org.slug}/properties`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 border border-white/10 shadow-sm"
          >
            Ver Propiedades
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Alertas Críticas Comerciales */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((al, idx) => (
            <div 
              key={idx} 
              className={cn(
                "p-4 rounded-xl border flex gap-3 items-start",
                al.type === "critical" ? "bg-rose-500/10 border-rose-500/20 text-rose-300" :
                al.type === "warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-300" :
                al.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" :
                "bg-blue-500/10 border-blue-500/20 text-blue-300"
              )}
            >
              <AlertCircle className={cn(
                "w-5 h-5 shrink-0 mt-0.5",
                al.type === "critical" ? "text-rose-400" :
                al.type === "warning" ? "text-amber-400" :
                al.type === "success" ? "text-emerald-400" :
                "text-blue-400"
              )} />
              <div>
                <p className="font-bold text-sm text-white">{al.message}</p>
                <p className="text-xs opacity-90 mt-0.5">{al.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid Comercial & Control Vitalicio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ficha Comercial (SaaS-to-Own) */}
        <Card className="bg-slate-900/50 border border-white/5 p-6 flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                Adquisición SaaS-to-Own
              </h3>
              {subscription.lifetimeGrantedAt ? (
                <Badge variant="success" className="bg-emerald-500 text-slate-950 font-bold">LIFETIME CONCEDIDO</Badge>
              ) : (
                <Badge variant="neutral">EN PROGRESO</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/40 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Pagos Completados</p>
                <p className="text-xl font-bold text-white">{subscription.paidCycles} <span className="text-xs font-normal text-slate-500">/ 12</span></p>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Monto Mensual</p>
                <p className="text-xl font-bold text-emerald-400">{org.planLabel || "—"}</p>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Estado de IA</p>
                <p className="text-xl font-bold text-white flex items-center gap-1.5">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    subscription.aiStatus === "ACTIVE" ? "bg-emerald-400" : "bg-rose-400 animate-pulse"
                  )}></span>
                  {subscription.aiStatus}
                </p>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">SaaS de por Vida</p>
                <p className="text-xl font-bold text-slate-300">
                  {subscription.lifetimeGrantedAt ? "Activo" : "Pendiente"}
                </p>
              </div>
            </div>

            {/* Progreso Vitalicio */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Progreso acumulado:</span>
                <span className="text-brand-400">{subscription.paidCycles} / 12 meses pagos ({Math.round(lifetimeProgress)}%)</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-white/5">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    subscription.lifetimeGrantedAt ? "bg-emerald-500" : "bg-brand-500"
                  )}
                  style={{ width: `${lifetimeProgress}%` }}
                ></div>
              </div>
            </div>

            <div className="text-xs text-slate-400 bg-slate-800/20 p-4 rounded-xl border border-white/5 space-y-1">
              <p>📌 **Inicio Comercial:** {subscription.lifetimeGrantedAt ? "Licencia Vitalicia Adquirida" : "Ciclo activo de 12 pagos hacia el Lifetime."}</p>
              {subscription.lifetimeGrantedAt && (
                <p>🏆 **Concesión:** Habilitado el {new Date(subscription.lifetimeGrantedAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Consola de Consumo de IA (AgentOS) */}
        <Card className="bg-slate-900/50 border border-white/5 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-violet-400" />
                Métricas de AgentOS
              </h3>
              <Badge variant={subscription.aiStatus === "ACTIVE" ? "success" : "danger"}>
                IA: {subscription.aiStatus}
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Progreso de Conversaciones */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Conversaciones simples/mes:</span>
                  <span className={cn(
                    conversationUsagePct >= 100 ? "text-rose-400 font-bold" :
                    conversationUsagePct >= 85 ? "text-amber-400 font-bold" : "text-violet-400"
                  )}>
                    {subscription.aiMonthlyConversationsUsed} / {subscription.aiMonthlyConversationLimit}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden border border-white/5">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      conversationUsagePct >= 100 ? "bg-rose-500" :
                      conversationUsagePct >= 85 ? "bg-amber-500" : "bg-violet-500"
                    )}
                    style={{ width: `${conversationUsagePct}%` }}
                  ></div>
                </div>
              </div>

              {/* Diagnóstico rápido de IA */}
              <ul className="space-y-3 text-xs">
                <li className="flex items-center gap-2 text-slate-300">
                  <div className={cn("w-1.5 h-1.5 rounded-full", isAiActive ? "bg-emerald-400" : "bg-rose-400")}></div>
                  Bot responde en WhatsApp: **{isAiActive ? "Sí" : "No (Pausado/CRM vitalicio activo)"}**
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Límite mensual del plan: **{subscription.aiMonthlyConversationLimit} conversaciones**
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  Próximo reset de cuota: **{subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "Sin fecha definida"}**
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                  Margen financiero de IA: **Positivo (Monitoreado)**
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-500">
            ⚠️ Si el cliente se queda sin conversaciones, la IA se detendrá de forma aislada, manteniendo el CRM activo.
          </div>
        </Card>
      </div>

      {/* Controles Interactivos del Admin (Server Actions UI) */}
      <CommercialControls 
        orgId={org.id} 
        initialData={{
          status: subscription.status,
          planCode: subscription.planCode,
          paidCycles: subscription.paidCycles,
          aiStatus: subscription.aiStatus,
          aiMonthlyConversationLimit: subscription.aiMonthlyConversationLimit,
          aiMonthlyConversationsUsed: subscription.aiMonthlyConversationsUsed,
          lifetimeGrantedAt: subscription.lifetimeGrantedAt,
          planLabel: org.planLabel
        }} 
      />

      {/* Diagnóstico Operativo de Onboarding */}
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-6 flex flex-col md:flex-row gap-6 md:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
          <Zap className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400 mb-1">
            Recomendación de Customer Success (AgentOS Diagnostic)
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
                <Bot className="w-4 h-4 text-violet-400" />
                Agente IA
              </h3>
              {subscription.aiStatus === "ACTIVE" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400 animate-pulse" />}
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
            <Bot className="w-3.5 h-3.5" />
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
            href={`/${org.slug}/properties`} 
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
