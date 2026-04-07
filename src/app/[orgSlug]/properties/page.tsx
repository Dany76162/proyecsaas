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
import { ShareCatalogButton } from "@/components/workspace/share-catalog-button";

const PROPERTY_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  DRAFT: "Borrador",
  RESERVED: "Reservada",
  SOLD: "Vendida",
  RENTED: "Alquilada",
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
        <ShareCatalogButton orgSlug={orgSlug} />
        <CreatePropertyDialog orgSlug={orgSlug} />
      </WorkspaceHeader>

      <section className="grid gap-4 md:grid-cols-3">
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
            <Link
              key={property.id}
              href={`/${orgSlug}/properties/${property.id}`}
              className="overflow-hidden rounded-[1.5rem] border border-slate-200 transition hover:-translate-y-0.5"
            >
              {property.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={property.thumbnailUrl}
                  alt={property.title}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-slate-100">
                  <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 19.5h18M3.75 4.5h16.5A.75.75 0 0121 5.25v13.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 18.75V5.25A.75.75 0 013.75 4.5z" />
                  </svg>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-lg font-semibold leading-snug text-slate-950">
                    {property.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">
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

              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
                <span>{property.propertyType || "Propiedad"}</span>
                <span>{property.bedrooms ?? 0} dor</span>
                <span>{property.bathrooms ?? 0} ba</span>
                <span>{property.surfaceM2 ?? 0} m²</span>
              </div>

              <p className="mt-4 text-xl font-semibold text-slate-950">
                {property.priceCents != null ? formatCurrency(property.priceCents, property.currency ?? "USD") : "Precio a consultar"}
              </p>
              </div>
            </Link>
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
