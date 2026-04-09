export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

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
        <CatalogSharingActions orgSlug={orgSlug} orgName={organization.name} />
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
          label="Aptas publicacion"
          value={String(summary.publicCount)}
          hint="Listas para alimentar mapas publicos y portales."
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
              className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="border-b border-slate-100 px-5 pb-4 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${orgSlug}/properties/${property.id}`}
                      className="block rounded-xl outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-500/30"
                    >
                      <p className="truncate text-lg font-semibold text-slate-950">
                        {property.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {[property.address, property.neighborhood, property.city]
                          .filter(Boolean)
                          .join(", ") || "Ubicacion pendiente"}
                      </p>
                    </Link>
                  </div>

                  <div className="flex shrink-0 items-start gap-3">
                    <div className="flex flex-col items-end gap-2 pt-0.5">
                      <StatusBadge
                        label={PROPERTY_STATUS_LABELS[property.status] ?? property.status}
                        tone={getPropertyStatusTone(property.status)}
                      />
                      <StatusBadge
                        label={property.publicVisible ? "Publico" : "Interno"}
                        tone={property.publicVisible ? "info" : "neutral"}
                      />
                    </div>

                    <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <DeletePropertyButton
                        orgSlug={orgSlug}
                        propertyId={property.id}
                        propertyTitle={property.title}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href={`/${orgSlug}/properties/${property.id}`}
                className="block p-5 outline-none transition hover:bg-slate-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30"
              >
                <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>{property.propertyType || "Propiedad"}</span>
                  {(property.bedrooms ?? 0) > 0 && <span>{property.bedrooms} dorm.</span>}
                  {(property.bathrooms ?? 0) > 0 && <span>{property.bathrooms} banos</span>}
                  {(property.surfaceM2 ?? 0) > 0 && <span>{property.surfaceM2} m2</span>}
                </div>

                <p className="mt-5 text-2xl font-semibold text-slate-950">
                  {property.priceCents != null
                    ? formatCurrency(property.priceCents, property.currency ?? "USD")
                    : "Precio a consultar"}
                </p>
              </Link>
            </div>
          ))}
        </div>

        {properties.length < summary.total ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm font-medium text-slate-600">
              Mostrando las {properties.length} propiedades mas recientes de {summary.total}. Usa
              los filtros para ver el resto.
            </p>
          </div>
        ) : null}
      </SectionCard>
    </>
  );
}
