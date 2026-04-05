"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { HealthBadge, WhatsAppStatus, formatRelativeTime } from "@/components/platform/platform-ui";
import { OnboardingControls } from "@/components/platform/onboarding-controls";
import { CreateOrgDialog } from "@/components/platform/create-org-dialog";
import type { OrgPlatformSummary } from "@/modules/platform/types";

const HEALTH_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "ok", label: "OK" },
  { value: "warning", label: "Advertencia" },
  { value: "critical", label: "Crítico" },
];

export function OrgTable({ orgs }: { orgs: OrgPlatformSummary[] }) {
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgs.filter((org) => {
      const matchSearch = !q || org.name.toLowerCase().includes(q) || (org.city ?? "").toLowerCase().includes(q);
      const matchHealth = healthFilter === "all" || org.health === healthFilter;
      return matchSearch && matchHealth;
    });
  }, [orgs, search, healthFilter]);

  return (
    <div className="space-y-4">
      {/* Toolbox */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o ciudad..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              showFilters || healthFilter !== "all"
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros{healthFilter !== "all" && " •"}
          </button>
          <CreateOrgDialog />
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Salud:</span>
            {HEALTH_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setHealthFilter(f.value)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                  healthFilter === f.value
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
            {(search || healthFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setHealthFilter("all"); }}
                className="ml-auto text-xs font-semibold text-slate-400 hover:text-slate-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400">
          {filtered.length} de {orgs.length} inmobiliaria{orgs.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Organización</th>
                <th className="px-5 py-3.5">Salud Sistémica</th>
                <th className="px-5 py-3.5">Canal WABA</th>
                <th className="px-5 py-3.5">Tráfico 7d</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Última acción</th>
                <th className="px-5 py-3.5">Onboarding</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((org) => (
                <tr
                  key={org.id}
                  className={`transition hover:bg-slate-50/70 group ${!org.isActive ? "bg-slate-50 opacity-60 grayscale" : ""}`}
                >
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{org.name}</span>
                      <span className="mt-0.5 text-xs font-medium text-slate-500">{org.city || "Ciudad no especificada"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <HealthBadge status={org.health} />
                  </td>
                  <td className="px-5 py-4 align-top">
                    <WhatsAppStatus channel={org.whatsappChannel} />
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col gap-1">
                      <span className={org.recentLeadCount > 0 ? "font-bold text-slate-900" : "font-medium text-slate-400"}>
                        {org.recentLeadCount} leads
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${org.recentFailedDeliveries > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {org.recentFailedDeliveries} errs
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top text-xs font-medium text-slate-600">
                    {org.lastActivityAt ? formatRelativeTime(org.lastActivityAt) : "—"}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold leading-none mb-1 ${
                        org.onboardingStatus === "Operativa" ? "text-emerald-700" :
                        org.onboardingStatus === "Sin usuarios" ? "text-slate-400" : "text-amber-600"
                      }`}>
                        {org.onboardingStatus}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{org.memberCount} users</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center justify-end">
                      <OnboardingControls
                        orgSlug={org.slug}
                        orgName={org.name}
                        hasUsers={org.memberCount > 0}
                        isActive={org.isActive}
                        maxAiAgents={org.maxAiAgents}
                        aiAgentCount={org.aiAgentCount}
                        agentQuotaNote={org.agentQuotaNote}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    {search || healthFilter !== "all" ? (
                      <>
                        <p className="text-base font-semibold text-slate-900">Sin resultados</p>
                        <p className="mt-1 text-sm text-slate-500">Probá con otro nombre o limpiá los filtros.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-base font-semibold text-slate-900">Sin inmobiliarias activas</p>
                        <p className="mt-1 text-sm text-slate-500">No hay organizaciones activas en este momento.</p>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
