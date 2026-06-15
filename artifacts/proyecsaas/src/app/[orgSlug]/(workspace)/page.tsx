export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { 
  ArrowUpRight, 
  Users, 
  Home, 
  MessageSquare, 
  Zap, 
  UserCheck, 
  AlertCircle,
  TrendingUp,
  LayoutGrid
} from "lucide-react";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { formatDateTime } from "@/lib/utils";
import { getLeadSummary, listOrganizationLeads } from "@/modules/leads/service";
import {
  getOrganizationWorkspace,
  getSetupChecklistStatus,
  listWorkspaceNotifications,
} from "@/modules/organizations/service";
import { clearWorkspaceNotificationsAction } from "@/modules/organizations/actions";
import { getPropertySummary } from "@/modules/properties/service";
import { listOrganizationUsers } from "@/modules/users/service";
import { getVisitSummary } from "@/modules/visits/service";
import { prisma } from "@/server/db/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Titular",
  ADMIN: "Administrador",
  AGENT: "Agente",
  ASSISTANT: "Asistente",
};

export default async function OrganizationHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [
    organization,
    leads,
    leadSummary,
    propertySummary,
    users,
    visitSummary,
    notifications,
    setupStatus,
    convTotal,
    convAi,
  ] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationLeads(orgSlug),
    getLeadSummary(orgSlug),
    getPropertySummary(orgSlug),
    listOrganizationUsers(orgSlug),
    getVisitSummary(prisma, orgSlug),
    listWorkspaceNotifications(orgSlug),
    getSetupChecklistStatus(orgSlug),
    prisma.conversation.count({
      where: { organization: { slug: orgSlug } },
    }),
    prisma.conversation.count({
      where: { organization: { slug: orgSlug }, isHumanControlled: false },
    }),
  ]);

  if (!organization) {
    notFound();
  }

  const openVisitsCount = visitSummary.pendingCount + visitSummary.confirmedCount;
  const onboardingIncomplete = !setupStatus.isComplete;

  const conversionRate =
    leadSummary.total > 0
      ? `${Math.round((leadSummary.closedCount / leadSummary.total) * 100)}%`
      : "Sin datos";

  const aiPct =
    convTotal > 0 ? Math.round((convAi / convTotal) * 100) : null;
  const humanPct = aiPct !== null ? 100 - aiPct : null;

  // Calculo de porcentajes para el embudo de ventas
  const totalLeads = leadSummary.total || 0;
  const contactedPct = totalLeads > 0 ? Math.round((leadSummary.contactedCount / totalLeads) * 100) : 0;
  const interestedPct = totalLeads > 0 ? Math.round((leadSummary.interestedCount / totalLeads) * 100) : 0;
  const visitPct = totalLeads > 0 ? Math.round((visitSummary.confirmedCount / totalLeads) * 100) : 0;
  const closedPct = totalLeads > 0 ? Math.round((leadSummary.closedCount / totalLeads) * 100) : 0;

  async function handleClearNotifications() {
    "use server";
    await clearWorkspaceNotificationsAction(orgSlug);
    revalidatePath(`/${orgSlug}`);
  }

  return (
    <>
      <WorkspaceHeader
        organization={organization}
        onboardingIncomplete={onboardingIncomplete}
        onboardingProgressLabel={`${setupStatus.completedCount}/${setupStatus.totalCount} pasos`}
        onboardingNextHref={`/${orgSlug}/onboarding`}
      />

      {/* ── Centro de Control Operativo ── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard
          label="Demanda entrante"
          value={String(leadSummary.newCount)}
          hint="Oportunidades sin procesar hoy."
          tone="brand"
        />
        <MetricCard
          label="Operaciones activas"
          value={String(openVisitsCount)}
          hint="Visitas en agenda."
          tone="warning"
        />
        <MetricCard
          label="Stock disponible"
          value={String(propertySummary.availableCount)}
          hint="Inventario para asignar."
        />
        <MetricCard
          label="Tasa de conversión"
          value={conversionRate}
          hint={leadSummary.total > 0 ? `${leadSummary.closedCount} de ${leadSummary.total} leads cerrados.` : "Aún no hay leads registrados."}
        />
      </section>

      {onboardingIncomplete && (
        <section>
          <SectionCard
            eyebrow="Configuración"
            title="Tu cuenta requiere atención"
            description="Completa los pasos de configuración para habilitar todas las funciones de IA y sincronización. Usá el botón “Continuar configuración” del encabezado para retomar donde quedaste."
          >
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={`${setupStatus.completedCount}/${setupStatus.totalCount} completados`}
                tone="warning"
                dot
              />
              <StatusBadge label="Configuración pendiente" tone="neutral" />
            </div>
          </SectionCard>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Main Column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Pipeline Summary */}
          <SectionCard
            eyebrow="Flujo"
            title="Embudo de Ventas"
            description="Estado actual del embudo comercial."
            actions={
              <Link href={`/${orgSlug}/leads`} className="text-[10px] font-bold uppercase tracking-widest text-brand-600 hover:text-brand-700">
                Ver embudo completo
              </Link>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Stat item 1 */}
              <div className="flex flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Oportunidades</span>
                </div>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{leadSummary.total}</p>
                <p className="mt-1 text-[10px] font-medium text-slate-400">Total acumulado</p>
              </div>
              {/* Stat item 2 */}
              <div className="flex flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-brand-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Calificados</span>
                </div>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{leadSummary.interestedCount}</p>
                <p className="mt-1 text-[10px] font-medium text-brand-600">Listos para cierre</p>
              </div>
              {/* Stat item 3 */}
              <div className="flex flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-amber-500">
                  <Home className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visitas</span>
                </div>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{visitSummary.confirmedCount}</p>
                <p className="mt-1 text-[10px] font-medium text-amber-600">Confirmadas</p>
              </div>
            </div>

            {/* Embudo Visual CSS */}
            {totalLeads > 0 ? (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/40 p-5 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Eficiencia Comercial por Etapas</h4>
                <div className="space-y-3.5">
                  {/* Contactados */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Contactados ({leadSummary.contactedCount})</span>
                      <span className="tabular-nums">{contactedPct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full transition-all duration-500" style={{ width: `${contactedPct}%` }} />
                    </div>
                  </div>

                  {/* Calificados */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Calificados/Interesados ({leadSummary.interestedCount})</span>
                      <span className="tabular-nums text-brand-600">{interestedPct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${interestedPct}%` }} />
                    </div>
                  </div>

                  {/* Visitas */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Visitas de Negociación ({visitSummary.confirmedCount})</span>
                      <span className="tabular-nums text-amber-600">{visitPct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${visitPct}%` }} />
                    </div>
                  </div>

                  {/* Cerrados */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Cierres Exitosos ({leadSummary.closedCount})</span>
                      <span className="tabular-nums text-emerald-600">{closedPct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${closedPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Prospectos Prioritarios */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-4">Oportunidades con prioridad alta</h4>
              {leads.length > 0 ? (
                <div className="space-y-2">
                  {leads.slice(0, 3).map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/${orgSlug}/leads/${lead.id}`}
                      className="group flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3 transition hover:border-slate-200 hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-none">{lead.fullName}</p>
                        <p className="mt-1 text-[11px] text-slate-500 truncate max-w-[200px]">
                          {lead.propertyTitle ?? "Sin propiedad asignada"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] font-medium text-slate-400">{lead.ownerName}</span>
                        <StatusBadge
                          label={lead.status === "VISIT" ? "Visita" : "Calificado"}
                          tone={lead.status === "VISIT" ? "warning" : "info"}
                          dot
                        />
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sin prospectos prioritarios" description="Los prospectos que requieren acción inmediata aparecerán aquí." icon={Users} />
              )}
            </div>
          </SectionCard>

          {/* AI vs Human Operations */}
          <SectionCard
            eyebrow="Infraestructura"
            title="Centro de Operaciones"
            description="Distribución de la carga de atención entre IA y equipo humano."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* AI Widget */}
              <div className="flex flex-col rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Zap className="h-5 w-5" />
                  </div>
                  <StatusBadge label="Activo" tone="success" dot />
                </div>
                <h4 className="mt-4 text-sm font-bold text-slate-900">Agentes de IA</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Respuesta instantánea 24/7 activada para todos los canales de entrada.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cobertura IA:</span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    {aiPct !== null ? `${aiPct}%` : "Sin datos"}
                  </span>
                </div>
              </div>
              {/* Human Widget */}
              <div className="flex flex-col rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <StatusBadge 
                    label={notifications.length > 0 ? "Atención req." : "Al día"} 
                    tone={notifications.length > 0 ? "warning" : "success"}
                    dot
                  />
                </div>
                <h4 className="mt-4 text-sm font-bold text-slate-900">Intervención Humana</h4>
                <p className="mt-1 text-xs text-slate-500">
                  {notifications.length} evento{notifications.length !== 1 ? "s" : ""} que requiere{notifications.length !== 1 ? "n" : ""} validación manual del equipo.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intervención:</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    notifications.length > 0 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {humanPct !== null ? `${humanPct}% conv.` : notifications.length > 0 ? `${notifications.length} Pendientes` : "Todo procesado"}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-5">
          {/* Team Performance */}
          <SectionCard
            eyebrow="Recursos"
            title="Equipo Activo"
            description="Composición del staff en este workspace."
            actions={
              <Link href={`/${orgSlug}/settings/users`} className="text-slate-400 hover:text-slate-600 transition">
                <LayoutGrid className="h-4 w-4" />
              </Link>
            }
          >
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="group flex items-center justify-between rounded-lg border border-slate-50 bg-slate-50/50 px-3.5 py-2.5 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge label="Activo" tone="neutral" />
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-4 italic">No hay miembros en el equipo.</p>
              )}
            </div>
          </SectionCard>

          {/* Notifications / Alerts */}
          <SectionCard
            eyebrow="Actividad"
            title="Alertas Críticas"
            description="Eventos que requieren revisión inmediata."
            actions={
              notifications.length > 0 ? (
                <form action={handleClearNotifications}>
                  <button type="submit" className="text-[10px] font-bold uppercase tracking-widest text-brand-600 hover:text-brand-700 transition">
                    Limpiar todas
                  </button>
                </form>
              ) : null
            }
          >
            <div className="space-y-3">
              {notifications.slice(0, 4).map((notification) => (
                <div
                  key={notification.id}
                  className="relative group rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition hover:border-slate-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      Acción requerida
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 leading-tight">
                    {notification.title}
                  </h5>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                    {notification.body}
                  </p>
                </div>
              ))}
              {notifications.length === 0 ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-8 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Todo bajo control</p>
                  <p className="mt-1 text-[11px] text-emerald-600/80">No hay alertas pendientes.</p>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
