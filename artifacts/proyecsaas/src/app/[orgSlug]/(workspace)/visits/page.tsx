export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { updateVisitStatusAction } from "@/modules/visits/actions";
import { getVisitSummary, listOrganizationVisits } from "@/modules/visits/service";
import { prisma } from "@/server/db/prisma";
import { formatDate } from "@/lib/utils";

const VISIT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELED: "Cancelada",
};

function getVisitStatusTone(status: string) {
  if (status === "CONFIRMED" || status === "COMPLETED") {
    return "success" as const;
  }

  if (status === "CANCELED") {
    return "neutral" as const;
  }

  return "warning" as const;
}

function getVisitActionOptions(status: string) {
  if (status === "PENDING") {
    return [
      { label: "Confirmar", nextStatus: "CONFIRMED" },
      { label: "Cancelar", nextStatus: "CANCELED" },
    ] as const;
  }

  if (status === "CONFIRMED") {
    return [
      { label: "Completar", nextStatus: "COMPLETED" },
      { label: "Cancelar", nextStatus: "CANCELED" },
    ] as const;
  }

  return [] as const;
}

export default async function VisitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ tab?: string; success?: string; error?: string }>;
}) {
  const { orgSlug } = await params;
  const { tab, success, error } = await searchParams;
  const view = tab === "all" ? "all" : "upcoming";

  const [organization, visits, summary] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationVisits(prisma, orgSlug, view),
    getVisitSummary(prisma, orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  const successMessage =
    success === "visit-confirmed"
      ? "Visita confirmada exitosamente."
      : success === "visit-completed"
        ? "Visita completada exitosamente."
        : success === "visit-canceled"
          ? "Visita cancelada exitosamente."
          : null;

  const errorMessage =
    error === "visit-not-found"
      ? "La visita seleccionada ya no existe en esta organización."
      : error === "invalid-visit-transition"
        ? "Ese cambio de estado de visita no está permitido."
        : error === "invalid-visit-status"
          ? "Acción de estado de visita inválida."
          : null;

  return (
    <>
      <WorkspaceHeader organization={organization} />

      {successMessage ? (
        <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 shadow-soft">
          {successMessage}
        </section>
      ) : null}

      {errorMessage ? (
        <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800 shadow-soft">
          {errorMessage}
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-4">
        <MetricCard label="Todas" value={String(summary.total)} hint="Agenda de visitas activas." />
        <MetricCard label="Pendientes" value={String(summary.pendingCount)} hint="A la espera de confirmación." />
        <MetricCard label="Confirmadas" value={String(summary.confirmedCount)} hint="Listas para realizarse." />
        <MetricCard label="Completadas" value={String(summary.completedCount)} hint="Finalizadas, revisión pendiente." />
      </section>

      <SectionCard
        eyebrow="Agenda"
        title="Tablero de Visitas"
        description="Visualización rápida de visitas organizadas por estado."
      >
        <nav className="mb-5 flex gap-4 border-b border-slate-200 pb-4">
          <Link
            href={`/${orgSlug}/visits`}
            className={
              view === "upcoming"
                ? "text-sm font-semibold text-brand-600"
                : "text-sm font-medium text-slate-500 hover:text-slate-700"
            }
          >
            Próximas
          </Link>
          <Link
            href={`/${orgSlug}/visits?tab=all`}
            className={
              view === "all"
                ? "text-sm font-semibold text-brand-600"
                : "text-sm font-medium text-slate-500 hover:text-slate-700"
            }
          >
            Todas
          </Link>
        </nav>

        <div className="space-y-4">
          {visits.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              {view === "upcoming"
                ? 'No hay visitas pendientes ni confirmadas. Usá "Todas" para el historial.'
                : "No hay visitas registradas."}
            </p>
          ) : (
            visits.map((visit) => (
              <article
                key={visit.id}
                className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-lg font-semibold text-slate-950">{visit.leadName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    <Link href={`/${orgSlug}/properties/${visit.propertyId}`} className="hover:text-brand-600">
                      {visit.propertyTitle}
                    </Link>
                    {" / "}
                    <Link href={`/${orgSlug}/leads/${visit.leadId}`} className="hover:text-brand-600">
                      Ver lead
                    </Link>
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{visit.notes}</p>
                </div>

                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <StatusBadge
                    label={VISIT_STATUS_LABELS[visit.status] ?? visit.status}
                    tone={getVisitStatusTone(visit.status)}
                  />
                  <p className="text-sm text-slate-500">{formatDate(visit.scheduledAt)}</p>
                  <p className="text-sm text-slate-500">{visit.ownerName}</p>
                  {getVisitActionOptions(visit.status).length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {getVisitActionOptions(visit.status).map((action) => (
                        <form key={action.nextStatus} action={updateVisitStatusAction}>
                          <input type="hidden" name="orgSlug" value={orgSlug} />
                          <input type="hidden" name="visitId" value={visit.id} />
                          <input type="hidden" name="nextStatus" value={action.nextStatus} />
                          <input type="hidden" name="tab" value={view} />
                          <button
                            type="submit"
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            {action.label}
                          </button>
                        </form>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </SectionCard>
    </>
  );
}
