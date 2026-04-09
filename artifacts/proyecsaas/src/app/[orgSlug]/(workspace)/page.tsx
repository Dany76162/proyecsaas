export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

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
import { getPropertySummary } from "@/modules/properties/service";
import { listOrganizationUsers } from "@/modules/users/service";
import { getVisitSummary } from "@/modules/visits/service";
import { prisma } from "@/server/db/prisma";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Titular",
  ADMIN: "Administrador",
  AGENT: "Agente de ventas",
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
  ] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationLeads(orgSlug),
    getLeadSummary(orgSlug),
    getPropertySummary(orgSlug),
    listOrganizationUsers(orgSlug),
    getVisitSummary(prisma, orgSlug),
    listWorkspaceNotifications(orgSlug),
    getSetupChecklistStatus(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  const openVisitsCount = visitSummary.pendingCount + visitSummary.confirmedCount;
  const onboardingIncomplete = !setupStatus.isComplete;

  return (
    <>
      <WorkspaceHeader
        organization={organization}
        onboardingIncomplete={onboardingIncomplete}
        onboardingProgressLabel={`${setupStatus.completedCount}/${setupStatus.totalCount} pasos`}
        onboardingNextHref={`/${orgSlug}/onboarding`}
      />

      {onboardingIncomplete ? (
        <section className="mt-5">
          <SectionCard
            eyebrow="Onboarding Inicial"
            title="Completa los primeros pasos para empezar a usar la plataforma"
            description="Segui el recorrido guiado para dejar lista la inmobiliaria, entender como entra un lead y empezar a trabajar desde conversaciones."
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  Este recorrido esta pensado para que el equipo entienda rapido que hacer
                  primero, donde mirar cada consulta y como llevarla hacia una visita.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={`${setupStatus.completedCount}/${setupStatus.totalCount} pasos completados`}
                    tone="warning"
                  />
                  <StatusBadge label="Recorrido recomendado" tone="info" />
                </div>
              </div>

              <Link
                href={`/${orgSlug}/onboarding`}
                className="inline-flex w-fit rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Ir al onboarding
              </Link>
            </div>
          </SectionCard>
        </section>
      ) : null}

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard
          label="Nuevos Leads"
          value={String(leadSummary.newCount)}
          hint="Oportunidades del periodo actual."
        />
        <MetricCard
          label="Visitas Abiertas"
          value={String(openVisitsCount)}
          hint="Encuentros activos (pendientes + confirmadas)."
        />
        <MetricCard
          label="Inventario Disponible"
          value={String(propertySummary.availableCount)}
          hint={`De ${organization.propertyCount} propiedades activas en total.`}
        />
        <MetricCard
          label="Ventas / Cierres"
          value="—"
          hint="Pendiente de integracion con modulo de facturacion."
        />
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="space-y-5 lg:col-span-2">
          <SectionCard
            eyebrow="Pipeline"
            title="Embudo de Ventas"
            description="Estado actual de las oportunidades y operaciones de la inmobiliaria."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Contacto
                </p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">
                  {leadSummary.total}
                </p>
                <p className="mt-1 text-xs font-semibold text-indigo-600">Leads activos</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Visita
                </p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">
                  {visitSummary.confirmedCount}
                </p>
                <p className="mt-1 text-xs font-semibold text-blue-600">Confirmadas</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 opacity-50">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Negociacion
                </p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-400">—</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                  Proxima capa
                </p>
              </div>
            </div>

            {leads.length > 0 ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Leads calientes recientes
                </p>
                <div className="space-y-2">
                  {leads.slice(0, 3).map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{lead.fullName}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {lead.propertyTitle ?? "Sin propiedad"}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0 items-center gap-3">
                        <span className="text-xs font-medium text-slate-500">
                          {lead.ownerName}
                        </span>
                        <StatusBadge
                          label={lead.status.replaceAll("_", " ")}
                          tone={lead.status === "VISIT" ? "warning" : "info"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            eyebrow="Operaciones"
            title="Actividad IA vs equipo"
            description="Distribucion de carga entre automatizaciones IA y operadores humanos."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col rounded-xl border border-indigo-100 bg-indigo-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267a8.25 8.25 0 1113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </div>
                <p className="mt-4 text-base font-bold text-slate-900">Atencion Inicial IA</p>
                <p className="mt-1 text-sm text-slate-600">100% de cobertura inicial</p>
                <StatusBadge label="Activo y operando" tone="success" />
              </div>
              <div className="flex flex-col rounded-xl border border-amber-100 bg-amber-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                </div>
                <p className="mt-4 text-base font-bold text-slate-900">Intervencion Manual</p>
                <p className="mt-1 text-sm text-slate-600">
                  {notifications.length} evento{notifications.length !== 1 ? "s" : ""} pendiente
                  {notifications.length !== 1 ? "s" : ""}
                </p>
                <StatusBadge
                  label={notifications.length > 0 ? "Requiere accion" : "Sin pendientes"}
                  tone={notifications.length > 0 ? "warning" : "success"}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard
            eyebrow="Rendimiento"
            title="Equipo Comercial"
            description="Composicion del equipo activo."
          >
            <div className="space-y-3">
              {users.length === 0 ? (
                <p className="text-sm text-slate-500">Sin miembros registrados.</p>
              ) : null}
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{user.fullName}</p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </p>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className="text-lg font-extrabold text-slate-400">—</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                      cierres
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Notificaciones"
            title="Centro de Alertas"
            description="Eventos que requieren revision."
          >
            <div className="space-y-3">
              {notifications.slice(0, 4).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <StatusBadge
                      label={
                        notification.type === "OPERATOR_ACTION_REQUIRED"
                          ? "Accion requerida"
                          : "Evento"
                      }
                      tone={
                        notification.type === "OPERATOR_ACTION_REQUIRED" ? "warning" : "info"
                      }
                    />
                    <span className="text-xs text-slate-400">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {notification.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {notification.body}
                  </p>
                </div>
              ))}
              {notifications.length === 0 ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-5 text-center">
                  <p className="text-sm font-semibold text-emerald-700">Sin alertas activas</p>
                  <p className="mt-1 text-xs text-emerald-600">Todo opera con normalidad.</p>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </section>
    </>
  );
}
