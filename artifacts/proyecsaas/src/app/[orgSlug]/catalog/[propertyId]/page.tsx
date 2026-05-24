export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { PanoramaViewer } from "@/components/properties/panorama-viewer";
import { ImageGallery } from "@/components/properties/image-gallery";

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string; propertyId: string }> }) {
  const { propertyId } = await params;
  const prop = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { title: true, description: true, priceCents: true, currency: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } }
  });
  const price = prop?.priceCents ? `${prop.currency ?? 'USD'} ${(prop.priceCents / 100).toLocaleString('es-AR')}` : '';
  const image = prop?.images[0]?.url;
  return {
    title: prop ? `${prop.title}${price ? ` — ${price}` : ''}` : 'Propiedad',
    description: prop?.description ?? '',
    openGraph: { title: prop?.title, description: prop?.description ?? '', images: image ? [{ url: image }] : [] },
  };
}

const WA_SVG = (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function formatPrice(cents: number | null, currency: string | null): string {
  if (!cents) return "Consultar precio";
  const amount = cents / 100;
  const cur = currency ?? "USD";
  if (cur === "USD") return `USD ${amount.toLocaleString("es-AR")}`;
  return `$ ${amount.toLocaleString("es-AR")}`;
}

export default async function PublicPropertyDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertyId: string }>;
}) {
  const { orgSlug, propertyId } = await params;

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      organization: { slug: orgSlug },
      status: "AVAILABLE",
      publicVisible: true,
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
      panoramas: {
        orderBy: { sortOrder: "asc" },
      },
      organization: {
        select: {
          name: true,
          description: true,
          contactWhatsapp: true,
          contactEmail: true,
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  const { organization } = property;
  const primaryImage = property.images.find((img) => img.isPrimary) ?? property.images[0] ?? null;
  const location = [property.address, property.neighborhood, property.city].filter(Boolean).join(", ");
  const price = formatPrice(property.priceCents, property.currency);

  const whatsappBase = organization.contactWhatsapp
    ? `https://wa.me/${organization.contactWhatsapp.replace(/\D/g, "")}`
    : null;

  return (
    <div className="min-h-screen bg-[#07070E] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-7 sm:px-10">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
          Detalle de propiedad
        </p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{organization.name}</h1>
        {organization.description && (
          <p className="mt-1.5 max-w-xl text-sm text-white/40">{organization.description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2.5">
          {whatsappBase && (
            <a
              href={`${whatsappBase}?text=${encodeURIComponent(`Hola! Quisiera realizar una consulta general sobre sus propiedades.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              {WA_SVG}
              Consultar por WhatsApp
            </a>
          )}
          {organization.contactEmail && (
            <a
              href={`mailto:${organization.contactEmail}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10"
            >
              {organization.contactEmail}
            </a>
          )}
        </div>
      </div>

      {/* Hero / Panorama Viewer Block */}
      {property.panoramas.length > 0 ? (
        <div className="relative h-[65vh] min-h-[480px] w-full overflow-hidden border-b border-white/[0.06] bg-black">
          <PanoramaViewer
            scenes={property.panoramas.map((p) => ({
              url: p.url,
              label: p.roomName ?? p.label ?? "Escena",
              hotspotPitch: p.hotspotPitch,
              hotspotYaw: p.hotspotYaw,
            }))}
            className="h-full"
            immersiveControls
            variant="immersive"
          />
        </div>
      ) : (
        <div className="relative h-[45vh] min-h-[320px] w-full overflow-hidden border-b border-white/[0.06] bg-white/[0.01]">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={property.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl text-white/10">🏘️</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07070E] via-transparent to-transparent" />
        </div>
      )}

      {/* Content Container */}
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href={`/${orgSlug}/catalog`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/50 transition-colors hover:text-white"
          >
            ← Ver todas las propiedades
          </Link>
        </div>

        {/* Layout Grid */}
        <div className="grid gap-10 lg:grid-cols-[1.8fr_1fr]">
          {/* Main Info */}
          <div className="space-y-10">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {property.operationType && (
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                      property.operationType === "Venta"
                        ? "border border-blue-500/30 bg-blue-500/10 text-blue-300"
                        : "border border-emerald-500/25 bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {property.operationType}
                  </span>
                )}
                {property.propertyType && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-white/70">
                    {property.propertyType}
                  </span>
                )}
                {property.panoramas.length > 0 && (
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold text-indigo-400">
                    🔄 Tour 360° Disponible
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {property.title}
              </h1>
              {location && <p className="mt-2 text-sm text-white/45">📍 {location}</p>}
            </div>

            {/* Specifications Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Precio</p>
                <p className="mt-1.5 text-lg font-bold text-white">{price}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Superficie</p>
                <p className="mt-1.5 text-lg font-bold text-white">
                  {property.surfaceM2 ? `${property.surfaceM2} m²` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Dormitorios</p>
                <p className="mt-1.5 text-lg font-bold text-white">{property.bedrooms ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Baños</p>
                <p className="mt-1.5 text-lg font-bold text-white">{property.bathrooms ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Barrio</p>
                <p className="mt-1.5 text-lg font-bold text-white truncate" title={property.neighborhood ?? ""}>
                  {property.neighborhood ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Ciudad</p>
                <p className="mt-1.5 text-lg font-bold text-white truncate" title={property.city ?? ""}>
                  {property.city ?? "—"}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
              <h2 className="text-base font-bold text-white">Descripción</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60 whitespace-pre-wrap">
                {property.description || "Sin descripción disponible."}
              </p>
            </div>

            {/* Photo Gallery */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-white">Galería de fotos</h2>
              {property.images.length > 0 ? (
                <ImageGallery images={property.images} />
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center">
                  <p className="text-white/40 text-sm">Sin fotos disponibles</p>
                  <p className="text-white/25 text-xs mt-1">Consultá más información por WhatsApp</p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Sidebar Widget */}
          <div className="space-y-6">
            <div className="sticky top-6 rounded-xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">¿Te interesa esta propiedad?</h3>
                <p className="mt-1 text-xs text-white/45">
                  Contactanos hoy para coordinar una visita o sacarte cualquier duda.
                </p>
              </div>

              <div className="border-t border-white/[0.06] pt-4 space-y-2.5">
                {whatsappBase && (
                  <a
                    href={`${whatsappBase}?text=${encodeURIComponent(`Hola! Quiero más información sobre: ${property.title}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  >
                    {WA_SVG}
                    Consultar por WhatsApp
                  </a>
                )}

                {organization.contactEmail && (
                  <a
                    href={`mailto:${organization.contactEmail}?subject=${encodeURIComponent(`Consulta: ${property.title}`)}&body=${encodeURIComponent(`Hola! Estoy interesado en la propiedad: ${property.title}.`)}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Consultar por Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-12 text-center text-[10px] text-white/15">
        Catálogo generado con RaicesPilot
      </div>
    </div>
  );
}
