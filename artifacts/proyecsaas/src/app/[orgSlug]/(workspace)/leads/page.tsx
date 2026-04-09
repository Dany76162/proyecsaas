export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LeadMiniCard } from "@/components/workspace/lead-mini-card";
import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StageColumn } from "@/components/workspace/stage-column";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { createLeadAction } from "@/modules/leads/actions";
import { getLeadSummary, listOrganizationLeads } from "@/modules/leads/service";
import type { LeadStage } from "@/modules/leads/types";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { formatDate } from "@/lib/utils";

const stageOrder: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "VISIT",
  "CLOSED",
];

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  INTERESTED: "Interesado",
  VISIT: "En Visita",
  CLOSED: "Cerrado",
};

const TEMPERATURE_LABELS: Record<string, string> = {
  hot: "Caliente",
  warm: "Tibio",
  cold: "Frío",
  unclear: "Indefinido",
};

function getTemperatureTone(temperature: "hot" | "warm" | "cold" | "unclear") {
  if (temperature === "hot") {
    return "warning" as const;
  }

  if (temperature === "warm") {
    return "info" as const;
  }

  return "neutral" as const;
}

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { orgSlug } = await params;
  const { q = "" } = await searchParams;
  const query = q.trim();
  const [organization, leads, summary] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationLeads(orgSlug, query || undefined),
    getLeadSummary(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="Acción"
          title="Nuevo lead"
          description="Carga rápida manual para agilidad comercial."
        >
          <form action={createLeadAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <label className="space-y-2 text-sm text-slate-600">
              <span>Nombre y Apellido</span>
              <input
                name="fullName"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
                placeholder="Nombre del lead"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>Teléfono</span>
              <input
                name="phone"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
                placeholder="+54 11 ..."
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
              <span>Email (opcional)</span>
              <input
                name="email"
                type="email"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
                placeholder="lead@ejemplo.com"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Crear Lead
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Búsqueda"
          title="Búsqueda rápida"
          description="Filtrá por nombre, teléfono o email."
        >
          <form className="space-y-3">
            <input
              name="q"
              defaultValue={q}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              placeholder="Buscar por nombre, teléfono o email"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Buscar
              </button>
              {q ? (
                <Link
                  href={`/${orgSlug}/leads`}
                  className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Limpiar
                </Link>
              ) : null}
            </div>
          </form>
          <p className="mt-4 text-sm text-slate-500">
            {query
              ? `${leads.length} resultado${leads.length === 1 ? "" : "s"} para "${q}"`
              : `Mostrando ${leads.length} de ${summary.total} leads.`}
          </p>
        </SectionCard>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="Nuevos" value={String(summary.newCount)} hint="Demanda entrante reciente." />
        <MetricCard
          label="Contactados"
          value={String(summary.contactedCount)}
          hint="Primer contacto en curso."
        />
        <MetricCard
          label="Interesados"
          value={String(summary.interestedCount)}
          hint="Perfil calificado."
        />
        <MetricCard
          label="En Visita"
          value={String(summary.visitCount)}
          hint="Agenda de visitas en marcha."
        />
        <MetricCard
          label="Cerrados"
          value={String(summary.closedCount)}
          hint="Ciclo comercial completado."
        />
      </section>

      <SectionCard
        eyebrow="Embudo"
        title="Flujo comercial"
        description="El tablero refleja el progreso de la oportunidad desde el primer contacto hasta el cierre."
      >
        <div className="grid gap-4 xl:grid-cols-5">
          {stageOrder.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.status === stage);

            return (
              <StageColumn key={stage} title={
                stage === "NEW" ? "NUEVO" :
                stage === "CONTACTED" ? "CONTACTADO" :
                stage === "INTERESTED" ? "INTERESADO" :
                stage === "VISIT" ? "EN VISITA" :
                stage === "CLOSED" ? "CERRADO" : stage
              } count={stageLeads.length}>
                {stageLeads.map((lead) => (
                  <LeadMiniCard
                    key={lead.id}
                    href={`/${orgSlug}/leads/${lead.id}`}
                    fullName={lead.fullName}
                    interestLabel={lead.interestLabel}
                    leadTemperature={lead.leadTemperature}
                    ownerName={lead.ownerName}
                    propertyTitle={lead.propertyTitle}
                    stageLabel={lead.status}
                  />
                ))}
              </StageColumn>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Lista"
        title="Registro global"
        description="Visualización tradicional de la cartera de leads."
      >
        <div className="overflow-x-auto">
          <table className="min-w-[680px] w-full text-left">
            <thead className="text-sm text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="pb-3 pr-4 font-semibold text-xs uppercase tracking-wider text-slate-400">Lead</th>
                <th className="pb-3 pr-4 font-semibold text-xs uppercase tracking-wider text-slate-400">Propiedad</th>
                <th className="pb-3 pr-4 font-semibold text-xs uppercase tracking-wider text-slate-400">Responsable</th>
                <th className="pb-3 pr-4 font-semibold text-xs uppercase tracking-wider text-slate-400">Origen</th>
                <th className="pb-3 pr-4 font-semibold text-xs uppercase tracking-wider text-slate-400">Etapa</th>
                <th className="pb-3 font-semibold text-xs uppercase tracking-wider text-slate-400">Último contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 pr-4">
                    <Link
                      href={`/${orgSlug}/leads/${lead.id}`}
                      className="font-semibold text-slate-950 hover:text-brand-600"
                    >
                      {lead.fullName}
                    </Link>
                    <div className="mt-1 text-sm text-slate-500">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="hover:text-brand-600">
                          {lead.email}
                        </a>
                      ) : (
                        <span>Sin email</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      <a href={`tel:${lead.phone}`} className="hover:text-brand-600">
                        {lead.phone}
                      </a>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-600">
                    {lead.propertyId ? (
                      <Link
                        href={`/${orgSlug}/properties/${lead.propertyId}`}
                        className="hover:text-brand-600"
                      >
                        {lead.propertyTitle}
                      </Link>
                    ) : (
                      lead.propertyTitle ?? "—"
                    )}
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-600">{lead.ownerName}</td>
                  <td className="py-4 pr-4 text-sm text-slate-600">{lead.source}</td>
                  <td className="py-4 pr-4">
                    <StatusBadge
                      label={LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                      tone={
                        lead.status === "CLOSED"
                          ? "success"
                          : lead.status === "VISIT"
                            ? "warning"
                            : "info"
                      }
                    />
                    <div className="mt-2">
                      <StatusBadge
                        label={TEMPERATURE_LABELS[lead.leadTemperature] ?? lead.leadTemperature}
                        tone={getTemperatureTone(lead.leadTemperature)}
                      />
                    </div>
                  </td>
                  <td className="py-4 text-sm text-slate-600">
                    {formatDate(lead.lastContactAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
