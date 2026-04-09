import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { MetricCard } from "@/components/workspace/metric-card";
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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          href="/map"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>
      </div>

      {/* Image gallery */}
      {property.images.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Primary image — large */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={property.images[0].url}
            alt={property.images[0].altText ?? property.title}
            className="h-64 w-full object-cover sm:h-80 lg:h-96"
          />
          {/* Thumbnails row */}
          {property.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {property.images.slice(1).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.altText ?? ""}
                  className="h-20 w-28 shrink-0 rounded-xl object-cover"
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Property header */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={property.status} tone="success" />
          <StatusBadge label="Publicado" tone="info" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {property.title}
        </h1>
        {(property.address || property.neighborhood || property.city) && (
          <p className="mt-2 text-base text-slate-600">
            {[property.address, property.neighborhood, property.city].filter(Boolean).join(", ")}
          </p>
        )}
      </section>

      {/* Metrics */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Precio"
          value={
            property.priceCents != null
              ? formatCurrency(property.priceCents, property.currency ?? "USD")
              : "A consultar"
          }
          hint="Precio de publicación."
        />
        <MetricCard
          label="Tipo"
          value={property.propertyType || "Propiedad"}
          hint="Clasificación del inmueble."
        />
        <MetricCard
          label="Habitaciones"
          value={`${property.bedrooms ?? 0} / ${property.bathrooms ?? 0}`}
          hint="Dormitorios y baños."
        />
        <MetricCard
          label="Superficie"
          value={`${property.surfaceM2 ?? 0} m²`}
          hint="Superficie útil total."
        />
      </section>

      {/* Contact CTA */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-700">
          ¿Te interesa esta propiedad?
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Contacta a la inmobiliaria para obtener más información y coordinar una visita.
        </p>
        <Link
          href="/map"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Ver más propiedades
        </Link>
      </section>
    </main>
  );
}
