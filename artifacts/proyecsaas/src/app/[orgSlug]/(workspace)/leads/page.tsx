export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Users, Search } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StageColumn } from "@/components/workspace/stage-column";
import { StatusBadge } from "@/components/workspace/status-badge";
import { createLeadAction } from "@/modules/leads/actions";
import { getLeadSummary, listOrganizationLeads } from "@/modules/leads/service";
import type { LeadStage } from "@/modules/leads/types";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { formatDate } from "@/lib/utils";
import { LeadMiniCard } from "@/components/workspace/lead-mini-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const stageOrder: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "VISIT",
  "CLOSED",
];

const LEAD_STATUS_LABELS: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "info" | "danger" }> = {
  NEW:        { label: "Nuevo",      tone: "neutral" },
  CONTACTED:  { label: "Contactado", tone: "info" },
  INTERESTED: { label: "Interesado", tone: "info" },
  VISIT:      { label: "En Visita",  tone: "warning" },
  CLOSED:     { label: "Cerrado",    tone: "success" },
};

const STAGE_TITLE_MAP: Record<LeadStage, string> = {
  NEW:        "NUEVO",
  CONTACTED:  "CONTACTADO",
  INTERESTED: "INTERESADO",
  VISIT:      "EN VISITA",
  CLOSED:     "CERRADO",
};

const TEMPERATURE_CONFIG = {
  hot:     { label: "Caliente", tone: "warning" as const, dot: "bg-red-400" },
  warm:    { label: "Tibio",    tone: "info"    as const, dot: "bg-amber-400" },
  cold:    { label: "Frío",     tone: "neutral" as const, dot: "bg-slate-400" },
  unclear: { label: "Indefinido", tone: "neutral" as const, dot: "bg-slate-300" },
};

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
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_4px_rgba(35,86,217,0.15)]" />
              <span className="text-sm font-semibold text-brand-700">Embudo Comercial</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Prospectos
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-500 font-medium">
              Gestioná tu pipeline de ventas y hacé seguimiento de cada oportunidad desde el primer contacto.
            </p>
          </div>
        </div>
      </section>

      {/* ── KPI Strip ── */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="Nuevos"     value={String(summary.newCount)}       hint="Demanda entrante." tone="brand" />
        <MetricCard label="Contactados"value={String(summary.contactedCount)} hint="Primer contacto." />
        <MetricCard label="Interesados"value={String(summary.interestedCount)}hint="Perfil calificado." />
        <MetricCard label="En Visita"  value={String(summary.visitCount)}     hint="Agenda activa." tone="warning" />
        <MetricCard label="Cerrados"   value={String(summary.closedCount)}    hint="Ciclo completado." tone="success" />
      </section>

      {/* ── Quick Create + Search ── */}
      <section id="registro-lead" className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard eyebrow="Operación" title="Registro rápido de lead">
          <form action={createLeadAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Nombre completo</span>
              <Input
                name="fullName"
                required
                placeholder="Nombre del lead"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Teléfono móvil</span>
              <Input
                name="phone"
                required
                placeholder="+54 11 ..."
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Correo electrónico <span className="normal-case font-normal text-slate-400">(opcional)</span></span>
              <Input
                name="email"
                type="email"
                placeholder="lead@ejemplo.com"
              />
            </div>
            <div className="md:col-span-2 pt-2">
              <Button type="submit" variant="primary" className="w-full sm:w-auto min-w-[140px]">
                Registrar lead
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard eyebrow="Exploración" title="Filtrar cartera">
          <form className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Búsqueda global</span>
              <Input
                name="q"
                defaultValue={q}
                placeholder="Nombre, teléfono o email..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="secondary" size="sm" className="text-xs font-bold uppercase tracking-widest">
                Aplicar filtros
              </Button>
              {q ? (
                <Button asChild variant="outline" size="sm" className="text-xs font-bold uppercase tracking-widest">
                  <Link href={`/${orgSlug}/leads`}>Limpiar</Link>
                </Button>
              ) : null}
              <span className="ml-auto text-[11px] font-bold text-slate-300 tabular-nums uppercase tracking-widest">
                {query
                  ? `${leads.length} COINCIDENCIAS`
                  : `${summary.total} REGISTROS`}
              </span>
            </div>
          </form>
        </SectionCard>
      </section>

      {/* ── Pipeline Kanban ── */}
      <SectionCard eyebrow="Embudo" title="Embudo comercial" description="Estado de cada oportunidad desde el primer contacto hasta el cierre.">
        <div className="grid gap-3 xl:grid-cols-5">
          {stageOrder.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.status === stage);
            return (
              <StageColumn key={stage} title={STAGE_TITLE_MAP[stage]} count={stageLeads.length}>
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

      {/* ── DataTable Enterprise ── */}
      <SectionCard
        eyebrow="Registro"
        title="Cartera global"
        description="Vista completa de todos los leads con acceso rápido a cada perfil."
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            {/* Table Head */}
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="whitespace-nowrap px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Lead
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Propiedad
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Responsable
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Temperatura
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Etapa
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Último contacto
                </th>
                <th className="w-10 py-3 pr-4" />
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => {
                const statusConfig = LEAD_STATUS_LABELS[lead.status] ?? { label: lead.status, tone: "neutral" as const };
                const tempConfig = TEMPERATURE_CONFIG[lead.leadTemperature] ?? TEMPERATURE_CONFIG.unclear;

                return (
                  <tr
                    key={lead.id}
                    className="group transition-colors duration-100 hover:bg-slate-50/70"
                  >
                    {/* Lead name + contact */}
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/${orgSlug}/leads/${lead.id}`}
                        className="block font-semibold text-slate-900 hover:text-brand-600 transition-colors duration-150 text-sm leading-tight"
                      >
                        {lead.fullName}
                      </Link>
                      <div className="mt-1 space-y-0.5">
                        {lead.email ? (
                          <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {lead.email}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-slate-400">{lead.phone}</p>
                      </div>
                    </td>

                    {/* Property */}
                    <td className="px-4 py-3.5 text-sm text-slate-500 max-w-[160px]">
                      {lead.propertyId ? (
                        <Link
                          href={`/${orgSlug}/properties/${lead.propertyId}`}
                          className="line-clamp-1 hover:text-brand-600 transition-colors duration-150"
                        >
                          {lead.propertyTitle}
                        </Link>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      {lead.ownerName}
                    </td>

                    {/* Temperature */}
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full shrink-0", tempConfig.dot)} />
                        <span className="text-xs text-slate-500">{tempConfig.label}</span>
                      </span>
                    </td>

                    {/* Stage badge */}
                    <td className="px-4 py-3.5">
                      <StatusBadge label={statusConfig.label} tone={statusConfig.tone} />
                    </td>

                    {/* Last contact */}
                    <td className="px-4 py-3.5 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                      {formatDate(lead.lastContactAt)}
                    </td>

                    {/* Quick action — visible on hover */}
                    <td className="py-3.5 pr-4">
                      <Link
                        href={`/${orgSlug}/leads/${lead.id}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all duration-150 hover:bg-brand-50 hover:text-brand-600 group-hover:opacity-100"
                        title="Abrir lead"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {leads.length === 0 && (
            query ? (
              <EmptyState
                icon={Search}
                title={`Sin resultados para "${query}"`}
                description="Probá con otro nombre, teléfono o email."
                action={
                  <Link
                    href={`/${orgSlug}/leads`}
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Limpiar búsqueda
                  </Link>
                }
                className="m-5 border-0 bg-transparent"
              />
            ) : (
              <EmptyState
                icon={Users}
                title="Todavía no tenés leads"
                description="Los leads entran solos cuando un cliente te escribe por WhatsApp. También podés cargar uno manualmente."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button asChild variant="primary">
                      <Link href={`/${orgSlug}/captacion`}>Generar link de WhatsApp</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="#registro-lead">Crear lead manual</Link>
                    </Button>
                  </div>
                }
                className="m-5 border-0 bg-transparent"
              />
            )
          )}
        </div>
      </SectionCard>
    </>
  );
}
