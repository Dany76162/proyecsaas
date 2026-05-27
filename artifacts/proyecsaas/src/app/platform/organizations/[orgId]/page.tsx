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
      <div className="flex flex-col gap-4">
        <Link 
          href="/platform/organizations"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-bold transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Clientes / Inmobiliarias
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100 text-brand-700">
              <Building2 className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="brand">{subscription.planCode || "PLAN NO ASIGNADO"}</Badge>
                {subscription.lifetimeGrantedAt ? (
                  <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">LIFETIME ACTIVO</Badge>
                ) : (
                  <Badge variant="info" className="bg-blue-50 text-blue-700 border-blue-200">SaaS-to-Own</Badge>
                )}
                <Badge className={cn(
                  subscription.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  subscription.status === "TRIALING" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  subscription.status === "PAST_DUE" ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" :
                  "bg-slate-100 text-slate-700"
                )}>
                  CRM: {subscription.status}
                </Badge>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                {org.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500 font-medium">
                Slug: <span className="text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-md font-bold text-xs">{org.slug}</span> • 
                Monto: <span className="text-emerald-700 font-bold">{org.planLabel || "—"}</span>
              </p>
            </div>
          </div>
          
          <a
            href={`/${org.slug}/properties`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 border border-slate-200 shadow-sm"
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
                al.type === "critical" ? "bg-rose-50 border-rose-100 text-rose-800" :
                al.type === "warning" ? "bg-amber-50 border-amber-100 text-amber-800" :
                al.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                "bg-blue-50 border-blue-100 text-blue-800"
              )}
            >
              <AlertCircle className={cn(
                "w-5 h-5 shrink-0 mt-0.5",
                al.type === "critical" ? "text-rose-600" :
                al.type === "warning" ? "text-amber-600" :
                al.type === "success" ? "text-emerald-600" :
                "text-blue-600"
              )} />
              <div>
                <p className="font-bold text-sm text-slate-900">{al.message}</p>
                <p className="text-xs font-semibold opacity-90 mt-0.5">{al.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid Comercial & Control Vitalicio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ficha Comercial (SaaS-to-Own) */}
        <Card className="bg-white border border-slate-200/60 p-6 flex flex-col justify-between lg:col-span-2 shadow-sm rounded-2xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                Adquisición SaaS-to-Own
              </h3>
              {subscription.lifetimeGrantedAt ? (
                <Badge variant="success" className="bg-emerald-55 text-slate-950 font-black">LIFETIME CONCEDIDO</Badge>
              ) : (
                <Badge variant="neutral">EN PROGRESO</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Pagos Completados</p>
                <p className="text-xl font-bold text-slate-900">{subscription.paidCycles} <span className="text-xs font-normal text-slate-400">/ 12</span></p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Monto Mensual</p>
                <p className="text-xl font-bold text-emerald-700">{org.planLabel || "—"}</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Estado de IA</p>
                <p className="text-xl font-bold text-slate-900 flex items-center gap-1.5">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    subscription.aiStatus === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-pulse"
                  )}></span>
                  {subscription.aiStatus}
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">SaaS de por Vida</p>
                <p className="text-xl font-bold text-slate-700">
                  {subscription.lifetimeGrantedAt ? "Activo" : "Pendiente"}
                </p>
              </div>
            </div>

            {/* Progreso Vitalicio */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-550">Progreso acumulado:</span>
                <span className="text-brand-600">{subscription.paidCycles} / 12 meses pagos ({Math.round(lifetimeProgress)}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    subscription.lifetimeGrantedAt ? "bg-emerald-500" : "bg-brand-500"
                  )}
                  style={{ width: `${lifetimeProgress}%` }}
                ></div>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-1">
              <p className="font-medium">📌 **Inicio Comercial:** {subscription.lifetimeGrantedAt ? "Licencia Vitalicia Adquirida" : "Ciclo activo de 12 pagos hacia el Lifetime."}</p>
              {subscription.lifetimeGrantedAt && (
                <p className="font-semibold text-emerald-800">🏆 **Concesión:** Habilitado el {new Date(subscription.lifetimeGrantedAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Consola de Consumo de IA (AgentOS) */}
        <Card className="bg-white border border-slate-200/60 p-6 flex flex-col justify-between shadow-sm rounded-2xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-violet-500" />
                Métricas de AgentOS
              </h3>
              <Badge variant={subscription.aiStatus === "ACTIVE" ? "success" : "danger"}>
                IA: {subscription.aiStatus}
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Progreso de Conversaciones */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-550">Conversaciones simples/mes:</span>
                  <span className={cn(
                    conversationUsagePct >= 100 ? "text-rose-600 font-bold" :
                    conversationUsagePct >= 85 ? "text-amber-600 font-bold" : "text-violet-650 font-bold"
                  )}>
                    {subscription.aiMonthlyConversationsUsed} / {subscription.aiMonthlyConversationLimit}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
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
              <ul className="space-y-3 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", isAiActive ? "bg-emerald-550" : "bg-rose-500")}></div>
                  Bot responde en WhatsApp: **{isAiActive ? "Sí" : "No (Pausado/CRM vitalicio activo)"}**
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Límite mensual del plan: **{subscription.aiMonthlyConversationLimit} conversaciones**
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Próximo reset de cuota: **{subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "Sin fecha definida"}**
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  Margen financiero de IA: **Positivo (Monitoreado)**
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 font-semibold leading-tight">
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
      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-6 flex flex-col md:flex-row gap-6 md:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 border border-violet-200 text-violet-650">
          <Zap className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-1">
            Recomendación de Customer Success (AgentOS Diagnostic)
          </h3>
          <p className="text-lg font-extrabold text-slate-900 leading-tight">
            {audit.suggestedAction}
          </p>
          <p className="text-sm text-slate-655 mt-1 font-medium">
            {audit.suggestedActionReason}
          </p>
        </div>
      </div>

      {/* Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WhatsApp Check */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                Canal WhatsApp
              </h3>
              {isWaActive ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
            </div>
            <p className="text-2xl font-black text-slate-900 mb-1">
              {whatsapp.status}
            </p>
            <p className="text-xs text-slate-500 mb-4 font-semibold">
              Último mensaje: {whatsapp.lastInbound ? formatDistanceToNow(whatsapp.lastInbound, { locale: es, addSuffix: true }) : "Nunca"}
            </p>
          </div>
          <Link 
            href={`/${org.slug}/settings/integrations/whatsapp`} 
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-100 w-full"
            target="_blank"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Configurar WhatsApp
          </Link>
        </div>

        {/* AI Agent Check */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-500" />
                Agente IA
              </h3>
              {subscription.aiStatus === "ACTIVE" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500 animate-pulse" />}
            </div>
            <p className="text-2xl font-black text-slate-900 mb-1">
              {aiAgent.status}
            </p>
            <p className="text-xs text-slate-500 mb-4 font-semibold">
              {aiAgent.name ? `Agente: ${aiAgent.name}` : "Aún no configurado"}
            </p>
          </div>
          <Link 
            href={`/${org.slug}/agents`} 
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-100 w-full"
            target="_blank"
          >
            <Bot className="w-3.5 h-3.5 text-slate-500" />
            Gestionar Agente
          </Link>
        </div>

        {/* Catalog Check */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Home className="w-4 h-4 text-blue-500" />
                Catálogo Operativo
              </h3>
              {catalog.public > 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
            </div>
            <p className="text-2xl font-black text-slate-900 mb-1">
              {catalog.public} <span className="text-lg font-medium text-slate-500">visibles</span>
            </p>
            <p className="text-xs text-slate-500 mb-4 font-semibold">
              De {catalog.total} listados totales.
            </p>
          </div>
          <Link 
            href={`/${org.slug}/properties`} 
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-100 w-full"
            target="_blank"
          >
            <FolderTree className="w-3.5 h-3.5 text-slate-500" />
            Revisar Catálogo
          </Link>
        </div>
      </div>

      {/* Handoffs Audit */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 leading-none">Auditoría de Derivaciones (Handoffs)</h2>
            <p className="text-xs text-slate-500 mt-2 font-medium">Las últimas 10 conversaciones donde la IA cedió el control a humanos.</p>
          </div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {recentHandoffs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-semibold text-xs">
              <p>No hay derivaciones recientes para auditar.</p>
            </div>
          ) : (
            recentHandoffs.map((handoff) => (
              <div key={handoff.id} className={cn(
                "p-6 transition-colors hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center gap-6 justify-between",
                handoff.unanswered ? "bg-rose-50/20" : ""
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-bold text-slate-900 truncate max-w-[200px] text-sm">
                      {handoff.participantName}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      {handoff.lastMessageAt ? formatDistanceToNow(handoff.lastMessageAt, { locale: es, addSuffix: true }) : "Sin fecha"}
                    </span>
                    {handoff.unanswered ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                        Atascado (Sin Respuesta)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                        Atendido
                      </span>
                    )}
                  </div>
                  <div className="relative mb-2">
                    <MessageCircle className="absolute left-0 top-0.5 w-4 h-4 text-slate-400" />
                    <p className="text-xs text-slate-600 pl-6 line-clamp-2 italic font-medium">
                      "{handoff.snippet || "Mensaje ilegible"}"
                    </p>
                  </div>
                </div>
                <div>
                  <Link
                    href={`/${org.slug}/conversations`}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 whitespace-nowrap shadow-sm"
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
