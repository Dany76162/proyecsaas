export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { PanoramaViewer } from "@/components/properties/panorama-viewer";
import { TourAiChat } from "@/components/properties/tour-ai-chat";
import { MetricCard } from "@/components/workspace/metric-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { formatCurrency } from "@/lib/utils";
import { getPublicPropertyDetail } from "@/modules/properties/service";
import { prisma } from "@/server/db/prisma";

export async function generateMetadata({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const prop = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { title: true, address: true, priceCents: true, currency: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } }
  });
  const price = prop?.priceCents ? `${prop.currency ?? 'USD'} ${(prop.priceCents / 100).toLocaleString('es-AR')}` : '';
  const image = prop?.images[0]?.url;
  return {
    title: prop ? `Tour 360° — ${prop.title}${price ? ` | ${price}` : ''}` : 'Tour virtual',
    description: prop?.address ?? 'Recorrido virtual inmersivo de la propiedad.',
    openGraph: { title: prop?.title, images: image ? [{ url: image }] : [] },
  };
}

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

  const location = [property.address, property.neighborhood, property.city].filter(Boolean).join(", ");
  const price =
    property.priceCents != null ? formatCurrency(property.priceCents, property.currency ?? "USD") : "Consultar";

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      {property.panoramas && property.panoramas.length > 0 ? (
        <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-black">
          <PanoramaViewer
            scenes={property.panoramas.map(p => ({
              url: p.url,
              label: p.roomName ?? p.label ?? 'Escena',
              hotspotPitch: p.hotspotPitch,
              hotspotYaw: p.hotspotYaw
            }))}
            className="h-full"
            immersiveControls
            variant="immersive"
            floorPlanUrl={property.floorPlanUrl}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/75 via-black/35 to-transparent px-5 pb-24 pt-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={property.status} tone="success" />
                  <StatusBadge label="Tour 360" tone="info" />
                  <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-white/75 backdrop-blur">
                    {price}
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-5xl">
                  {property.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 drop-shadow sm:text-base">
                  {location || "Ubicacion pendiente"}
                </p>
              </div>

              <Link
                href={`/${property.organizationSlug}/properties/${property.id}`}
                className="pointer-events-auto inline-flex w-fit rounded-full border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-white/90"
              >
                Abrir gestion interna
              </Link>
            </div>
          </div>
          <TourAiChat propertyId={property.id} />
        </section>
      ) : (
        <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-slate-950">
          {/* Background image fullscreen */}
          {property.images && property.images.length > 0 ? (
            <>
              <img
                src={property.images.find(img => img.isPrimary)?.url ?? property.images[0].url}
                alt={property.title}
                className="absolute inset-0 h-full w-full object-cover opacity-60 filter blur-[2px] scale-105"
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-[#0b0c14] text-8xl text-white/5 select-none">
              🏘️
            </div>
          )}

          {/* Fullscreen center visual for the primary image */}
          {property.images && property.images.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="relative max-h-[70vh] max-w-[90vw] overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/25 backdrop-blur-md">
                <img
                  src={property.images.find(img => img.isPrimary)?.url ?? property.images[0].url}
                  alt={property.title}
                  className="max-h-[70vh] max-w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Content Overlay */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/75 via-black/35 to-transparent px-5 pb-24 pt-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={property.status} tone="success" />
                  <StatusBadge label="Propiedad" tone="info" />
                  <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-white/75 backdrop-blur">
                    {price}
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-5xl">
                  {property.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 drop-shadow sm:text-base">
                  {location || "Ubicacion pendiente"}
                </p>
              </div>

              <Link
                href={`/${property.organizationSlug}/properties/${property.id}`}
                className="pointer-events-auto inline-flex w-fit rounded-full border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-white/90"
              >
                Abrir gestion interna
              </Link>
            </div>
          </div>
          <TourAiChat propertyId={property.id} />
        </section>
      )}

      <section className="mx-auto flex w-full max-w-6xl flex-col px-6 py-8">
        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Precio"
            value={price}
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

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Recorrido inmersivo</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Tour 360 de la propiedad</h2>
            <p className="mt-3 text-sm leading-7 text-white/62">
              Alterna entre recorrido 360, hotspots de navegacion, plano y vista espacial generada desde las escenas
              capturadas. Esta ficha ya queda lista para compartir con compradores.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Ambientes</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(property.panoramas ?? []).map((panorama, index) => (
                <span
                  key={panorama.id}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/75"
                >
                  {panorama.roomName ?? panorama.label ?? `Escena ${index + 1}`}
                </span>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
