export const dynamic = "force-dynamic";
import Link from "next/link";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { listPublicProperties } from "@/modules/properties/service";
import { formatCurrency } from "@/lib/utils";

export default async function PublicMapPage() {
  const properties = await listPublicProperties();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
      <div className="rounded-[2rem] border bg-white/85 p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-950">Public property map foundation</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Public inventory now behaves like a real entry point into the sales flow. Each property card is clickable and leads naturally into the internal property, lead, and visit journey.
        </p>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 md:grid-cols-2">
            {properties.map((property) => (
              <Link
                key={property.id}
                href={`/map/${property.id}`}
                className="rounded-[1.25rem] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{property.title}</p>
                  <StatusBadge label={property.status} tone="success" />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {property.neighborhood}, {property.city}
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  {property.bedrooms} bed / {property.bathrooms} bath / {property.surfaceM2} m2
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {formatCurrency(property.priceCents, property.currency)}
                </p>
              </Link>
            ))}
          </div>

          <SectionCard
            eyebrow="Sales flow"
            title="How this connects"
            description="The current MVP now exposes a navigable property -> lead -> visit path without needing external integrations."
          >
            <div className="space-y-4 text-sm leading-7 text-slate-600">
              <p>1. Public users discover a property from the map inventory.</p>
              <p>2. The team can open the internal property workspace to review linked leads.</p>
              <p>3. Each lead can move through the CRM pipeline until a visit is scheduled.</p>
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
