export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ArrowRight, Users } from "lucide-react";


import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
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
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.15)]" />
              <span className="text-sm font-semibold text-amber-700">Agenda Activa</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Visitas
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-500 font-medium">
              Gestioná tu calendario de visitas y confirmá citas agendadas por la IA o el equipo.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href={`/${orgSlug}/leads`}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              <Users className="h-4 w-4" />
              Programar visita desde un prospecto
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-amber-100 bg-amber-50/40 px-5 py-4">
        <p className="text-xs font-semibold text-amber-700">
          Las visitas se programan desde la ficha de cada prospecto para mantener el historial comercial conectado. Ingresá a un prospecto y usá la sección "Agendar visita" para registrar la cita.
        </p>
      </section>

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
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/30 p-8 text-center max-w-xl mx-auto my-6 space-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-soft mx-auto">
                <Calendar className="h-7 w-7" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">No hay visitas agendadas</h3>
                <p className="text-sm font-medium leading-relaxed text-slate-500">
                  {view === "upcoming"
                    ? "No tenés visitas programadas o confirmadas en tu agenda inmediata. Usá la pestaña 'Todas' para revisar el historial completo."
                    : "Aún no hay visitas registradas para este mes en tu organización."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-left bg-white border border-slate-100 rounded-2xl p-5 shadow-soft">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Automatizado por IA</p>
                  <p className="mt-2 text-xs font-semibold text-slate-600 leading-relaxed">
                    El asistente inteligente coordinará citas directamente con los interesados por WhatsApp según la disponibilidad de tu equipo.
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Desde el CRM</p>
                  <p className="mt-2 text-xs font-semibold text-slate-600 leading-relaxed">
                    Podés programar una visita en cualquier momento ingresando a la ficha del Lead interesado en la sección de Prospectos.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  href={`/${orgSlug}/leads`}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800"
                >
                  Ir a Prospectos
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/${orgSlug}/properties`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                >
                  Ver Propiedades
                </Link>
              </div>
            </div>
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
