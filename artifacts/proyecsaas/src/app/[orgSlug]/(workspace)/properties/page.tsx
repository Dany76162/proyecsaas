export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Globe, Lock } from "lucide-react";

import { CatalogSharingActions } from "@/components/properties/catalog-sharing-actions";
import { CreatePropertyDialog } from "@/components/properties/create-property-dialog";
import { DeletePropertyButton } from "@/components/properties/delete-property-button";
import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { formatCurrency } from "@/lib/utils";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getPropertySummary, listOrganizationProperties } from "@/modules/properties/service";
import { cn } from "@/lib/utils";

const PROPERTY_STATUS_CONFIG: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "info" | "danger" }> = {
  AVAILABLE: { label: "Disponible", tone: "success" },
  DRAFT:     { label: "Borrador",   tone: "neutral" },
  RESERVED:  { label: "Reservada",  tone: "warning" },
  SOLD:      { label: "Vendida",    tone: "info" },
};

import { OnboardingFooter } from "@/components/workspace/onboarding-footer";

export default async function PropertiesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, properties, summary] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationProperties(orgSlug),
    getPropertySummary(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization}>
        <CatalogSharingActions orgSlug={orgSlug} orgName={organization.name} />
        <CreatePropertyDialog orgSlug={orgSlug} />
      </WorkspaceHeader>

      {/* ── KPI Strip ── */}
      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard
          label="Inventario total"
          value={String(summary.total)}
          hint="Propiedades cargadas en el sistema."
        />
        <MetricCard
          label="Disponibles"
          value={String(summary.availableCount)}
          hint="Listas para asignar leads y visitas."
          tone="success"
        />
        <MetricCard
          label="Aptas publicación"
          value={String(summary.publicCount)}
          hint="Activas en mapas y portales."
          tone="brand"
        />
      </section>

      {/* ── DataTable Enterprise ── */}
      <SectionCard
        eyebrow="Inventario"
        title="Propiedades"
        description="Cada propiedad es el inicio del flujo operativo hacia leads y visitas."
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            {/* Head */}
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Propiedad
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Tipo
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Características
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Precio
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Estado
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Visibilidad
                </th>
                <th className="w-16 py-3 pr-4" />
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100">
              {properties.map((property) => {
                const statusConfig = PROPERTY_STATUS_CONFIG[property.status] ?? {
                  label: property.status,
                  tone: "neutral" as const,
                };

                const specs = [
                  property.bedrooms && `${property.bedrooms} dorm.`,
                  property.bathrooms && `${property.bathrooms} baños`,
                  property.surfaceM2 && `${property.surfaceM2} m²`,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <tr
                    key={property.id}
                    className="group transition-colors duration-100 hover:bg-slate-50/70"
                  >
                    {/* Title + Location */}
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <Link
                        href={`/${orgSlug}/properties/${property.id}`}
                        className="block text-sm font-semibold text-slate-900 hover:text-brand-600 transition-colors duration-150 leading-tight line-clamp-1"
                      >
                        {property.title}
                      </Link>
                      <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">
                        {[property.neighborhood, property.city].filter(Boolean).join(", ") ||
                          "Ubicación pendiente"}
                      </p>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      {property.propertyType || <span className="text-slate-300">—</span>}
                    </td>

                    {/* Specs */}
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {specs || <span className="text-slate-300">—</span>}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {property.priceCents != null
                        ? formatCurrency(property.priceCents, property.currency ?? "USD")
                        : <span className="text-xs font-normal text-slate-400">A consultar</span>}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3.5">
                      <StatusBadge label={statusConfig.label} tone={statusConfig.tone} />
                    </td>

                    {/* Visibility */}
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          property.publicVisible ? "text-emerald-600" : "text-slate-400",
                        )}
                      >
                        {property.publicVisible ? (
                          <Globe className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                        {property.publicVisible ? "Público" : "Interno"}
                      </span>
                    </td>

                    {/* Actions — hover only */}
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <Link
                          href={`/${orgSlug}/properties/${property.id}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-brand-50 hover:text-brand-600 transition-colors duration-150"
                          title="Abrir propiedad"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                        <div className="flex h-7 items-center justify-center">
                          <DeletePropertyButton
                            orgSlug={orgSlug}
                            propertyId={property.id}
                            propertyTitle={property.title}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {properties.length === 0 && (
            <div className="px-5 py-16 text-center">
              <p className="text-sm font-medium text-slate-400">
                No hay propiedades registradas aún.
              </p>
            </div>
          )}

          {properties.length < summary.total && (
            <div className="border-t border-slate-100 px-5 py-3 text-center">
              <p className="text-xs text-slate-400">
                Mostrando {properties.length} de {summary.total} propiedades.
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      <div className="h-24" />

      <OnboardingFooter
        orgSlug={orgSlug}
        stepKey="properties"
        stepNumber={2}
        title="Cargá tu inventario"
        description="Tenés las propiedades listas. El siguiente paso es conectar tu WhatsApp para que el agente IA pueda responder consultas."
        nextLabel="Continuar al paso 3 → Conectar WhatsApp"
        nextRoute={`/${orgSlug}/settings/integrations/whatsapp`}
      />
    </>
  );
}
