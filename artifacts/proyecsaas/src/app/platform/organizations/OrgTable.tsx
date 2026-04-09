"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { HealthBadge, WhatsAppStatus, formatRelativeTime } from "@/components/platform/platform-ui";
import { OnboardingControls } from "@/components/platform/onboarding-controls";
import { CommercialControls } from "@/components/platform/commercial-controls";
import { DeleteOrganizationButton } from "@/components/platform/DeleteOrganizationButton";
import { TrashOrganizationButton } from "@/components/platform/TrashOrganizationButton";
import { CreateOrgDialog } from "@/components/platform/create-org-dialog";
import type { OrgPlatformSummary, PlatformPlanOption } from "@/modules/platform/types";

const HEALTH_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "ok", label: "OK" },
  { value: "warning", label: "Advertencia" },
  { value: "critical", label: "Crítico" },
] as const;

const VISIBILITY_FILTERS = [
  { value: "active", label: "Operativas" },
  { value: "trash", label: "Papelera" },
  { value: "all", label: "Todas" },
] as const;

function formatCommercialDate(isoDate: string | null) {
  if (!isoDate) return "Sin vencimiento";
  return new Date(isoDate).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getLifecycleLabel(org: OrgPlatformSummary) {
  if (org.isTrashed) return "En papelera";
  if (org.isActive) return "Activa";
  return "Suspendida";
}

function getLifecycleTone(org: OrgPlatformSummary) {
  if (org.isTrashed) return "bg-amber-100 text-amber-800";
  if (org.isActive) return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export function OrgTable({
  orgs,
  plans,
  platformOrgId,
}: {
  orgs: OrgPlatformSummary[];
  plans: PlatformPlanOption[];
  platformOrgId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("active");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orgs.filter((org) => {
      const matchSearch =
        !q ||
        org.name.toLowerCase().includes(q) ||
        (org.city ?? "").toLowerCase().includes(q) ||
        org.slug.toLowerCase().includes(q);
      const matchHealth = healthFilter === "all" || org.health === healthFilter;
      const matchVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "trash" ? org.isTrashed : !org.isTrashed);

      return matchSearch && matchHealth && matchVisibility;
    });
  }, [orgs, search, healthFilter, visibilityFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, slug o ciudad..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                showFilters || healthFilter !== "all" || visibilityFilter !== "active"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>

          <div className="w-full sm:w-auto">
            <CreateOrgDialog />
          </div>
        </div>

        {showFilters ? (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Vista:
              </span>
              {VISIBILITY_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setVisibilityFilter(filter.value)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    visibilityFilter === filter.value
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Salud:
              </span>
              {HEALTH_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setHealthFilter(filter.value)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    healthFilter === filter.value
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {search || healthFilter !== "all" || visibilityFilter !== "active" ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setHealthFilter("all");
                  setVisibilityFilter("active");
                }}
                className="self-end text-xs font-semibold text-slate-400 hover:text-slate-700"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : null}

        <p className="text-xs text-slate-400">
          {filtered.length} de {orgs.length} inmobiliaria{orgs.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Organización</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Salud sistémica</th>
                <th className="px-5 py-3.5">Canal WABA</th>
                <th className="px-5 py-3.5">Tráfico 7d</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Última actividad</th>
                <th className="px-5 py-3.5">Onboarding</th>
                <th className="px-5 py-3.5">Comercial</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((org) => (
                <tr
                  key={org.id}
                  className={`transition hover:bg-slate-50/70 ${
                    org.isTrashed
                      ? "bg-amber-50/40"
                      : !org.isActive || org.commercialAccess === "blocked"
                        ? "bg-slate-50 opacity-60 grayscale"
                        : ""
                  }`}
                >
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{org.name}</span>
                      <span className="mt-0.5 text-xs font-medium text-slate-500">
                        {org.city || "Ciudad no especificada"}
                      </span>
                      <span className="mt-1 text-[11px] font-medium text-slate-400">{org.slug}</span>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getLifecycleTone(org)}`}
                    >
                      {getLifecycleLabel(org)}
                    </span>
                    {org.isTrashed && org.deletedAt ? (
                      <p className="mt-1 text-[11px] text-slate-500">{formatRelativeTime(org.deletedAt)}</p>
                    ) : null}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <HealthBadge status={org.health} />
                  </td>

                  <td className="px-5 py-4 align-top">
                    <WhatsAppStatus channel={org.whatsappChannel} />
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col gap-1">
                      <span
                        className={
                          org.recentLeadCount > 0
                            ? "font-bold text-slate-900"
                            : "font-medium text-slate-400"
                        }
                      >
                        {org.recentLeadCount} leads
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          org.recentFailedDeliveries > 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {org.recentFailedDeliveries} errores
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top text-xs font-medium text-slate-600">
                    {org.lastActivityAt ? formatRelativeTime(org.lastActivityAt) : "-"}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col">
                      <span
                        className={`mb-1 text-xs font-bold leading-none ${
                          org.onboardingStatus === "Operativa"
                            ? "text-emerald-700"
                            : org.onboardingStatus === "Sin usuarios"
                              ? "text-slate-400"
                              : "text-amber-600"
                        }`}
                      >
                        {org.onboardingStatus}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {org.memberCount} usuarios
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex min-w-[180px] flex-col gap-1">
                      <span
                        className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          org.commercialAccess === "allowed"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {org.commercialStatusLabel}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {org.planId ? `Plan ${org.planId}` : "Sin plan asignado"}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {org.billingModeLabel ?? "Sin modo"} - {formatCommercialDate(org.currentPeriodEnd)}
                      </span>
                      {org.internalBillingNotes ? (
                        <span className="line-clamp-2 text-[11px] text-slate-400">
                          {org.internalBillingNotes}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col items-end gap-1.5">
                      {!org.isTrashed ? (
                        <>
                          <OnboardingControls
                            orgSlug={org.slug}
                            orgName={org.name}
                            hasUsers={org.memberCount > 0}
                            isActive={org.isActive}
                            maxAiAgents={org.maxAiAgents}
                            aiAgentCount={org.aiAgentCount}
                            agentQuotaNote={org.agentQuotaNote}
                          />
                          <CommercialControls
                            organizationId={org.id}
                            orgName={org.name}
                            planOptions={plans}
                            currentPlanId={org.planId}
                            currentStatus={org.commercialStatus}
                            currentBillingMode={org.billingMode}
                            currentPeriodEnd={org.currentPeriodEnd}
                            internalBillingNotes={org.internalBillingNotes}
                          />
                        </>
                      ) : null}

                      <TrashOrganizationButton
                        orgSlug={org.slug}
                        orgName={org.name}
                        isTrashed={org.isTrashed}
                        isPlatformOrg={platformOrgId === org.id}
                      />

                      <DeleteOrganizationButton
                        orgSlug={org.slug}
                        orgName={org.name}
                        isTrashed={org.isTrashed}
                        isPlatformOrg={platformOrgId === org.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    {search || healthFilter !== "all" || visibilityFilter !== "active" ? (
                      <>
                        <p className="text-base font-semibold text-slate-900">Sin resultados</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Proba con otro nombre o limpia los filtros.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-base font-semibold text-slate-900">
                          Sin inmobiliarias cargadas
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Todavía no hay organizaciones para administrar.
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
