import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { getPublicPropertyDetail } from "@/modules/properties/service";
import { formatCurrency } from "@/lib/utils";

export default async function PublicPropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const property = await getPublicPropertyDetail(propertyId);

  if (!property || !property.publicVisible) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
      <section className="rounded-[2rem] border bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge label={property.status} tone="success" />
              <StatusBadge label="Public listing" tone="info" />
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {property.title}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {[property.address, property.neighborhood, property.city].filter(Boolean).join(", ") || "Location details pending"}
            </p>
          </div>

          <Link
            href={`/${property.organizationSlug}/properties/${property.id}`}
            className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Open internal flow
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Price" value={property.priceCents != null ? formatCurrency(property.priceCents, property.currency ?? "USD") : "Price on request"} hint="Current public asking price." />
        <MetricCard label="Type" value={property.propertyType || "Property"} hint="Property classification." />
        <MetricCard label="Layout" value={`${property.bedrooms ?? 0} / ${property.bathrooms ?? 0}`} hint="Bedrooms and bathrooms." />
        <MetricCard label="Surface" value={`${property.surfaceM2 ?? 0} m2`} hint="Useful for quick qualification." />
      </section>

      <SectionCard
        eyebrow="Flow"
        title="Next internal steps"
        description="This page bridges the public inventory entry point with the internal commercial workflow."
      >
        <div className="space-y-4 text-sm leading-7 text-slate-600">
          <p>Open the internal property workspace to review active leads already linked to this listing.</p>
          <p>From the property page, move into the relevant lead and continue to visit scheduling.</p>
        </div>
      </SectionCard>
    </main>
  );
}
