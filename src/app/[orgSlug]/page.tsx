import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { SetupChecklist } from "@/components/workspace/setup-checklist";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getLeadSummary, listOrganizationLeads } from "@/modules/leads/service";
import {
  getOrganizationWorkspace,
  getSetupChecklistStatus,
  listWorkspaceNotifications,
} from "@/modules/organizations/service";
import { getPropertySummary, listOrganizationProperties } from "@/modules/properties/service";
import { getUserRoleBreakdown, listOrganizationUsers } from "@/modules/users/service";
import { getVisitSummary, listOrganizationVisits } from "@/modules/visits/service";
import { prisma } from "@/server/db/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default async function OrganizationHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [
    organization,
    setupChecklist,
    leads,
    leadSummary,
    properties,
    propertySummary,
    users,
    roleBreakdown,
    visits,
    visitSummary,
    notifications,
  ] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    getSetupChecklistStatus(orgSlug),
    listOrganizationLeads(orgSlug),
    getLeadSummary(orgSlug),
    listOrganizationProperties(orgSlug),
    getPropertySummary(orgSlug),
    listOrganizationUsers(orgSlug),
    getUserRoleBreakdown(orgSlug),
    listOrganizationVisits(prisma, orgSlug),
    getVisitSummary(prisma, orgSlug),
    listWorkspaceNotifications(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">
          Resumen Mensual
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Métricas clave de operación y rendimiento comercial de la cuenta.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Nuevos Leads"
          value={String(leadSummary.newCount)}
          hint="Oportunidades generadas en el período actual."
        />
        <MetricCard
          label="Visitas Abiertas"
          value={String(visitSummary.pendingCount + visitSummary.confirmedCount)}
          hint="Encuentros comerciales en progreso."
        />
        <MetricCard
          label="Inventario Disponible"
          value={String(propertySummary.availableCount)}
          hint={`De ${organization.propertyCount} propiedades totales activas.`}
        />
        <MetricCard
          label="Ventas / Cierres"
          value="—"
          hint="Pendiente de integración con módulo de facturación."
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <SectionCard
            eyebrow="Pipeline"
            title="Embudo de Ventas"
            description="Estado actual de las oportunidades y operaciones de la inmobiliaria."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contacto</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{leadSummary.total}</p>
                <p className="mt-1 text-xs text-brand-600 font-medium">Leads activos</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Visita</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{visitSummary.confirmedCount}</p>
                <p className="mt-1 text-xs text-blue-600 font-medium">Propiedades mostradas</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm opacity-60">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Negociación</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">—</p>
                <p className="mt-1 text-[10px] text-slate-400 font-medium uppercase tracking-wide">Próxima capa</p>
              </div>
            </div>

            {leads.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="mb-4 text-sm font-medium text-slate-700">Leads calientes recientes</p>
                <div className="space-y-3">
                  {leads.slice(0, 3).map((lead) => (
                    <div
                      key={lead.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-950">{lead.fullName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {lead.propertyTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-500">{lead.ownerName}</span>
                        <StatusBadge
                          label={lead.status.replaceAll("_", " ")}
                          tone={lead.status === "VISIT" ? "warning" : "info"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Operaciones"
            title="Actividad Autopilot vs Equipo"
            description="Distribución de la carga de trabajo entre automatizaciones y operadores humanos."
          >
             <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267a8.25 8.25 0 1113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </div>
                  <p className="mt-4 text-xl font-semibold text-slate-950">Atención Inicial IA</p>
                  <p className="mt-1 text-sm text-slate-500">100% matcheo</p>
                  <StatusBadge label="Activo y operando" tone="success" />
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <p className="mt-4 text-xl font-semibold text-slate-950">Intervención Manual</p>
                  <p className="mt-1 text-sm text-slate-500">{notifications.length} eventos</p>
                  <StatusBadge label="Requiere acción" tone="warning" />
                </div>
             </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Rendimiento"
            title="Equipo Comercial"
            description="Visibilidad de gestión de cartera por miembro."
          >
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-950">{user.fullName}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {user.role.replace("OWNER", "Titular").replace("ADMIN", "Admin").replace("AGENT", "Agente").replace("ASSISTANT", "Asistente")}
                    </p>
                  </div>
                  <div className="text-right">
                     <p className="text-xl font-semibold text-slate-950">—</p>
                     <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">Deals Asignados</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          
          <SectionCard
            eyebrow="Notificaciones"
            title="Centro de Alertas"
            description="Eventos que requieren revisión urgente."
          >
            <div className="space-y-3">
              {notifications.slice(0,4).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <StatusBadge
                      label={
                        notification.type === "OPERATOR_ACTION_REQUIRED"
                          ? "Acción requerida"
                          : "Evento"
                      }
                      tone={
                        notification.type === "OPERATOR_ACTION_REQUIRED"
                          ? "warning"
                          : "info"
                      }
                    />
                    <span className="text-xs text-slate-400">{formatDateTime(notification.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{notification.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{notification.body}</p>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-sm text-slate-500">No hay alertas recientes.</p>
              )}
            </div>
          </SectionCard>
        </div>
      </section>
    </>
  );
}
