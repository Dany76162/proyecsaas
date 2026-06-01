export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  Building2, 
  Compass, 
  Phone, 
  Mail,
  MapPin, 
  ChevronRight,
  Sparkles,
  BedDouble,
  Bath,
  Maximize2,
  Car
} from "lucide-react";

import { prisma } from "@/server/db/prisma";
import { listPublicPropertiesByOrgSlug } from "@/modules/properties/service";
import { formatCurrency } from "@/lib/utils";

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
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ op?: string; tour?: string }>;
}) {
  const { orgSlug } = await params;
  const { op, tour } = await searchParams;

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

  // Filtrar en memoria para mayor robustez y performance
  let filteredProperties = properties;

  if (op) {
    filteredProperties = filteredProperties.filter((p) => {
      const opLower = op.toLowerCase();
      const pOp = p.operationType?.toLowerCase() ?? "";
      if (opLower === "venta") {
        return pOp === "sale" || pOp === "venta";
      }
      if (opLower === "alquiler") {
        return pOp === "rent" || pOp === "alquiler";
      }
      if (opLower === "temporario") {
        return pOp === "temporary" || pOp === "temporario" || pOp === "temp";
      }
      return pOp === opLower;
    });
  }

  if (tour === "1") {
    filteredProperties = filteredProperties.filter(
      (p) => p.panoramas && p.panoramas.length > 0
    );
  }

  const filterLink = (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return `/cat/${orgSlug}${q ? `?${q}` : ""}`;
  };

  const chip = (active: boolean) => {
    return active
      ? "rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200"
      : "rounded-full bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all duration-200";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* --- Premium Navy Header Panel --- */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0b132b] via-[#1c2541] to-[#1e3a8a] px-6 py-12 text-white sm:px-12 md:py-16 shadow-md border-b border-blue-900/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300 backdrop-blur-sm flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-blue-400 animate-pulse" />
                  Catálogo Exclusivo
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-350">
                  {properties.length} disponibles
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
                {organization.name}
              </h1>
              <p className="max-w-2xl text-sm md:text-base leading-relaxed text-slate-300 font-medium">
                {organization.description || "Explorá nuestro catálogo exclusivo de inmuebles seleccionados y equipados con tours virtuales interactivos."}
              </p>
              {organization.city && (
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" />
                  {organization.city}
                </div>
              )}
            </div>

            {/* Inmobiliaria Contact Info */}
            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm space-y-3 w-full max-w-xs md:max-w-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">Contacto Directo</p>
              <div className="space-y-2.5 text-sm">
                {organization.contactWhatsapp && (
                  <a 
                    href={`https://wa.me/${organization.contactWhatsapp.replace(/\D/g, "")}?text=Hola!%20Vi%20su%20cat%C3%A1logo%20p%C3%BAblico%20y%20quisiera%20consultar.`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-slate-200 hover:text-white font-semibold transition"
                  >
                    <svg className="h-4.5 w-4.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                )}
                {organization.contactPhone && (
                  <div className="flex items-center gap-2.5 text-slate-350 font-medium">
                    <Phone className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    {organization.contactPhone}
                  </div>
                )}
                {organization.contactEmail && (
                  <a 
                    href={`mailto:${organization.contactEmail}`}
                    className="flex items-center gap-2.5 text-slate-350 hover:text-white font-medium truncate transition"
                  >
                    <Mail className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    {organization.contactEmail}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- Dynamic Filter Bar --- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={filterLink({})} className={chip(!op && !tour)}>Todas</Link>
            <Link href={filterLink({ op: "Venta" })} className={chip(op === "Venta" && !tour)}>Venta</Link>
            <Link href={filterLink({ op: "Alquiler" })} className={chip(op === "Alquiler" && !tour)}>Alquiler</Link>
            <Link href={filterLink({ op: "Temporario" })} className={chip(op === "Temporario" && !tour)}>Temporario</Link>
            <Link href={filterLink({ tour: "1" })} className={`${chip(tour === "1")} flex items-center gap-1.5`}>
              <Compass className={`h-3.5 w-3.5 text-blue-600 ${tour === "1" ? "animate-spin-slow" : ""}`} />
              Con Tour 360°
            </Link>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            {filteredProperties.length} {filteredProperties.length === 1 ? "propiedad" : "propiedades"}
          </span>
        </div>
      </div>

      {/* --- Main Catalogue Section --- */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        {filteredProperties.length === 0 ? (
          
          /* Premium Empty State */
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center max-w-lg mx-auto space-y-6 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 shadow-sm mx-auto border border-slate-100">
              <Building2 className="h-8 w-8 text-slate-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Bandeja de propiedades vacía</h3>
              <p className="text-sm font-medium leading-relaxed text-slate-500">
                No se encontraron propiedades disponibles con los filtros aplicados. Volvé a ingresar más tarde o reiniciá los filtros.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2 sm:flex-row justify-center">
              <Link
                href={`/cat/${orgSlug}`}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800"
              >
                Limpiar filtros
              </Link>
              {organization.contactWhatsapp && (
                <a
                  href={`https://wa.me/${organization.contactWhatsapp.replace(/\D/g, "")}?text=Hola,%20estaba%20viendo%20su%20cat%C3%A1logo%20de%20propiedades%20y%20quer%C3%ADa%20consultar%20si%20tienen%20nuevos%20ingresos.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                >
                  Consultar por WhatsApp
                </a>
              )}
            </div>
          </div>
        ) : (
          
          /* Properties Grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property) => {
              const location = [property.neighborhood, property.city].filter(Boolean).join(", ") || "Ubicación a confirmar";
              
              const price = property.priceCents != null 
                ? formatCurrency(property.priceCents, property.currency ?? "USD") 
                : "A consultar";

              // Determinar imagen principal
              const mainImage = property.images && property.images.length > 0
                ? (property.images.find(img => img.isPrimary)?.url ?? property.images[0].url)
                : null;

              const hasTour360 = property.panoramas && property.panoramas.length > 0;

              // Operation type formatting
              const opText = property.operationType === "SALE" || property.operationType === "Venta"
                ? "Venta"
                : property.operationType === "RENT" || property.operationType === "Alquiler"
                  ? "Alquiler"
                  : property.operationType === "TEMPORARY" || property.operationType === "Temporario"
                    ? "Temporario"
                    : property.operationType === "EMPRENDIMIENTO" || property.operationType === "Emprendimiento"
                      ? "Emprendimiento"
                      : property.operationType || "Disponible";

              return (
                <article 
                  key={property.id} 
                  className="group overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white transition-all duration-350 hover:shadow-lg hover:border-slate-300/85 flex flex-col h-full hover:-translate-y-1"
                >
                  {/* Image wrapper */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden shrink-0">
                    {mainImage ? (
                      <img 
                        src={mainImage} 
                        alt={property.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-103"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl bg-slate-100 text-slate-300">
                        🏘️
                      </div>
                    )}

                    {/* Operation tag */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="rounded-full bg-slate-900/90 backdrop-blur px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white shadow-sm">
                        {opText}
                      </span>
                    </div>

                    {/* Tour 360 Badge */}
                    {hasTour360 && (
                      <div className="absolute bottom-4 right-4 z-10">
                        <span className="rounded-full bg-blue-600/95 backdrop-blur px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white flex items-center gap-1 shadow-md animate-pulse">
                          <Compass className="h-3 w-3 animate-spin-slow text-blue-100" />
                          Tour 360°
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="space-y-2 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                        {property.propertyType || "Propiedad"}
                      </p>
                      <h3 className="text-base font-bold text-slate-900 line-clamp-1 leading-tight group-hover:text-blue-700 transition-colors">
                        {property.title}
                      </h3>
                      <p className="flex items-center gap-1 text-xs text-slate-400 line-clamp-1 font-medium">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {location}
                      </p>

                      {/* Specs */}
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100/70 mt-3 text-slate-500">
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                          <span>{property.bedrooms ? `${property.bedrooms} dorm.` : "—"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          <Bath className="h-3.5 w-3.5 text-slate-400" />
                          <span>{property.bathrooms ? `${property.bathrooms} bañ.` : "—"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{(property.totalSurfaceM2 || property.surfaceM2 || property.coveredSurfaceM2) ? `${property.totalSurfaceM2 || property.surfaceM2 || property.coveredSurfaceM2} m²` : "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 mt-5 pt-4 space-y-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Precio</p>
                        <p className="text-lg font-extrabold text-slate-900 tabular-nums">
                          {price}
                        </p>
                      </div>
                      {property.expensesCents ? (
                        <p className="text-[10px] font-semibold text-slate-400 text-right">
                          + expensas {formatCurrency(property.expensesCents, property.currency ?? "USD")}
                        </p>
                      ) : null}

                      <div className="grid gap-2 grid-cols-2">
                        {/* CTA: Ver Ficha (Apunta a /cat/[orgSlug]/[propertyId]) */}
                        <Link
                          href={`/cat/${orgSlug}/${property.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-slate-800 hover:shadow-sm"
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
                            <svg className="mr-1 h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Consultar
                          </a>
                        ) : (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            —
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
          animation: spin-slow 12s linear infinite;
        }
      `}} />
    </div>
  );
}

