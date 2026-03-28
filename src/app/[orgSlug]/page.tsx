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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Leads activos"
          value={String(organization.activeLeadCount)}
          hint="Candidatos siendo gestionados por el equipo comercial."
        />
        <MetricCard
          label="Propiedades"
          value={String(organization.propertyCount)}
          hint={`${organization.availablePropertyCount} propiedades disponibles.`}
        />
        <MetricCard
          label="Aptos publicación"
          value={String(organization.publicPropertyCount)}
          hint="Listas para publicar en mapas y portales."
        />
        <MetricCard
          label="Equipo"
          value={String(organization.memberCount)}
          hint="Usuarios activos en la inmobiliaria."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <SectionCard
          eyebrow="Pulso CRM"
          title="Embudo de Leads"
          description="Vistazo rápido del estado y responsables de las oportunidades."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{leadSummary.total}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Nuevos</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{leadSummary.newCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Interesados</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {leadSummary.interestedCount}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {leads.slice(0, 3).map((lead) => (
              <div
                key={lead.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-950">{lead.fullName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {lead.interestLabel} / {lead.ownerName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={lead.status.replaceAll("_", " ")}
                    tone={
                      lead.status === "VISIT"
                        ? "warning"
                        : lead.status === "CLOSED"
                          ? "success"
                          : "info"
                    }
                  />
                  <span className="text-sm text-slate-500">{lead.propertyTitle}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Equipo"
          title="Roles y permisos"
          description="Usuarios y configuración de accesos a la cuenta."
        >
          <div className="space-y-3">
            {roleBreakdown.map((item) => (
              <div
                key={item.role}
                className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
              >
                <p className="font-medium text-slate-700">{item.role}</p>
                <p className="text-lg font-semibold text-slate-950">{item.count}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4">
            <p className="text-sm font-medium text-slate-700">Miembros actuales</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {users.map((user) => user.fullName).join(", ")}.
            </p>
          </div>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Inventario"
        title="Estado de propiedades"
        description="El inventario interno está separado de la visibilidad pública para control total."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Disponibles</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {propertySummary.availableCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Listas para publicar</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {propertySummary.publicCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Ticket promedio</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {formatCurrency(propertySummary.averageTicketCents, properties[0]?.currency ?? "USD")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {properties.slice(0, 2).map((property) => (
            <div key={property.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-950">{property.title}</p>
                <StatusBadge
                  label={property.publicVisible ? "Público" : "Privado"}
                  tone={property.publicVisible ? "success" : "neutral"}
                />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {property.neighborhood}, {property.city}
              </p>
              <p className="mt-4 text-sm text-slate-600">
                {property.bedrooms ?? 0} dor / {property.bathrooms ?? 0} ba / {property.surfaceM2 ?? 0} m2
              </p>
              <p className="mt-4 text-lg font-semibold text-slate-950">
                {property.priceCents != null ? formatCurrency(property.priceCents, property.currency ?? "USD") : "Precio a consultar"}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Agenda"
        title="Próximas visitas"
        description="Visitas programadas conectando al lead con la propiedad en un único flujo operativo."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Programadas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{visitSummary.total}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {visitSummary.pendingCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Confirmadas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {visitSummary.confirmedCount}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {visits.slice(0, 3).map((visit) => (
            <div
              key={visit.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-950">{visit.leadName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {visit.propertyTitle} / {visit.ownerName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  label={visit.status}
                  tone={visit.status === "CONFIRMED" ? "success" : "warning"}
                />
                <span className="text-sm text-slate-500">{formatDate(visit.scheduledAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Notificaciones"
        title="Actividad reciente"
        description="Historial de seguimiento y eventos recientes para que el equipo detecte interacciones pendientes rápidamente."
      >
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={
                      notification.type === "OPERATOR_ACTION_REQUIRED"
                        ? "Acción requerida"
                        : notification.type === "FOLLOW_UP_RESOLVED"
                          ? "Resuelto"
                        : "Evento de visita"
                    }
                    tone={
                      notification.type === "OPERATOR_ACTION_REQUIRED"
                        ? "warning"
                        : notification.type === "FOLLOW_UP_RESOLVED"
                          ? "success"
                          : "info"
                    }
                  />
                  {notification.link ? (
                    <Link href={notification.link} className="text-sm font-medium text-brand-600">
                      Abrir
                    </Link>
                  ) : null}
                </div>
                <p className="font-semibold text-slate-950">{notification.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p>
              </div>
              <div className="text-sm text-slate-500">{formatDateTime(notification.createdAt)}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
