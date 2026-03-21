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
          The map UI is still intentionally lightweight, but the route is now grounded in public-ready property data from the same inventory foundation used inside each tenant workspace.
        </p>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="flex min-h-[420px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 text-slate-500">
            Map canvas placeholder
          </div>

          <SectionCard
            eyebrow="Public listings"
            title="Properties ready for discovery"
            description="These records are already separated by `publicVisible`, which keeps internal inventory and public exposure cleanly decoupled."
          >
            <div className="space-y-4">
              {properties.map((property) => (
                <article key={property.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{property.title}</p>
                    <StatusBadge label={property.status} tone="success" />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {property.address}, {property.city}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    {property.bedrooms} bed • {property.bathrooms} bath • {property.surfaceM2} m2
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">
                    {formatCurrency(property.priceCents, property.currency)}
                  </p>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
