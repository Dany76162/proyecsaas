export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  Building2, 
  Compass, 
  Phone, 
  Globe, 
  MessageSquare, 
  Camera, 
  Home, 
  MapPin, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from "lucide-react";

import { prisma } from "@/server/db/prisma";
import { listPublicPropertiesByOrgSlug } from "@/modules/properties/service";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/workspace/status-badge";

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { name: true, city: true, description: true }
  });

  return {
    title: org ? `Catálogo de Propiedades — ${org.name}` : "Catálogo Inmobiliario",
    description: org?.description ?? `Explorá las propiedades disponibles de ${org?.name ?? "nuestra inmobiliaria"}.`,
  };
}

export default async function PublicOrganizationCatalogPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  // Obtener la organización con todos los datos necesarios
  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      description: true,
      contactWhatsapp: true,
      contactPhone: true,
      contactEmail: true,
      deletedAt: true,
      isActive: true,
    }
  });

  if (!organization || !organization.isActive || organization.deletedAt) {
    notFound();
  }

  // Listar propiedades con filtros publicVisible=true y status=AVAILABLE
  const properties = await listPublicPropertiesByOrgSlug(orgSlug);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-brand-100 selection:text-brand-900">
      
      {/* --- Elegant Header Panel --- */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 px-6 py-12 text-white sm:px-12 md:py-16 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_45%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-300 backdrop-blur-sm flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  Catálogo Exclusivo
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                  {properties.length} disponibles
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
                {organization.name}
              </h1>
              <p className="max-w-2xl text-sm md:text-base leading-relaxed text-slate-350 font-medium">
                {organization.description || "Explorá nuestro catálogo exclusivo de inmuebles seleccionados y equipados con tours virtuales interactivos."}
              </p>
              {organization.city && (
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-brand-400" />
                  {organization.city}
                </div>
              )}
            </div>

            {/* Inmobiliaria Contact Info */}
            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm space-y-3 max-w-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-300">Contacto Directo</p>
              <div className="space-y-2 text-sm">
                {organization.contactWhatsapp && (
                  <a 
                    href={`https://wa.me/${organization.contactWhatsapp.replace(/\D/g, "")}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-slate-200 hover:text-brand-300 font-semibold transition"
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-400" />
                    Enviar WhatsApp
                  </a>
                )}
                {organization.contactPhone && (
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {organization.contactPhone}
                  </div>
                )}
                {organization.contactEmail && (
                  <div className="flex items-center gap-2 text-slate-300 font-medium truncate">
                    <Globe className="h-4 w-4 text-slate-400" />
                    {organization.contactEmail}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Catalogue Section --- */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        {properties.length === 0 ? (
          
          /* Premium Empty State */
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center max-w-lg mx-auto space-y-6 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 shadow-soft mx-auto">
              <Building2 className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Bandeja de propiedades vacía</h3>
              <p className="text-sm font-medium leading-relaxed text-slate-500">
                Esta inmobiliaria aún no dispone de propiedades activas para publicación. Volvé a ingresar más tarde para ver nuevos ingresos.
              </p>
            </div>

            {organization.contactWhatsapp && (
              <div className="pt-2">
                <a
                  href={`https://wa.me/${organization.contactWhatsapp.replace(/\D/g, "")}?text=Hola,%20estaba%20viendo%20su%20cat%C3%A1logo%20de%20propiedades%20y%20quer%C3%ADa%20consultar%20si%20tienen%20nuevos%20ingresos.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800"
                >
                  <MessageSquare className="mr-2 h-4 w-4 text-emerald-400" />
                  Consultar ingresos por WhatsApp
                </a>
              </div>
            )}
          </div>
        ) : (
          
          /* Properties Grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const location = [property.neighborhood, property.city].filter(Boolean).join(", ");
              const price = property.priceCents != null 
                ? formatCurrency(property.priceCents, property.currency ?? "USD") 
                : "A consultar";

              const specs = [
                property.bedrooms && `${property.bedrooms} dorm.`,
                property.bathrooms && `${property.bathrooms} baños`,
                property.surfaceM2 && `${property.surfaceM2} m²`,
              ].filter(Boolean);

              // Determinar imagen principal
              const mainImage = property.images && property.images.length > 0
                ? (property.images.find(img => img.isPrimary)?.url ?? property.images[0].url)
                : null;

              const hasTour360 = property.panoramas && property.panoramas.length > 0;

              return (
                <article 
                  key={property.id} 
                  className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white transition hover:shadow-lg hover:border-slate-300 flex flex-col h-full"
                >
                  {/* Image wrapper */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden shrink-0">
                    {mainImage ? (
                      <img 
                        src={mainImage} 
                        alt={property.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl text-slate-300">
                        🏘️
                      </div>
                    )}

                    {/* Operation tag */}
                    {property.operationType && (
                      <div className="absolute top-4 left-4 z-10">
                        <span className="rounded-full bg-slate-950/80 backdrop-blur px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white">
                          {property.operationType === "SALE" ? "Venta" : property.operationType === "RENT" ? "Alquiler" : "Temporario"}
                        </span>
                      </div>
                    )}

                    {/* Tour 360 Badge */}
                    {hasTour360 && (
                      <div className="absolute bottom-4 right-4 z-10">
                        <span className="rounded-full bg-brand-600/90 backdrop-blur px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white flex items-center gap-1 shadow-md">
                          <Compass className="h-3 w-3 animate-spin-slow" />
                          Tour 360°
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="space-y-1.5 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                        {property.propertyType || "Propiedad"}
                      </p>
                      <h3 className="text-base font-bold text-slate-950 line-clamp-1 leading-tight group-hover:text-brand-600 transition-colors">
                        {property.title}
                      </h3>
                      <p className="flex items-center gap-1 text-xs text-slate-400 line-clamp-1 font-medium">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-350" />
                        {location || "Ubicación pendiente"}
                      </p>

                      {/* Specs */}
                      {specs.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3">
                          {specs.map((spec, i) => (
                            <span 
                              key={i} 
                              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-650"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 mt-5 pt-4 space-y-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Precio</p>
                        <p className="text-xl font-extrabold text-slate-950 tabular-nums">
                          {price}
                        </p>
                      </div>

                      <div className="grid gap-2 grid-cols-2">
                        {/* CTA: Ver Ficha (Apunta por ahora a /map/[propertyId]) */}
                        <Link
                          href={`/map/${property.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-slate-800"
                        >
                          Ver ficha
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Link>

                        {/* CTA: WhatsApp */}
                        {organization.contactWhatsapp ? (
                          <a
                            href={`https://wa.me/${organization.contactWhatsapp.replace(/\D/g, "")}?text=Hola,%20estoy%20interesado%20en%20la%20propiedad%20"${encodeURIComponent(property.title)}"%20que%20vi%20en%20su%20cat%C3%A1logo%20p%C3%BAblico.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                          >
                            <MessageSquare className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                            Consultar
                          </a>
                        ) : (
                          <div className="rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Sin WhatsApp
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      
      {/* Style for compass rotate */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}} />
    </div>
  );
}
