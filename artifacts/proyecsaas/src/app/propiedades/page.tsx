export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { 
  Building2, 
  Search, 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  Car, 
  Maximize2, 
  Compass, 
  Filter, 
  RotateCcw, 
  Phone, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Buscador de Propiedades | Raíces Pilot",
  description: "Encontrá tu próximo hogar. Buscador inmobiliario multi-tenant unificado con visitas 360° y asistencia inteligente 24/7.",
  openGraph: {
    title: "Buscador de Propiedades | Raíces Pilot",
    description: "Encontrá tu próximo hogar en nuestro portal inmobiliario unificado. Conectá directamente con la inmobiliaria dueña.",
    images: ["/brand/opengraph-image.png"],
  },
};

const OPERATION_LABEL: Record<string, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY: "Alquiler Temporario",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

type SearchParams = {
  operation?: string;
  type?: string;
  location?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  bathrooms?: string;
  tour360?: string;
  orgSlug?: string;
};

export default async function PublicPortalPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};

  // 1. Obtener todas las inmobiliarias que tienen al menos una propiedad pública disponible
  let activeOrgs: Array<{ name: string; slug: string }> = [];
  try {
    activeOrgs = await prisma.organization.findMany({
      where: {
        isActive: true,
        properties: {
          some: {
            publicVisible: true,
            status: "AVAILABLE",
          },
        },
      },
      select: {
        name: true,
        slug: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  } catch (error) {
    console.error("[propiedades] Error fetching active organizations:", error);
  }

  // 2. Construir filtros dinámicos basados en los searchParams
  const whereClause: any = {
    publicVisible: true,
    status: "AVAILABLE",
    organization: {
      isActive: true,
    },
  };

  if (params.operation) {
    whereClause.operationType = params.operation;
  }
  if (params.type) {
    whereClause.propertyType = {
      contains: params.type,
      mode: "insensitive",
    };
  }
  if (params.location) {
    whereClause.OR = [
      { city: { contains: params.location, mode: "insensitive" } },
      { neighborhood: { contains: params.location, mode: "insensitive" } },
      { province: { contains: params.location, mode: "insensitive" } },
    ];
  }
  if (params.minPrice || params.maxPrice) {
    whereClause.priceCents = {};
    if (params.minPrice) {
      const minVal = parseFloat(params.minPrice);
      if (!isNaN(minVal)) {
        whereClause.priceCents.gte = Math.round(minVal * 100);
      }
    }
    if (params.maxPrice) {
      const maxVal = parseFloat(params.maxPrice);
      if (!isNaN(maxVal)) {
        whereClause.priceCents.lte = Math.round(maxVal * 100);
      }
    }
  }
  if (params.bedrooms) {
    const beds = parseInt(params.bedrooms, 10);
    if (!isNaN(beds)) {
      whereClause.bedrooms = { gte: beds };
    }
  }
  if (params.bathrooms) {
    const baths = parseInt(params.bathrooms, 10);
    if (!isNaN(baths)) {
      whereClause.bathrooms = { gte: baths };
    }
  }
  if (params.tour360 === "true") {
    whereClause.panoramas = {
      some: {},
    };
  }
  if (params.orgSlug) {
    whereClause.organization = {
      slug: params.orgSlug,
      isActive: true,
    };
  }

  // 3. Ejecutar consulta de propiedades
  let properties: any[] = [];
  try {
    properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
            contactPhone: true,
            contactWhatsapp: true,
          },
        },
        images: {
          select: {
            url: true,
            isPrimary: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        panoramas: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
      take: 100, // Límite de control para performance
    });
  } catch (error) {
    console.warn("[propiedades] Error querying properties with advanced fields, falling back to legacy schema:", error);
    
    // Fallback: remover isFeatured de orderBy y reconstruir el where seguro
    const fallbackWhere: any = {
      publicVisible: true,
      status: "AVAILABLE",
      organization: {
        isActive: true,
      },
    };

    if (params.operation) {
      fallbackWhere.operationType = params.operation;
    }
    if (params.type) {
      fallbackWhere.propertyType = {
        contains: params.type,
        mode: "insensitive",
      };
    }
    if (params.location) {
      fallbackWhere.OR = [
        { city: { contains: params.location, mode: "insensitive" } },
        { neighborhood: { contains: params.location, mode: "insensitive" } },
      ];
    }
    if (params.minPrice || params.maxPrice) {
      fallbackWhere.priceCents = {};
      if (params.minPrice) {
        const minVal = parseFloat(params.minPrice);
        if (!isNaN(minVal)) {
          fallbackWhere.priceCents.gte = Math.round(minVal * 100);
        }
      }
      if (params.maxPrice) {
        const maxVal = parseFloat(params.maxPrice);
        if (!isNaN(maxVal)) {
          fallbackWhere.priceCents.lte = Math.round(maxVal * 100);
        }
      }
    }
    if (params.bedrooms) {
      const beds = parseInt(params.bedrooms, 10);
      if (!isNaN(beds)) {
        fallbackWhere.bedrooms = { gte: beds };
      }
    }
    if (params.bathrooms) {
      const baths = parseInt(params.bathrooms, 10);
      if (!isNaN(baths)) {
        fallbackWhere.bathrooms = { gte: baths };
      }
    }
    if (params.orgSlug) {
      fallbackWhere.organization = {
        slug: params.orgSlug,
        isActive: true,
      };
    }

    properties = await prisma.property.findMany({
      where: fallbackWhere,
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
            contactPhone: true,
            contactWhatsapp: true,
          },
        },
        images: {
          select: {
            url: true,
            isPrimary: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        panoramas: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
      orderBy: [
        { createdAt: "desc" },
      ],
      take: 100,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Dynamic Navigation Bar / Navy Header */}
      <header className="bg-slate-950 text-white border-b border-slate-900 shadow-lg sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-1.5 transition hover:opacity-90">
            <img 
              src="/brand/logo_transparent_icon.png" 
              alt="Raíces Pilot Logo" 
              className="h-10 w-auto object-contain invert brightness-0" 
            />
            <span className="text-lg font-bold tracking-tight text-white">
              <span className="text-brand-400">RAÍCES</span><span className="font-light">Pilot</span>
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link 
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-350 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" /> Volver al Inicio
            </Link>
            <Link 
              href="/login" 
              className="rounded-full bg-brand-500 hover:bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition shadow-sm"
            >
              Panel Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700">
              <Sparkles className="h-3 w-3" /> Portal Integrado
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Multi-Inmobiliaria</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Buscador General de Inmuebles
          </h1>
          <p className="mt-2 text-base text-slate-500 max-w-2xl">
            Explorá el inventario disponible de las mejores inmobiliarias adheridas a la red de Raíces Pilot. Consultá directamente con la inmobiliaria dueña.
          </p>
        </div>

        {/* Layout: Sidebar de Filtros + Grilla de Propiedades */}
        <div className="grid gap-8 lg:grid-cols-4">
          
          {/* Sidebar de Filtros */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-950">
                  <Filter className="h-4 w-4 text-brand-600" /> Filtros avanzados
                </span>
                <Link 
                  href="/propiedades"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-brand-600 transition"
                >
                  <RotateCcw className="h-3 w-3" /> Limpiar
                </Link>
              </div>

              {/* Formulario de búsqueda vía GET */}
              <form method="GET" action="/propiedades" className="space-y-4">
                <div>
                  <label className={labelClass}>Ubicación / Barrio</label>
                  <div className="relative">
                    <input
                      name="location"
                      defaultValue={params.location ?? ""}
                      className={`${inputClass} pl-9`}
                      placeholder="Ej. Palermo, CABA"
                    />
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Operación</label>
                  <select name="operation" defaultValue={params.operation ?? ""} className={inputClass}>
                    <option value="">Cualquiera</option>
                    <option value="SALE">Venta</option>
                    <option value="RENT">Alquiler</option>
                    <option value="TEMPORARY">Alquiler Temporario</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Tipo de propiedad</label>
                  <div className="relative">
                    <input
                      name="type"
                      defaultValue={params.type ?? ""}
                      className={`${inputClass} pl-9`}
                      placeholder="Ej. Departamento"
                    />
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Inmobiliaria</label>
                  <select name="orgSlug" defaultValue={params.orgSlug ?? ""} className={inputClass}>
                    <option value="">Todas</option>
                    {activeOrgs.map((org) => (
                      <option key={org.slug} value={org.slug}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2 grid-cols-2">
                  <div>
                    <label className={labelClass}>Precio Min</label>
                    <input
                      name="minPrice"
                      type="number"
                      min="0"
                      defaultValue={params.minPrice ?? ""}
                      className={inputClass}
                      placeholder="Min"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Precio Max</label>
                    <input
                      name="maxPrice"
                      type="number"
                      min="0"
                      defaultValue={params.maxPrice ?? ""}
                      className={inputClass}
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div className="grid gap-2 grid-cols-2">
                  <div>
                    <label className={labelClass}>Dormitorios</label>
                    <select name="bedrooms" defaultValue={params.bedrooms ?? ""} className={inputClass}>
                      <option value="">Cualquiera</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Baños</label>
                    <select name="bathrooms" defaultValue={params.bathrooms ?? ""} className={inputClass}>
                      <option value="">Cualquiera</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 mt-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 font-medium">
                    <input
                      name="tour360"
                      type="checkbox"
                      value="true"
                      defaultChecked={params.tour360 === "true"}
                      className="h-4 w-4 rounded border-slate-350 accent-brand-500"
                    />
                    <span>Únicamente con Tour 360°</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white shadow transition hover:bg-slate-800 flex items-center justify-center gap-2 mt-4"
                >
                  <Search className="h-4 w-4" /> Buscar propiedades
                </button>
              </form>
            </div>
          </aside>

          {/* Grilla de Resultados */}
          <section className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Se encontraron <strong className="text-slate-900">{properties.length}</strong> propiedades
              </span>
            </div>

            {properties.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {properties.map((prop) => {
                  const primaryImg = (prop.images || []).find((img: { isPrimary: boolean; url: string }) => img.isPrimary) || (prop.images || [])[0] || null;
                  
                  const currencyCode = (prop.currency && prop.currency.trim() !== "") ? prop.currency.trim().toUpperCase() : "USD";
                  const isValidCurrency = /^[A-Z]{3}$/.test(currencyCode);
                  const priceFormatted = prop.priceCents != null
                    ? new Intl.NumberFormat("es-AR", {
                        style: "currency",
                        currency: isValidCurrency ? currencyCode : "USD",
                        maximumFractionDigits: 0
                      }).format(Number(prop.priceCents) / 100)
                    : "A consultar";

                  const detailsLink = prop.organization?.slug ? `/cat/${prop.organization.slug}/${prop.id}` : "#";

                  // Enlace de WhatsApp directo con la inmobiliaria dueña para resguardar multi-tenant absoluto
                  const waText = encodeURIComponent(`Hola, vi tu propiedad "${prop.title || 'Inmueble'}" en el portal general Raíces Pilot y me gustaría obtener más detalles.`);
                  const targetPhone = prop.organization?.contactWhatsapp || prop.organization?.contactPhone;
                  const whatsappUrl = targetPhone
                    ? `https://wa.me/${String(targetPhone).replace(/[^0-9]/g, "")}?text=${waText}`
                    : detailsLink;

                  return (
                    <article 
                      key={prop.id}
                      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {/* Imagen / Badge 360 */}
                      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden shrink-0">
                        {primaryImg ? (
                          <img
                            src={primaryImg.url}
                            alt={prop.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Building2 className="h-12 w-12" />
                          </div>
                        )}

                        {/* Badges superiores */}
                        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                          {prop.isFeatured && (
                            <span className="rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                              Destacada
                            </span>
                          )}
                          <span className="rounded-full bg-slate-900/85 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                            {OPERATION_LABEL[prop.operationType ?? ""] ?? "Propiedad"}
                          </span>
                        </div>

                        {(prop.panoramas || []).length > 0 && (
                          <div className="absolute bottom-3 right-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                              <Compass className="h-3.5 w-3.5 animate-spin-slow" /> Tour 360°
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Cuerpo de la tarjeta */}
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex-1">
                          {/* Marca del tenant responsable */}
                          <div className="mb-2 flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Ofrecido por
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {prop.organization?.name ?? "Inmobiliaria"}
                            </span>
                          </div>

                          <h3 className="line-clamp-2 text-lg font-bold text-slate-950 group-hover:text-brand-600 transition">
                            {prop.title}
                          </h3>

                          {/* Precio */}
                          <p className="mt-2 text-xl font-black text-slate-900 tracking-tight">
                            {priceFormatted}
                          </p>

                          {/* Ubicación */}
                          <div className="mt-3 flex items-center gap-1 text-sm font-medium text-slate-500">
                            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {[prop.neighborhood, prop.city].filter(Boolean).join(", ") || "Ubicación a confirmar"}
                            </span>
                          </div>

                          {/* Características Físicas / Avanzadas */}
                          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4 text-slate-500">
                            <div className="flex flex-col items-center justify-center text-center">
                              <Maximize2 className="h-4 w-4 text-slate-400 mb-1" />
                              <span className="text-[10px] font-medium leading-none">
                                {prop.totalSurfaceM2 || prop.surfaceM2 ? `${prop.totalSurfaceM2 || prop.surfaceM2}m²` : "–"}
                              </span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                              <Bed className="h-4 w-4 text-slate-400 mb-1" />
                              <span className="text-[10px] font-medium leading-none">
                                {prop.bedrooms != null ? `${prop.bedrooms} Dorm` : "–"}
                              </span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                              <Bath className="h-4 w-4 text-slate-400 mb-1" />
                              <span className="text-[10px] font-medium leading-none">
                                {prop.bathrooms != null ? `${prop.bathrooms} Baños` : "–"}
                              </span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                              <Car className="h-4 w-4 text-slate-400 mb-1" />
                              <span className="text-[10px] font-medium leading-none">
                                {prop.parkingSpots != null ? `${prop.parkingSpots} Coch` : "–"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción unificados */}
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <Button variant="outline" asChild className="rounded-xl border-slate-200">
                            <Link href={detailsLink}>
                              Ver ficha <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button asChild className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
                            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                              <Phone className="mr-1 h-3.5 w-3.5 shrink-0" /> Consultar
                            </a>
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-350 p-12 text-center bg-white shadow-soft">
                <Building2 className="mx-auto h-12 w-12 text-slate-350" />
                <h3 className="mt-4 text-lg font-bold text-slate-950">No encontramos propiedades</h3>
                <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
                  Probá ajustando o limpiando los filtros para ver más resultados del catálogo.
                </p>
                <div className="mt-6">
                  <Link 
                    href="/propiedades"
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition px-6 h-11"
                  >
                    Ver todas las propiedades
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
