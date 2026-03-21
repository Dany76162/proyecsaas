import Link from "next/link";
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
          hint="Ready for assignment, matching, and visit scheduling."
        />
        <MetricCard
          label="Public-ready"
          value={String(summary.publicCount)}
          hint="Visible on the future public map and property discovery routes."
        />
      </section>

      <SectionCard
        eyebrow="Inventory"
        title="Property portfolio"
        description="Every property can now act as the start of a concrete property -> lead -> visit flow."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/${orgSlug}/properties/${property.id}`}
              className="rounded-[1.5rem] border border-slate-200 p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{property.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {property.address}, {property.neighborhood}, {property.city}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge
                    label={property.status}
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
            </Link>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
