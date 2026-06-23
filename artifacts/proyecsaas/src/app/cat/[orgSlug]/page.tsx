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
  Share2
} from "lucide-react";

import { prisma } from "@/server/db/prisma";
import { listPublicPropertiesByOrgSlug } from "@/modules/properties/service";
import { formatCurrency } from "@/lib/utils";
import { PublicPropertyCard } from "@/components/properties/public-property-card";

function getOptimizedCatalogImageUrl(url: string | null, width = 600, quality = 75): string {
  if (!url) return "";
  if (url.startsWith('/api/storage/view')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&q=${quality}`;
  }
  if (url.startsWith('/uploads/')) {
    return `/api/storage/view?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.r2.dev')) {
      return `/api/storage/view?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
    }
  } catch {}
  return url;
}

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

  // Listar desarrollos públicos y activos
  const rawDevelopments = await prisma.development.findMany({
    where: {
      Organization: { slug: orgSlug },
      status: "ACTIVE",
      publicVisible: true,
    },
    include: {
      DevelopmentLot: {
        select: {
          id: true,
          status: true,
          priceCents: true,
          currency: true,
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  const developments = rawDevelopments.map(dev => ({
    ...dev,
    lots: dev.DevelopmentLot,
  }));

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
      ? "rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-300 transform scale-105"
      : "rounded-full bg-white border border-slate-200 hover:border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-300";
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased selection:bg-blue-150 selection:text-blue-900">
      
      {/* --- Premium Navy Header Panel --- */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#090d1a] via-[#0f172a] to-[#1e293b] px-6 py-16 text-white sm:px-12 md:py-20 shadow-lg border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_60%)]" />
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px' 
          }} 
        />
        
        <div className="relative mx-auto max-w-none w-full px-4 sm:px-8 lg:px-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-400 backdrop-blur-md flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                  Catálogo Exclusivo
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-800/40 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {properties.length} disponibles
                </span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl leading-tight">
                {organization.name}
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-slate-350 font-medium">
                {organization.description || "Explorá nuestro catálogo exclusivo de inmuebles seleccionados y equipados con la última tecnología de tours virtuales interactivos."}
              </p>
              {organization.city && (
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  {organization.city}
                </div>
              )}
            </div>

            {/* Inmobiliaria Contact Info Card */}
            <div className="shrink-0 rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-md space-y-4 w-full max-w-sm shadow-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Contacto Inmobiliaria</p>
              <div className="space-y-3.5 text-sm">
                {organization.contactWhatsapp && (
                  <a 
                    href={`https://wa.me/${organization.contactWhatsapp.replace(/\D/g, "")}?text=Hola!%20Vi%20su%20cat%C3%A1logo%20p%C3%BAblico%20y%20quisiera%20consultar.`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-slate-200 hover:text-white font-bold transition duration-300"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    WhatsApp Corporativo
                  </a>
                )}
                {organization.contactPhone && (
                  <div className="flex items-center gap-3 text-slate-300 font-semibold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    {organization.contactPhone}
                  </div>
                )}
                {organization.contactEmail && (
                  <a 
                    href={`mailto:${organization.contactEmail}`}
                    className="flex items-center gap-3 text-slate-350 hover:text-white font-semibold truncate transition duration-300"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    {organization.contactEmail}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- Sticky Premium Filter Bar --- */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 py-4 shadow-sm transition-all duration-300">
        <div className="mx-auto max-w-none w-full px-4 sm:px-8 lg:px-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href={filterLink({})} className={chip(!op && !tour)}>Todas</Link>
            <Link href={filterLink({ op: "Venta" })} className={chip(op === "Venta" && !tour)}>Venta</Link>
            <Link href={filterLink({ op: "Alquiler" })} className={chip(op === "Alquiler" && !tour)}>Alquiler</Link>
            <Link href={filterLink({ op: "Temporario" })} className={chip(op === "Temporario" && !tour)}>Temporario</Link>
            <Link href={filterLink({ tour: "1" })} className={`${chip(tour === "1")} flex items-center gap-1.5`}>
              <Compass className={`h-4 w-4 text-blue-500 shrink-0 ${tour === "1" ? "animate-spin-slow text-white" : ""}`} />
              Con Tour 360°
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100/90 border border-slate-200/50 px-4 py-2 rounded-full whitespace-nowrap">
              {filteredProperties.length} {filteredProperties.length === 1 ? "propiedad" : "propiedades"}
            </span>
          </div>
        </div>
      </div>

      {/* --- Main Catalogue Section --- */}
      <main className="mx-auto max-w-[2000px] w-full px-4 sm:px-8 lg:px-16 2xl:px-24 py-12">
        
        {/* --- Loteos y Desarrollos Interactivos --- */}
        {developments.length > 0 && (
          <section className="mb-14 border-b border-slate-200/60 pb-12">
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Compass className="h-6 w-6 text-blue-600 animate-pulse" />
              Loteos y Desarrollos Interactivos
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {developments.map((dev) => {
                const totalLots = dev.lots.length;
                const availableLots = dev.lots.filter(l => l.status === "AVAILABLE").length;
                
                // Buscar precio mínimo de lotes disponibles
                const prices = dev.lots
                  .filter(l => l.status === "AVAILABLE" && l.priceCents)
                  .map(l => l.priceCents as number);
                const minPrice = prices.length > 0 ? Math.min(...prices) : null;
                const currency = dev.lots[0]?.currency || "USD";

                return (
                  <article 
                    key={dev.id} 
                    className="group overflow-hidden rounded-[2.2rem] border-2 border-blue-500/10 bg-[#0f172a] text-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-blue-500/30 flex flex-col h-full hover:-translate-y-1.5"
                  >
                    {/* Imagen de portada del desarrollo (foto/render) o fallback visual */}
                    <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center">
                      {dev.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={dev.coverImageUrl}
                          alt={dev.name}
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="text-5xl opacity-40 group-hover:scale-110 transition duration-500 select-none">🗺️</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60 z-10" />

                      {/* Active Masterplan Badge */}
                      <div className="absolute top-4 left-4 z-20">
                        <span className="rounded-full bg-blue-600 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-white shadow-sm flex items-center gap-1.5">
                          <Compass className="h-3 w-3 animate-spin-slow" />
                          Masterplan Activo
                        </span>
                      </div>

                      {/* Lot Count Badge */}
                      <div className="absolute bottom-4 right-4 z-20">
                        <span className="rounded-full bg-slate-900/80 backdrop-blur-sm px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
                          {availableLots} de {totalLots} libres
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="space-y-2.5 flex-1">
                        <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-400">Desarrollo Loteo</span>
                        <h3 className="text-lg font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors leading-tight">
                          {dev.name}
                        </h3>
                        {dev.description && (
                          <p className="text-xs text-slate-450 line-clamp-2 leading-relaxed font-medium">
                            {dev.description}
                          </p>
                        )}
                        {(dev.city || dev.province) && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-450 font-semibold pt-1">
                            <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                            {[dev.city, dev.province].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="border-t border-slate-800 mt-5 pt-4 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Lotes Desde</p>
                          <p className="text-base font-black text-emerald-400">
                            {minPrice ? formatCurrency(minPrice, currency) : "A consultar"}
                          </p>
                        </div>
                        <Link
                          href={`/cat/${orgSlug}/developments/${dev.id}`}
                          className="rounded-2xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-xs font-bold transition shadow-md shadow-blue-600/20"
                        >
                          Ver Plano ➔
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {filteredProperties.length === 0 ? (
          
          /* Premium Empty State */
          <div className="rounded-[2.5rem] border border-dashed border-slate-200 bg-white p-16 text-center max-w-xl mx-auto space-y-6 shadow-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-slate-50 text-slate-400 shadow-inner mx-auto border border-slate-100">
              <Building2 className="h-10 w-10 text-slate-550" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">Bandeja de propiedades vacía</h3>
              <p className="text-sm font-medium leading-relaxed text-slate-500 max-w-md mx-auto">
                No encontramos propiedades disponibles con los criterios seleccionados en este momento. Intentá limpiando los filtros o contactando al equipo.
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-3 sm:flex-row justify-center">
              <Link
                href={`/cat/${orgSlug}`}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 hover:bg-slate-800 px-6 text-xs font-extrabold uppercase tracking-widest text-white transition-all shadow-md active:scale-95 duration-200"
              >
                Ver todas las propiedades
              </Link>
              {organization.contactWhatsapp && (
                <a
                  href={`https://wa.me/${organization.contactWhatsapp.replace(/\D/g, "")}?text=Hola,%20estaba%20viendo%2520su%2520cat%25C3%25A1logo%2520y%2520quer%25C3%25ADa%2520consultar%2520por%2520nuevos%2520ingresos.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-6 text-xs font-extrabold uppercase tracking-widest text-slate-700 transition active:scale-95 duration-200"
                >
                  Consultar WhatsApp
                </a>
              )}
            </div>
          </div>
        ) : (
          
          /* Optimised Premium Properties Grid */
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 3xl:grid-cols-5">
            {filteredProperties.map((property) => {
              const location = [property.neighborhood, property.city].filter(Boolean).join(", ") || "Ubicación a confirmar";
              
              const price = property.priceCents != null 
                ? formatCurrency(property.priceCents, property.currency ?? "USD") 
                : "A consultar";

              // FASE 3: Obtener imagen de portada (isPrimary o primera de la lista, evitando panoramas)
              const panoramaUrls = new Set(property.panoramas?.map((p) => p.url) ?? []);
              const flatImages = property.images ? property.images.filter((img) => !panoramaUrls.has(img.url)) : [];
              const primaryImage = flatImages.length > 0
                ? (flatImages.find(img => img.isPrimary)?.url ?? flatImages[0].url)
                : (property.images && property.images.length > 0 ? property.images[0].url : null);

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

              const surfaceValue = property.totalSurfaceM2 || property.surfaceM2 || property.coveredSurfaceM2;
              const cardImage = primaryImage ? getOptimizedCatalogImageUrl(primaryImage, 600) : null;
              const hasWhatsapp = Boolean(organization.contactWhatsapp);
              const consultHref = hasWhatsapp
                ? `https://wa.me/${organization.contactWhatsapp!.replace(/\D/g, "")}?text=Hola,%20estoy%20interesado%20en%20la%20propiedad%20"${encodeURIComponent(property.title)}"%20que%20vi%20en%20su%20cat%C3%A1logo%20p%C3%BAblico.`
                : `/cat/${orgSlug}/${property.id}#contact`;

              return (
                <PublicPropertyCard
                  key={property.id}
                  imageUrl={cardImage}
                  title={property.title}
                  priceLabel={price}
                  location={location}
                  badgeLabel={opText}
                  organizationName={organization.name}
                  expensesLabel={property.expensesCents ? `+ expensas ${formatCurrency(property.expensesCents, property.currency ?? "USD")}` : null}
                  surfaceLabel={surfaceValue ? `${surfaceValue}m²` : "–"}
                  bedroomsLabel={property.bedrooms != null ? String(property.bedrooms) : "–"}
                  bathroomsLabel={property.bathrooms != null ? String(property.bathrooms) : "–"}
                  hasTour360={Boolean(hasTour360)}
                  detailHref={`/cat/${orgSlug}/${property.id}`}
                  consultHref={consultHref}
                  consultExternal={hasWhatsapp}
                />
              );
            })}
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-slate-200 text-center text-[11px] text-slate-400 bg-white">
        Catálogo exclusivo generado con <span className="font-bold text-slate-600">Raíces Pilot</span>
      </footer>
      
      {/* Dynamic Style for rotation */}
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
