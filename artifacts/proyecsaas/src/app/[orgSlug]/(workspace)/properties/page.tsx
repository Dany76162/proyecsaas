export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getPropertySummary, listOrganizationProperties } from "@/modules/properties/service";
import { formatCurrency } from "@/lib/utils";
import { CreatePropertyDialog } from "@/components/properties/create-property-dialog";
import { DeletePropertyButton } from "@/components/properties/delete-property-button";

const PROPERTY_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  DRAFT: "Borrador",
  RESERVED: "Reservada",
  SOLD: "Vendida",
};

function getPropertyStatusTone(status: string) {
  if (status === "AVAILABLE") {
    return "success" as const;
  }

  if (status === "DRAFT") {
    return "neutral" as const;
  }

  return "warning" as const;
}

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
        <Link
          href={`/${orgSlug}/catalog`}
          target="_blank"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-soft"
        >
          Ver catálogo público
        </Link>
        <CreatePropertyDialog orgSlug={orgSlug} />
      </WorkspaceHeader>

      <section className="grid gap-6 md:grid-cols-3">
        <MetricCard
          label="Inventario total"
          value={String(summary.total)}
          hint="Total de propiedades cargadas en la inmobiliaria."
        />
        <MetricCard
          label="Disponibles"
          value={String(summary.availableCount)}
          hint="Listas para asignar leads y coordinar visitas."
        />
        <MetricCard
          label="Aptas publicación"
          value={String(summary.publicCount)}
          hint="Listas para alimentar mapas públicos y portales."
        />
      </section>

      <SectionCard
        eyebrow="Inventario"
        title="Propiedades"
        description="Cada propiedad es el inicio del flujo operativo hacia leads y visitas."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {properties.map((property) => (
            <div
              key={property.id}
              className="group relative rounded-[1.5rem] border border-slate-200 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              {/* Delete button — top-right, visible on hover */}
              <div className="absolute right-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                <DeletePropertyButton
                  orgSlug={orgSlug}
                  propertyId={property.id}
                  propertyTitle={property.title}
                />
              </div>

              {/* Card content — navigates to detail */}
              <Link
                href={`/${orgSlug}/properties/${property.id}`}
                className="block p-5"
              >
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-950">{property.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[property.address, property.neighborhood, property.city].filter(Boolean).join(", ") || "Ubicación pendiente"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge
                      label={PROPERTY_STATUS_LABELS[property.status] ?? property.status}
                      tone={getPropertyStatusTone(property.status)}
                    />
                    <StatusBadge
                      label={property.publicVisible ? "Público" : "Interno"}
                      tone={property.publicVisible ? "info" : "neutral"}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>{property.propertyType || "Propiedad"}</span>
                  {(property.bedrooms ?? 0) > 0 && <span>{property.bedrooms} dorm.</span>}
                  {(property.bathrooms ?? 0) > 0 && <span>{property.bathrooms} baños</span>}
                  {(property.surfaceM2 ?? 0) > 0 && <span>{property.surfaceM2} m²</span>}
                </div>

                <p className="mt-5 text-2xl font-semibold text-slate-950">
                  {property.priceCents != null ? formatCurrency(property.priceCents, property.currency ?? "USD") : "Precio a consultar"}
                </p>
              </Link>
            </div>
          ))}
        </div>

        {properties.length < summary.total && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm font-medium text-slate-600">
              Mostrando las {properties.length} propiedades más recientes de {summary.total}. Usa los filtros para ver el resto.
            </p>
          </div>
        )}
      </SectionCard>
    </>
  );
}
