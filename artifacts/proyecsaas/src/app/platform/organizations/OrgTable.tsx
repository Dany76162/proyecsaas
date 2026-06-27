"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { OrgPlatformSummary, PlatformPlanOption } from "@/modules/platform/types";
import { ONBOARDING_TONE_TEXT_CLASS, isOnboardingActivated } from "@/modules/platform/org-lifecycle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HealthBadge, WhatsAppStatus, formatRelativeTime } from "@/components/platform/platform-ui";
import { CreateOrgDialog } from "@/components/platform/create-org-dialog";
import { OnboardingControls } from "@/components/platform/onboarding-controls";
import { CommercialControls } from "@/components/platform/commercial-controls";
import { TrashOrganizationButton } from "@/components/platform/TrashOrganizationButton";
import { DeleteOrganizationButton } from "@/components/platform/DeleteOrganizationButton";


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

function translatePlanLabel(label: string | null) {
  if (!label) return "Sin plan asignado";
  if (label.toLowerCase() === "starter") return "Plan Inicial";
  return label;
}

function translateBillingMode(mode: string | null) {
  if (!mode || mode.toLowerCase() === "sin modo" || mode.toLowerCase() === "sin modalidad") return "Sin modalidad";
  if (mode.toLowerCase() === "manual") return "Gestión manual";
  if (mode.toLowerCase() === "online") return "Online";
  if (mode.toLowerCase() === "cash" || mode.toLowerCase() === "efectivo") return "Efectivo";
  if (mode.toLowerCase() === "transfer" || mode.toLowerCase() === "transferencia") return "Transferencia";
  if (mode.toLowerCase() === "courtesy" || mode.toLowerCase() === "cortesía") return "Cortesía";
  return mode;
}

function translateCommercialStatus(label: string | null) {
  if (!label) return "";
  const upper = label.toUpperCase();
  if (upper === "ACTIVE") return "Activo";
  if (upper === "TRIALING") return "Prueba";
  if (upper === "PAST_DUE") return "Pago pendiente";
  if (upper === "CANCELLED") return "Cancelada";
  if (upper === "EXPIRED") return "Vencida";
  if (upper === "SUSPENDED") return "Suspendida";
  // El summary de estados sin suscripción/desactivación llega como frase larga:
  // lo acortamos para que el badge no quede gigante (solo display, no cambia lógica).
  if (upper.includes("LEGAD") || upper.includes("LEGACY")) return "Acceso legado";
  if (upper.includes("DESACTIVAD")) return "Suspendida";
  return label;
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
              <Input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, slug o ciudad..."
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters || healthFilter !== "all" || visibilityFilter !== "active" ? "secondary" : "outline"}
              onClick={() => setShowFilters((current) => !current)}
              className={cn(
                showFilters || healthFilter !== "all" || visibilityFilter !== "active"
                  ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                  : ""
              )}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
          </div>

          <div className="w-full sm:w-auto">
            <CreateOrgDialog />
          </div>
        </div>

        {showFilters ? (
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Vista:
              </span>
              {VISIBILITY_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={visibilityFilter === filter.value ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setVisibilityFilter(filter.value)}
                  className="h-7 px-3 text-[10px]"
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Salud:
              </span>
              {HEALTH_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={healthFilter === filter.value ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setHealthFilter(filter.value)}
                  className="h-7 px-3 text-[10px]"
                >
                  {filter.label}
                </Button>
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

      <Card variant="elevated" className="overflow-hidden">
        <div className="overflow-x-auto">
        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-5">Organización</TableHead>
              <TableHead className="px-5">Estado</TableHead>
              <TableHead className="px-5">Salud sistémica</TableHead>
              <TableHead className="px-5">Canal WABA</TableHead>
              <TableHead className="px-5">Tráfico 7d</TableHead>
              <TableHead className="px-5 whitespace-nowrap">Última actividad</TableHead>
              <TableHead className="px-5">Estado de Alta</TableHead>
              <TableHead className="px-5">Comercial</TableHead>
              <TableHead className="px-5 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {filtered.map((org) => (
                <TableRow
                  key={org.id}
                  className={cn(
                    "transition hover:bg-slate-50/70",
                    org.isTrashed && "bg-amber-50/40",
                    (!org.isActive || org.commercialAccess === "blocked") && "bg-slate-50 opacity-60 grayscale"
                  )}
                >
                  <TableCell className="px-5 py-4 align-top">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{org.name}</span>
                      <span className="mt-0.5 text-xs font-medium text-slate-500">
                        {org.city || "Ciudad no especificada"}
                      </span>
                      <span className="mt-1 text-[11px] font-medium text-slate-400">{org.slug}</span>
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-4 align-top">
                    <Badge
                      variant={org.isTrashed ? "warning" : org.isActive ? "success" : "neutral"}
                    >
                      {getLifecycleLabel(org)}
                    </Badge>
                    {org.isTrashed && org.deletedAt ? (
                      <p className="mt-1 text-[11px] text-slate-500">{formatRelativeTime(org.deletedAt)}</p>
                    ) : null}
                  </TableCell>

                  <TableCell className="px-5 py-4 align-top">
                    {isOnboardingActivated(org.onboardingStatusKey) ? (
                      <HealthBadge status={org.health} />
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        Pendiente de alta
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="px-5 py-4 align-top">
                    <WhatsAppStatus channel={org.whatsappChannel} />
                  </TableCell>

                  <TableCell className="px-5 py-4 align-top">
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
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          org.recentFailedDeliveries > 0 ? "text-red-600" : "text-emerald-600"
                        )}
                      >
                        {org.recentFailedDeliveries} errores
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-4 align-top text-xs font-medium text-slate-600">
                    {org.lastActivityAt ? formatRelativeTime(org.lastActivityAt) : "-"}
                  </TableCell>

                  <TableCell className="px-5 py-4 align-top">
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "mb-1 text-xs font-bold leading-none",
                          ONBOARDING_TONE_TEXT_CLASS[org.onboardingStatusTone],
                        )}
                      >
                        {org.onboardingStatus}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {org.memberCount} usuarios
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-4 align-top">
                    <div className="flex min-w-[180px] max-w-[240px] flex-col gap-1">
                      <Badge
                        variant={org.commercialAccess === "allowed" ? "success" : "danger"}
                        className="max-w-full items-start whitespace-normal break-words text-left leading-snug"
                      >
                        {translateCommercialStatus(org.commercialStatusLabel)}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-700">
                        {translatePlanLabel(org.planLabel)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {translateBillingMode(org.billingModeLabel)} - {formatCommercialDate(org.currentPeriodEnd)}
                      </span>
                      {org.internalBillingNotes ? (
                        <span className="line-clamp-2 text-[11px] text-slate-400">
                          {org.internalBillingNotes}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-4 align-top">
                    <div className="flex flex-col items-end gap-1.5">
                      <OnboardingControls
                        orgSlug={org.slug}
                        orgName={org.name}
                        ownerEmail={org.ownerEmail}
                        hasUsers={org.memberCount > 0}
                        isActive={org.isActive}
                        maxAiAgents={org.maxAiAgents}
                        aiAgentCount={org.aiAgentCount}
                        agentQuotaNote={org.agentQuotaNote}
                        isTrashed={org.isTrashed}
                        isPlatformOrg={platformOrgId === org.id}
                      />
                      {!org.isTrashed && (
                        <>
                          <CommercialControls
                            organizationId={org.id}
                            orgName={org.name}
                            planOptions={plans}
                            currentPlanId={org.planId}
                            currentPlanLabel={org.planLabel}
                            currentStatus={org.commercialStatus}
                            currentBillingMode={org.billingMode}
                            currentPeriodEnd={org.currentPeriodEnd}
                            internalBillingNotes={org.internalBillingNotes}
                          />
                          <Link
                            href={`/platform/organizations/${org.id}`}
                            className="inline-flex w-full items-center justify-center gap-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition shadow-sm h-8"
                          >
                            Detalle Ficha
                          </Link>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="px-5 py-12 text-center">
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
                  </TableCell>
                </TableRow>
              ) : null}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}
