export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { PanoramaViewer } from "@/components/properties/panorama-viewer";
import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { formatCurrency } from "@/lib/utils";
import { getPublicPropertyDetail } from "@/modules/properties/service";

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
    <main className="min-h-screen bg-[#05070b] text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col px-6 py-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge label={property.status} tone="success" />
                <StatusBadge label="Tour publico" tone="info" />
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">{property.title}</h1>
              <p className="mt-3 text-base leading-7 text-white/65">
                {[property.address, property.neighborhood, property.city].filter(Boolean).join(", ") ||
                  "Ubicacion pendiente"}
              </p>
            </div>

            <Link
              href={`/${property.organizationSlug}/properties/${property.id}`}
              className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Abrir gestion interna
            </Link>
          </div>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Precio"
            value={property.priceCents != null ? formatCurrency(property.priceCents, property.currency ?? "USD") : "Consultar"}
            hint="Precio publico actual."
          />
          <MetricCard label="Tipo" value={property.propertyType || "Propiedad"} hint="Clasificacion de la propiedad." />
          <MetricCard
            label="Ambientes"
            value={`${property.bedrooms ?? 0} / ${property.bathrooms ?? 0}`}
            hint="Dormitorios y banos."
          />
          <MetricCard label="Superficie" value={`${property.surfaceM2 ?? 0} m2`} hint="Dato rapido de calificacion." />
        </section>

        {property.panoramas && property.panoramas.length > 0 && (
          <section className="mt-8">
            <PanoramaViewer panoramas={property.panoramas} className="h-[min(76vh,760px)]" immersiveControls />
          </section>
        )}

        <SectionCard
          eyebrow="Recorrido"
          title="Tour inmersivo"
          description="Alterna entre recorrido 360 y vista espacial generada desde las escenas capturadas."
        >
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>El modo dollhouse actual usa las escenas 360 como maqueta visual. Cuando carguemos un modelo 3D real, este mismo control va a renderizar la propiedad completa.</p>
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
