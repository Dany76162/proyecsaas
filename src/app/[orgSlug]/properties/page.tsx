import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getPropertySummary, listOrganizationProperties } from "@/modules/properties/service";
import { formatCurrency } from "@/lib/utils";

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
      <WorkspaceHeader organization={organization} />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Portfolio size"
          value={String(summary.total)}
          hint="Current inventory represented in the tenant workspace."
        />
        <MetricCard
          label="Available"
          value={String(summary.availableCount)}
          hint="Ready for assignment, matching, and future visit scheduling."
        />
        <MetricCard
          label="Public-ready"
          value={String(summary.publicCount)}
          hint="Properties already separated for future public map visibility."
        />
      </section>

      <SectionCard
        eyebrow="Inventory"
        title="Property portfolio"
        description="Clean separation between internal inventory and public exposure."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {properties.map((property) => (
            <article key={property.id} className="rounded-[1.5rem] border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{property.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {property.address}, {property.neighborhood}, {property.city}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge
                    label={property.status.replaceAll("_", " ")}
                    tone={property.status === "AVAILABLE" ? "success" : "warning"}
                  />
                  <StatusBadge
                    label={property.publicVisible ? "Public" : "Internal"}
                    tone={property.publicVisible ? "info" : "neutral"}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                <span>{property.propertyType}</span>
                <span>{property.bedrooms} bed</span>
                <span>{property.bathrooms} bath</span>
                <span>{property.surfaceM2} m2</span>
              </div>

              <p className="mt-5 text-2xl font-semibold text-slate-950">
                {formatCurrency(property.priceCents, property.currency)}
              </p>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
