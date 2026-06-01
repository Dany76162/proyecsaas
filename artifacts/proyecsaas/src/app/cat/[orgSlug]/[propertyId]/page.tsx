export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  Compass,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  Sparkles,
  BedDouble,
  Bath,
  Maximize2,
  Car,
  Home,
  FileText,
  Video,
} from "lucide-react";

import { prisma } from "@/server/db/prisma";
import { getPropertyDetail } from "@/modules/properties/service";
import { formatCurrency } from "@/lib/utils";
import { UnifiedMediaViewer } from "@/components/properties/unified-media-viewer";
import { PublicLeadForm } from "./public-lead-form";
import { PropertyLocationMap } from "@/components/properties/property-location-map";

function getVideoEmbedUrl(url: string): { type: "youtube" | "vimeo" | "direct"; src: string } {
  if (/youtu\.be\/|youtube\.com/.test(url)) {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    const id = match?.[1] ?? "";
    return { type: "youtube", src: `https://www.youtube.com/embed/${id}` };
  }
  if (/vimeo\.com/.test(url)) {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    const id = match?.[1] ?? "";
    return { type: "vimeo", src: `https://player.vimeo.com/video/${id}` };
  }
  return { type: "direct", src: url };
}

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string; propertyId: string }> }) {
  const { orgSlug, propertyId } = await params;
  
  try {
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organization: { slug: orgSlug },
        status: "AVAILABLE",
        publicVisible: true,
      },
      select: {
        title: true,
        description: true,
        priceCents: true,
        currency: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true }
        }
      }
    });

    if (!property) {
      return {
        title: "Propiedad — Catálogo",
      };
    }

    const price = property.priceCents 
      ? formatCurrency(property.priceCents, property.currency ?? "USD") 
      : "A consultar";
    const image = property.images[0]?.url;

    return {
      title: `${property.title} — ${price}`,
      description: property.description ?? "Detalles de la propiedad disponible.",
      openGraph: {
        title: property.title,
        description: property.description ?? "",
        images: image ? [{ url: image }] : [],
      },
    };
  } catch (error) {
    console.error("[generateMetadata] Failed to fetch property metadata safely:", error);
    return {
      title: "Propiedad — Catálogo",
      description: "Detalles de la propiedad disponible.",
    };
  }
}

export default async function PublicPropertyDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertyId: string }>;
}) {
  const { orgSlug, propertyId } = await params;

  // Obtener detalle de propiedad por service oficial (select explicit legacy-safe)
  const property = await getPropertyDetail(orgSlug, propertyId);

  // Validaciones rigurosas de seguridad y multi-tenant
  if (!property || !property.publicVisible || property.status !== "AVAILABLE" || property.organizationSlug !== orgSlug) {
    notFound();
  }

  // Obtener info de la organización
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      name: true,
      contactWhatsapp: true,
      contactPhone: true,
      contactEmail: true,
    }
  });

  if (!org) {
    notFound();
  }

  const location = [property.address, property.neighborhood, property.city].filter(Boolean).join(", ") || "Ubicación a confirmar";
  
  const price = property.priceCents != null 
    ? formatCurrency(property.priceCents, property.currency ?? "USD") 
    : "A consultar";

  // FASE 3.1: Clasificar imágenes para el Visor Multimedia Unificado
  const realImages = property.images.filter((img) => img.category === "REAL");
  const renderImages = property.images.filter((img) => img.category === "RENDER");
  const flatImages = property.images.filter((img) => img.category !== "PANORAMA");
  const primaryImage = flatImages.find((img) => img.isPrimary) ?? flatImages[0] ?? null;

  const hasTour360 = property.panoramas && property.panoramas.length > 0;

  // Mensaje personalizado para WhatsApp
  const shareMsg = `Hola! Estoy interesado en la propiedad "${property.title}" que vi en su catálogo público. ¿Podrían darme más información? Link: https://raicespilot.com/cat/${orgSlug}/${property.id}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* --- Premium Navy Header Panel --- */}
      <header className="bg-gradient-to-br from-[#090d1a] via-[#0f172a] to-[#1e293b] px-6 py-6 text-white sm:px-12 shadow-md border-b border-slate-800">
        <div className="mx-auto max-w-[2000px] w-full px-4 sm:px-8 lg:px-16 2xl:px-24 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
              Inmobiliaria Responsable
            </p>
            <h2 className="text-xl font-extrabold text-white">
              {org.name}
            </h2>
          </div>
          <div>
            <Link
              href={`/cat/${orgSlug}`}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 px-4 text-xs font-bold text-white transition-all gap-1.5 border border-white/5 active:scale-95 duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver al catálogo
            </Link>
          </div>
        </div>
      </header>

      {/* --- FASE 3.1: Hero/Banner con imagen plana (NO TOUR 360 NI PANORAMAS) --- */}
      <div className="w-full bg-slate-950 border-b border-slate-200">
        <div className="relative h-[60vh] min-h-[400px] max-h-[700px] w-full overflow-hidden flex items-center justify-center">
          {primaryImage ? (
            <img 
              src={primaryImage.url} 
              alt={property.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-7xl text-slate-750">🏢</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
        </div>
      </div>

      {/* --- Details Content Area (Widescreen Balanced Layout) --- */}
      <main className="mx-auto max-w-[2000px] w-full px-4 sm:px-8 lg:px-16 2xl:px-24 py-12 space-y-12">
        
        {/* Main Grid: Info + Specs + Contact Sidebar */}
        <div className="grid gap-8 lg:grid-cols-[2.4fr_1fr]">
          
          {/* Main Content Column */}
          <div className="space-y-8">
            <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-white shadow-sm">
                  {property.operationType === "SALE" || property.operationType === "Venta"
                    ? "Venta"
                    : property.operationType === "RENT" || property.operationType === "Alquiler"
                      ? "Alquiler"
                      : property.operationType === "TEMPORARY" || property.operationType === "Temporario"
                        ? "Temporario"
                        : property.operationType === "EMPRENDIMIENTO" || property.operationType === "Emprendimiento"
                          ? "Emprendimiento"
                          : property.operationType || "Propiedad"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[9px] font-extrabold tracking-widest text-slate-550 uppercase">
                  {property.propertyType || "Propiedad"}
                </span>
              </div>

              <div className="space-y-2.5">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {property.title}
                </h1>
                <p className="flex items-center gap-1.5 text-sm text-slate-400 font-semibold leading-relaxed">
                  <MapPin className="h-4.5 w-4.5 shrink-0 text-slate-455" />
                  {location}
                </p>
              </div>

              {/* Price Banner */}
              <div className="border-t border-b border-slate-100 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valor de publicación</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums mt-0.5">
                    {price}
                  </p>
                </div>
                {property.expensesCents ? (
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Expensas</p>
                    <p className="text-lg font-bold text-slate-600 tracking-tight mt-0.5">
                      {formatCurrency(property.expensesCents, property.currency ?? "USD")}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Primary Characteristics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
                  <BedDouble className="h-5 w-5 text-blue-600 mx-auto" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Dormitorios</p>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{property.bedrooms ?? "—"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
                  <Bath className="h-5 w-5 text-blue-600 mx-auto" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Baños</p>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{property.bathrooms ?? "—"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
                  <Maximize2 className="h-5 w-5 text-blue-600 mx-auto" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Superficie</p>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{property.surfaceM2 ? `${property.surfaceM2} m²` : "—"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
                  <Car className="h-5 w-5 text-blue-600 mx-auto" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Cocheras</p>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{property.parkingSpots ?? "—"}</p>
                </div>
              </div>
            </div>

            {/* Description Block */}
            <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />
                Descripción de la propiedad
              </h3>
              <p className="text-sm font-medium leading-relaxed text-slate-600 whitespace-pre-wrap">
                {property.description || "Esta propiedad no cuenta con una descripción detallada cargada aún. Por favor contactá a la inmobiliaria responsable para recibir más información comercial."}
              </p>
            </div>

            </div>

          {/* Sticky Consultation Sidebar */}
          <div className="space-y-6">
            <div className="sticky top-6 bg-white rounded-[2.2rem] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">¿Te interesa esta propiedad?</h3>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed mt-1">
                  Contactanos hoy mismo completando el formulario de contacto o directamente por WhatsApp.
                </p>
              </div>

              {org.contactWhatsapp && (
                <a
                  href={`https://wa.me/${org.contactWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(shareMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-sm font-bold tracking-wider uppercase text-white shadow-md active:scale-95 transition-all duration-200"
                >
                  <svg className="h-5 w-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Consultar por WhatsApp
                </a>
              )}

              <div id="contact" className="border-t border-slate-100 pt-5">
                <PublicLeadForm orgSlug={orgSlug} propertyId={propertyId} />
              </div>

              {org.contactEmail || org.contactPhone ? (
                <div className="border-t border-slate-100 pt-4.5 flex flex-col gap-2.5">
                  {org.contactPhone && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 justify-center">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      Llamar: {org.contactPhone}
                    </div>
                  )}
                  {org.contactEmail && (
                    <a
                      href={`mailto:${org.contactEmail}?subject=${encodeURIComponent(`Consulta: ${property.title}`)}`}
                      className="flex items-center gap-2 text-xs font-bold text-slate-500 justify-center hover:text-slate-800 transition duration-200"
                    >
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      {org.contactEmail}
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          </div>

        </div>

        {/* --- Widescreen Immersive Sections (Outside 2-Column Grid to Maximize Screen Space) --- */}
        <div className="space-y-12">

          {/* Unified Interactive Media Hub */}
          {(hasTour360 || realImages.length > 0 || renderImages.length > 0 || !!property.floorPlanUrl) && (
            <UnifiedMediaViewer
              panoramas={property.panoramas.map((p) => ({
                url: p.url,
                label: p.roomName ?? p.label ?? "Espacio",
                hotspotPitch: p.hotspotPitch,
                hotspotYaw: p.hotspotYaw,
              }))}
              realImages={realImages}
              renderImages={renderImages}
              floorPlanUrl={property.floorPlanUrl}
            />
          )}

          {/* FASE 3.5: Video Block --- CINEMATIC WIDE */}
          {property.videoUrl && (() => {
            const video = getVideoEmbedUrl(property.videoUrl);
            return (
              <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 sm:p-10 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-5">
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Video className="h-6 w-6 text-slate-550" />
                    Presentación y Recorrido en Video
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Disfrutá de un paseo guiado en video por las principales comodidades.
                  </p>
                </div>
                {video.type === "youtube" || video.type === "vimeo" ? (
                  <div className="aspect-video w-full max-w-[1400px] mx-auto rounded-2xl overflow-hidden border border-slate-100 shadow-lg">
                    <iframe
                      src={video.src}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <video
                    src={video.src}
                    controls
                    className="w-full max-w-[1400px] mx-auto rounded-2xl border border-slate-100 shadow-lg"
                  />
                )}
              </div>
            );
          })()}

          {/* Location Map Block --- WIDESCREEN WIDE */}
          <PropertyLocationMap 
            property={{
              id: property.id,
              title: property.title,
              latitude: property.latitude,
              longitude: property.longitude,
              approximate: !property.showExactLocation,
              locationLabel: location
            }} 
          />

        </div>
      </main>

      <footer className="py-12 border-t border-slate-200 text-center text-[11px] text-slate-400 bg-white">
        Catálogo exclusivo generado con <span className="font-bold text-slate-650">Raíces Pilot</span>
      </footer>

      {/* Style for compass rotate */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
      `}} />
    </div>
  );
}
