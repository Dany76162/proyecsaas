export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import {
  Search,
  MapPin,
  Filter,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { PublicMapWrapper } from "@/components/properties/public-map-wrapper";

export const metadata: Metadata = {
  title: "Buscador de Propiedades | Raíces Pilot",
  description: "Encontrá tu próximo hogar. Buscador inmobiliario multi-tenant unificado con visitas 360° y asistencia inteligente 24/7.",
  openGraph: {
    title: "Buscador de Propiedades | Raíces Pilot",
    description: "Encontrá tu próximo hogar en nuestro portal inmobiliario unificado. Conectá directamente con la inmobiliaria dueña.",
    images: ["/brand/opengraph-image.png"],
  },
};

// ── Vertical sidebar styles (mobile / fallback) ──────────────────────────────
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

// ── Horizontal bar styles (desktop map/hybrid/list modes) ────────────────────
const barInput =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none h-9 transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const barLabel = "block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1";

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
  // Más filtros
  minSurface?: string;
  maxSurface?: string;
  minTotalSurface?: string;
  maxTotalSurface?: string;
  parking?: string;
  publishedAfter?: string;
  condition?: string;
  amenities?: string;
  creditApt?: string;
  professionalApt?: string;
  petsAllowed?: string;
  hasVideo?: string;
  hasFloorPlan?: string;
  currency?: string;
};

export default async function PublicPortalPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};

  // 1. Orgs activas para el select de inmobiliaria
  let activeOrgs: Array<{ name: string; slug: string }> = [];
  try {
    activeOrgs = await prisma.organization.findMany({
      where: {
        isActive: true,
        properties: { some: { publicVisible: true, status: "AVAILABLE" } },
      },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("[propiedades] Error fetching active organizations:", error);
  }

  // 2. Filtros dinámicos
  const whereClause: any = {
    publicVisible: true,
    status: "AVAILABLE",
    organization: { isActive: true },
  };

  if (params.operation) whereClause.operationType = params.operation;
  if (params.type) whereClause.propertyType = { contains: params.type, mode: "insensitive" };
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
      const v = parseFloat(params.minPrice);
      if (!isNaN(v)) whereClause.priceCents.gte = Math.round(v * 100);
    }
    if (params.maxPrice) {
      const v = parseFloat(params.maxPrice);
      if (!isNaN(v)) whereClause.priceCents.lte = Math.round(v * 100);
    }
  }
  if (params.bedrooms) {
    const v = parseInt(params.bedrooms, 10);
    if (!isNaN(v)) whereClause.bedrooms = { gte: v };
  }
  if (params.bathrooms) {
    const v = parseInt(params.bathrooms, 10);
    if (!isNaN(v)) whereClause.bathrooms = { gte: v };
  }
  if (params.tour360 === "true") whereClause.panoramas = { some: {} };
  if (params.orgSlug) whereClause.organization = { slug: params.orgSlug, isActive: true };
  // Superficie cubierta
  if (params.minSurface || params.maxSurface) {
    whereClause.surfaceM2 = {};
    if (params.minSurface) { const v = parseFloat(params.minSurface); if (!isNaN(v)) whereClause.surfaceM2.gte = v; }
    if (params.maxSurface) { const v = parseFloat(params.maxSurface); if (!isNaN(v)) whereClause.surfaceM2.lte = v; }
  }
  // Superficie total
  if (params.minTotalSurface || params.maxTotalSurface) {
    whereClause.totalSurfaceM2 = {};
    if (params.minTotalSurface) { const v = parseFloat(params.minTotalSurface); if (!isNaN(v)) whereClause.totalSurfaceM2.gte = v; }
    if (params.maxTotalSurface) { const v = parseFloat(params.maxTotalSurface); if (!isNaN(v)) whereClause.totalSurfaceM2.lte = v; }
  }
  // Cocheras
  if (params.parking !== undefined && params.parking !== "") {
    if (params.parking === "0") { whereClause.parkingSpots = 0; }
    else { const v = parseInt(params.parking, 10); if (!isNaN(v)) whereClause.parkingSpots = { gte: v }; }
  }
  // Fecha de publicación
  if (params.publishedAfter) {
    const now = new Date();
    let since: Date;
    if (params.publishedAfter === "today") since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (params.publishedAfter === "yesterday") since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    else since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    whereClause.createdAt = { gte: since };
  }
  // Antigüedad / condición
  if (params.condition === "UNDER_CONSTRUCTION") {
    whereClause.condition = "UNDER_CONSTRUCTION";
  } else if (params.condition === "NEW") {
    const y = new Date().getFullYear();
    whereClause.yearBuilt = { gte: y - 2 };
  } else if (params.condition === "UP_TO_5_YEARS") {
    const y = new Date().getFullYear();
    whereClause.yearBuilt = { gte: y - 5 };
  }
  // Aptitudes booleanas
  if (params.creditApt === "true") whereClause.creditApt = true;
  if (params.professionalApt === "true") whereClause.professionalApt = true;
  if (params.petsAllowed === "true") whereClause.petsAllowed = true;
  // Multimedia
  if (params.hasVideo === "true") whereClause.videoUrl = { not: null };
  if (params.hasFloorPlan === "true") whereClause.floorPlanUrl = { not: null };
  // Moneda
  if (params.currency === "USD") {
    whereClause.currency = "USD";
  } else if (params.currency === "PESO") {
    whereClause.currency = { in: ["ARS", "MXN", "CLP", "COP", "UYU", "PEN", "BOB", "PYG", "DOP", "CUP"] };
  }
  // Amenities / comodidades / servicios (texto)
  if (params.amenities) {
    const items = params.amenities.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (items.length > 0) {
      if (!whereClause.AND) whereClause.AND = [];
      items.forEach((item: string) => {
        whereClause.AND.push({ amenities: { contains: item, mode: "insensitive" } });
      });
    }
  }

  // 3. Consulta principal
  let properties: any[] = [];
  try {
    properties = await prisma.property.findMany({
      where: whereClause,
      // Select explícito legacy-safe. Evita SELECT * y P2022 en cargas normales.
      // isFeatured eliminado del orderBy — no existe en DB Railway legacy.
      // El try/catch sigue activo para filtros avanzados (condition, yearBuilt, etc.)
      // que pueden referenciar columnas modernas en el WHERE.
      select: {
        id: true,
        title: true,
        description: true,
        priceCents: true,
        currency: true,
        address: true,
        city: true,
        neighborhood: true,
        rooms: true,
        bedrooms: true,
        bathrooms: true,
        surfaceM2: true,
        parkingSpots: true,
        publicVisible: true,
        status: true,
        operationType: true,
        propertyType: true,
        createdAt: true,
        organization: {
          select: { name: true, slug: true, contactPhone: true, contactWhatsapp: true },
        },
        images: {
          select: { url: true, isPrimary: true },
          orderBy: { sortOrder: "asc" },
        },
        panoramas: { select: { id: true }, take: 1 },
        floorPlanUrl: true,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });
  } catch (error) {
    console.warn("[propiedades] Fallback to legacy schema:", error);

    const fw: any = {
      publicVisible: true,
      status: "AVAILABLE",
      organization: { isActive: true },
    };
    if (params.operation) fw.operationType = params.operation;
    if (params.type) fw.propertyType = { contains: params.type, mode: "insensitive" };
    if (params.location) {
      fw.OR = [
        { city: { contains: params.location, mode: "insensitive" } },
        { neighborhood: { contains: params.location, mode: "insensitive" } },
      ];
    }
    if (params.minPrice || params.maxPrice) {
      fw.priceCents = {};
      if (params.minPrice) { const v = parseFloat(params.minPrice); if (!isNaN(v)) fw.priceCents.gte = Math.round(v * 100); }
      if (params.maxPrice) { const v = parseFloat(params.maxPrice); if (!isNaN(v)) fw.priceCents.lte = Math.round(v * 100); }
    }
    if (params.bedrooms) { const v = parseInt(params.bedrooms, 10); if (!isNaN(v)) fw.bedrooms = { gte: v }; }
    if (params.bathrooms) { const v = parseInt(params.bathrooms, 10); if (!isNaN(v)) fw.bathrooms = { gte: v }; }
    if (params.orgSlug) fw.organization = { slug: params.orgSlug, isActive: true };

    properties = await prisma.property.findMany({
      where: fw,
      select: {
        id: true, title: true, description: true, priceCents: true, currency: true,
        address: true, city: true, neighborhood: true, rooms: true, bedrooms: true,
        bathrooms: true, surfaceM2: true, parkingSpots: true, publicVisible: true,
        status: true, operationType: true, propertyType: true, createdAt: true,
        organization: { select: { name: true, slug: true, contactPhone: true, contactWhatsapp: true } },
        images: { select: { url: true, isPrimary: true }, orderBy: { sortOrder: "asc" } },
        panoramas: { select: { id: true }, take: 1 },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });
  }

  // ── Vertical filter sidebar — mobile + fallback ───────────────────────────
  const filtersSidebar = (
    <aside className="lg:col-span-1">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-950 text-sm">
            <Filter className="h-4 w-4 text-brand-600" /> Filtros
          </span>
          <Link
            href="/propiedades"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-brand-600 transition"
          >
            <RotateCcw className="h-3 w-3" /> Limpiar
          </Link>
        </div>
        <form method="GET" action="/propiedades" className="space-y-3">
          <div>
            <label className={labelClass}>Ubicación / Barrio</label>
            <div className="relative">
              <input name="location" defaultValue={params.location ?? ""} className={`${inputClass} pl-8`} placeholder="Ej. Palermo, CABA" />
              <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Operación</label>
            <select name="operation" defaultValue={params.operation ?? ""} className={inputClass}>
              <option value="">Cualquiera</option>
              <option value="RENT">Alquiler</option>
              <option value="SALE">Venta</option>
              <option value="TEMPORARY">Temporario</option>
              <option value="EMPRENDIMIENTO">Emprendimiento</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Tipo de propiedad</label>
            <select name="type" defaultValue={params.type ?? ""} className={inputClass}>
              <option value="">Cualquiera</option>
              <option value="Departamento">Departamento</option>
              <option value="Casa">Casa</option>
              <option value="PH">PH</option>
              <option value="Terreno">Terreno</option>
              <option value="Local comercial">Local comercial</option>
              <option value="Campo">Campo</option>
              <option value="Quinta vacacional">Quinta vacacional</option>
              <option value="Oficina comercial">Oficina comercial</option>
              <option value="Garage">Garage</option>
              <option value="Bodega-Galpón">Bodega-Galpón</option>
              <option value="Fondo de comercio">Fondo de comercio</option>
              <option value="Hotel">Hotel</option>
              <option value="Depósito">Depósito</option>
              <option value="Bóveda, nicho o parcela">Bóveda, nicho o parcela</option>
              <option value="Cama náutica">Cama náutica</option>
              <option value="Consultorio">Consultorio</option>
              <option value="Edificio">Edificio</option>
              <option value="Desarrollo horizontal">Desarrollo horizontal</option>
              <option value="Desarrollo vertical">Desarrollo vertical</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Inmobiliaria</label>
            <select name="orgSlug" defaultValue={params.orgSlug ?? ""} className={inputClass}>
              <option value="">Todas</option>
              {activeOrgs.map((org) => (
                <option key={org.slug} value={org.slug}>{org.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Moneda</label>
            <select name="currency" defaultValue={params.currency ?? ""} className={inputClass}>
              <option value="">Todas</option>
              <option value="USD">USD (Dólar)</option>
              <option value="PESO">Pesos (LatAm)</option>
            </select>
          </div>
          <div className="grid gap-2 grid-cols-2">
            <div>
              <label className={labelClass}>Precio Min</label>
              <input name="minPrice" type="number" min="0" defaultValue={params.minPrice ?? ""} className={inputClass} placeholder="Min" />
            </div>
            <div>
              <label className={labelClass}>Precio Max</label>
              <input name="maxPrice" type="number" min="0" defaultValue={params.maxPrice ?? ""} className={inputClass} placeholder="Max" />
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
          <div className="pt-1.5 border-t border-slate-100">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 font-medium">
              <input name="tour360" type="checkbox" value="true" defaultChecked={params.tour360 === "true"} className="h-4 w-4 rounded border-slate-300 accent-brand-500" />
              <span>Tour 360° únicamente</span>
            </label>
          </div>
          <button type="submit" className="w-full rounded-2xl bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 flex items-center justify-center gap-2">
            <Search className="h-4 w-4" /> Buscar
          </button>
        </form>
      </div>
    </aside>
  );

  // ── Horizontal filter bar — desktop map/hybrid/list modes ─────────────────
  const filtersBar = (
    <form method="GET" action="/propiedades" className="w-full">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2.5">
        {/* Ubicación */}
        <div className="flex flex-col min-w-[140px] flex-1">
          <label className={barLabel}>Ubicación / Barrio</label>
          <div className="relative">
            <input name="location" defaultValue={params.location ?? ""} className={`${barInput} pl-7`} placeholder="Palermo, CABA…" />
            <MapPin className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
        {/* Operación */}
        <div className="flex flex-col w-[120px] shrink-0">
          <label className={barLabel}>Operación</label>
          <select name="operation" defaultValue={params.operation ?? ""} className={barInput}>
            <option value="">Cualquiera</option>
            <option value="RENT">Alquiler</option>
            <option value="SALE">Venta</option>
            <option value="TEMPORARY">Temporario</option>
            <option value="EMPRENDIMIENTO">Emprendimiento</option>
          </select>
        </div>
        {/* Tipo */}
        <div className="flex flex-col min-w-[150px] flex-1">
          <label className={barLabel}>Tipo de propiedad</label>
          <select name="type" defaultValue={params.type ?? ""} className={barInput}>
            <option value="">Cualquiera</option>
            <option value="Departamento">Departamento</option>
            <option value="Casa">Casa</option>
            <option value="PH">PH</option>
            <option value="Terreno">Terreno</option>
            <option value="Local comercial">Local comercial</option>
            <option value="Campo">Campo</option>
            <option value="Quinta vacacional">Quinta vacacional</option>
            <option value="Oficina comercial">Oficina comercial</option>
            <option value="Garage">Garage</option>
            <option value="Bodega-Galpón">Bodega-Galpón</option>
            <option value="Fondo de comercio">Fondo de comercio</option>
            <option value="Hotel">Hotel</option>
            <option value="Depósito">Depósito</option>
            <option value="Bóveda, nicho o parcela">Bóveda, nicho o parcela</option>
            <option value="Cama náutica">Cama náutica</option>
            <option value="Consultorio">Consultorio</option>
            <option value="Edificio">Edificio</option>
            <option value="Desarrollo horizontal">Desarrollo horizontal</option>
            <option value="Desarrollo vertical">Desarrollo vertical</option>
          </select>
        </div>
        {/* Inmobiliaria */}
        <div className="flex flex-col min-w-[120px] flex-1">
          <label className={barLabel}>Inmobiliaria</label>
          <select name="orgSlug" defaultValue={params.orgSlug ?? ""} className={barInput}>
            <option value="">Todas</option>
            {activeOrgs.map((org) => (
              <option key={org.slug} value={org.slug}>{org.name}</option>
            ))}
          </select>
        </div>
        {/* Moneda */}
        <div className="flex flex-col w-[90px] shrink-0">
          <label className={barLabel}>Moneda</label>
          <select name="currency" defaultValue={params.currency ?? ""} className={barInput}>
            <option value="">Todas</option>
            <option value="USD">USD $</option>
            <option value="PESO">Pesos</option>
          </select>
        </div>
        {/* Precio min */}
        <div className="flex flex-col w-[80px] shrink-0">
          <label className={barLabel}>Precio Min</label>
          <input name="minPrice" type="number" min="0" defaultValue={params.minPrice ?? ""} className={barInput} placeholder="0" />
        </div>
        {/* Precio max */}
        <div className="flex flex-col w-[80px] shrink-0">
          <label className={barLabel}>Precio Max</label>
          <input name="maxPrice" type="number" min="0" defaultValue={params.maxPrice ?? ""} className={barInput} placeholder="∞" />
        </div>
        {/* Dormitorios */}
        <div className="flex flex-col w-[70px] shrink-0">
          <label className={barLabel}>Dorm.</label>
          <select name="bedrooms" defaultValue={params.bedrooms ?? ""} className={barInput}>
            <option value="">–</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>
        {/* Baños */}
        <div className="flex flex-col w-[70px] shrink-0">
          <label className={barLabel}>Baños</label>
          <select name="bathrooms" defaultValue={params.bathrooms ?? ""} className={barInput}>
            <option value="">–</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
          </select>
        </div>
        {/* Buttons */}
        <div className="flex items-end gap-2 shrink-0">
          <Link
            href="/propiedades"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 h-9 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Limpiar
          </Link>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-4 h-9 text-sm font-bold text-white transition whitespace-nowrap"
          >
            <Search className="h-4 w-4" /> Buscar
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Nav header */}
      <header className="bg-slate-950 text-white border-b border-slate-900 shadow-lg sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-1.5 transition hover:opacity-90">
            <img
              src="/brand/logo_transparent_icon.png"
              alt="Raíces Pilot Logo"
              className="h-10 w-auto object-contain invert brightness-0"
            />
            <span className="text-lg font-bold tracking-tight text-white">
              <span className="text-brand-400">RAÍCES</span>
              <span className="font-light">Pilot</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-350 hover:text-white transition">
              <ArrowLeft className="h-4 w-4" /> Volver al Inicio
            </Link>
            <Link href="/login" className="rounded-full bg-brand-500 hover:bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition shadow-sm">
              Panel Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full">
        {/* Layout owned entirely by the wrapper */}
        <PublicMapWrapper
          filters={params}
          properties={properties}
          filtersSidebar={filtersSidebar}
          filtersBar={filtersBar}
          activeOrgs={activeOrgs}
        />
      </main>
    </div>
  );
}
