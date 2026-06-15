"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  Map,
  List,
  HelpCircle,
  LayoutGrid,
  Columns,
  Building2,
  MapPin,
  Bed,
  Bath,
  Car,
  Phone,
  ChevronRight,
  Maximize2,
  X,
  SlidersHorizontal,
  Filter,
  RotateCcw,
  Search,
} from "lucide-react";

const PropertyMap = dynamic(() => import("./property-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-slate-500 animate-pulse">
        <Compass className="h-8 w-8 animate-spin text-brand-500" />
        <span className="text-xs font-semibold">Cargando mapa...</span>
      </div>
    </div>
  ),
});

const OP_LABEL: Record<string, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY: "Temporario",
  EMPRENDIMIENTO: "Emprendimiento",
};

type PublicMapWrapperProps = {
  filters: any;
  properties: any[];
  filtersSidebar: React.ReactNode;
  filtersBar: React.ReactNode;
  activeOrgs?: Array<{ name: string; slug: string }>;
  developments?: any[];
  adminHomeHref?: string | null;
};

type DesktopViewMode = "list" | "hybrid" | "map";

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(prop: any): string {
  if (prop.priceCents == null) return "A consultar";
  const raw = prop.currency?.trim().toUpperCase() || "USD";
  const cur = /^[A-Z]{3}$/.test(raw) ? raw : "USD";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  }).format(Number(prop.priceCents) / 100);
}

function links(prop: any) {
  const detail = prop.organization?.slug ? `/cat/${prop.organization.slug}/${prop.id}` : "#";
  const waMsg = encodeURIComponent(
    `Hola, vi "${prop.title || "Inmueble"}" en Raíces Pilot y me gustaría más detalles.`
  );
  const waPhone = prop.organization?.contactWhatsapp;
  const wa = waPhone
    ? `https://wa.me/${String(waPhone).replace(/[^0-9]/g, "")}?text=${waMsg}`
    : detail;
  return { detail, wa };
}

// ── Full card — list mode ─────────────────────────────────────────────────────
function FullCard({ prop }: { prop: any }) {
  const img = (prop.images || []).find((i: any) => i.isPrimary) || (prop.images || [])[0] || null;
  const { detail, wa } = links(prop);
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden shrink-0">
        {img ? (
          <img src={img.url} alt={prop.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Building2 className="h-12 w-12" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {prop.isFeatured && (
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow-sm">Destacada</span>
          )}
          <span className="rounded-full bg-slate-900/85 px-2.5 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
            {OP_LABEL[prop.operationType ?? ""] ?? "Propiedad"}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
          {(prop.panoramas || []).length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow">
              <Compass className="h-3 w-3 animate-spin-slow" /> Tour 360°
            </span>
          )}
          {prop.floorPlanUrl && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/90 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow">
              Plano
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ofrecido por</span>
            <span className="rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {prop.organization?.name ?? "Inmobiliaria"}
            </span>
          </div>
          <h3 className="line-clamp-2 font-bold text-slate-950 group-hover:text-brand-600 transition leading-snug">{prop.title}</h3>
          <p className="mt-1.5 text-xl font-extrabold text-slate-900 tracking-tight">{fmt(prop)}</p>
          <div className="mt-2 flex items-center gap-1 text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate text-xs">
              {[prop.neighborhood, prop.city].filter(Boolean).join(", ") || "Ubicación a confirmar"}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
              {prop.totalSurfaceM2 || prop.surfaceM2 ? `${prop.totalSurfaceM2 || prop.surfaceM2}m²` : "–"}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Bed className="h-3.5 w-3.5 text-slate-400" />
              {prop.bedrooms != null ? prop.bedrooms : "–"}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Bath className="h-3.5 w-3.5 text-slate-400" />
              {prop.bathrooms != null ? prop.bathrooms : "–"}
            </span>
            {prop.parkingSpots != null && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Car className="h-3.5 w-3.5 text-slate-400" />{prop.parkingSpots}
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={detail} className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
            Ver ficha <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-semibold text-white transition">
            <Phone className="h-3.5 w-3.5" /> Consultar
          </a>
        </div>
      </div>
    </article>
  );
}

// ── Medium card — panel lateral (hybrid / map) ────────────────────────────────
// ~140-160px tall, 120px image, text-sm readable
function MediumCard({ prop }: { prop: any }) {
  const img = (prop.images || []).find((i: any) => i.isPrimary) || (prop.images || [])[0] || null;
  const { detail, wa } = links(prop);
  return (
    <article className="group flex min-h-[230px] overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-md hover:border-slate-300">
      {/* Image */}
      <div className="relative w-[210px] shrink-0 bg-slate-100 overflow-hidden">
        {img ? (
          <img src={img.url} alt={prop.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Building2 className="h-8 w-8" />
          </div>
        )}
        <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
          <span className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur-sm leading-tight">
            {OP_LABEL[prop.operationType ?? ""] ?? "Prop"}
          </span>
          {(prop.panoramas || []).length > 0 && (
            <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-tight">360°</span>
          )}
          {prop.floorPlanUrl && (
            <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[9px] font-bold text-white leading-tight">Plano</span>
          )}
        </div>
        {prop.isFeatured && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-tight">★ Dest.</span>
        )}
      </div>
      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-3 min-w-0">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate mb-0.5">
            {prop.organization?.name ?? "Inmobiliaria"}
          </p>
          <h3 className="text-sm font-bold text-slate-950 line-clamp-2 leading-snug group-hover:text-brand-600 transition">
            {prop.title}
          </h3>
          <p className="text-base font-extrabold text-slate-900 tracking-tight mt-1 leading-tight">
            {fmt(prop)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="text-xs font-medium text-slate-600 truncate">
              {[prop.neighborhood, prop.city].filter(Boolean).join(", ") || "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            {prop.bedrooms != null && (
              <span className="flex items-center gap-0.5"><Bed className="h-3.5 w-3.5 text-slate-500" />{prop.bedrooms}</span>
            )}
            {prop.bathrooms != null && (
              <span className="flex items-center gap-0.5"><Bath className="h-3.5 w-3.5 text-slate-500" />{prop.bathrooms}</span>
            )}
            {(prop.totalSurfaceM2 || prop.surfaceM2) && (
              <span>{prop.totalSurfaceM2 || prop.surfaceM2}m²</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Link href={detail} className="rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase text-white transition whitespace-nowrap">
              Ver ficha
            </Link>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition">
              <Phone className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Más filtros dropdown ──────────────────────────────────────────────────────
const mfInput = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const mfTitle = "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2";

const PROPERTY_TYPES = [
  "Departamento", "Casa", "PH", "Terreno", "Local comercial",
  "Campo", "Quinta vacacional", "Oficina comercial", "Garage",
  "Bodega-Galpón", "Fondo de comercio", "Hotel", "Depósito",
  "Bóveda, nicho o parcela", "Cama náutica", "Consultorio",
  "Edificio", "Desarrollo horizontal", "Desarrollo vertical",
];
const AMBIENTES   = ["Cocina", "Living comedor", "Balcón", "Lavadero", "Comedor", "Estudio", "Terraza", "Sala de estar"];
const COMODIDADES = ["Pileta", "Parrilla", "Encargado", "Vigilancia", "Quincho", "Gimnasio", "Sauna", "SUM"];
const SERVICIOS   = ["Luz", "Agua corriente", "Gas natural", "Calefacción"];

function MoreFiltersDropdown({ filters, activeOrgs, onClose }: { filters: any; activeOrgs: Array<{name: string; slug: string}>; onClose: () => void }) {
  const router = useRouter();

  const [propertyType,    setPropertyType]    = useState(filters.type || "");
  const [showAllTypes,    setShowAllTypes]    = useState(false);
  const [orgSlug,         setOrgSlug]         = useState(filters.orgSlug || "");
  const [minSurface,      setMinSurface]      = useState(filters.minSurface || "");
  const [maxSurface,      setMaxSurface]      = useState(filters.maxSurface || "");
  const [minTotalSurface, setMinTotalSurface] = useState(filters.minTotalSurface || "");
  const [maxTotalSurface, setMaxTotalSurface] = useState(filters.maxTotalSurface || "");
  const [parking,         setParking]         = useState(filters.parking || "");
  const [bathrooms,       setBathrooms]       = useState(filters.bathrooms || "");
  const [publishedAfter,  setPublishedAfter]  = useState(filters.publishedAfter || "");
  const [condition,       setCondition]       = useState(filters.condition || "");
  const [creditApt,       setCreditApt]       = useState(filters.creditApt === "true");
  const [professionalApt, setProfessionalApt] = useState(filters.professionalApt === "true");
  const [petsAllowed,     setPetsAllowed]     = useState(filters.petsAllowed === "true");
  const [luminoso,        setLuminoso]        = useState((filters.amenities || "").toLowerCase().includes("luminoso"));
  const [accesible,       setAccesible]       = useState((filters.amenities || "").toLowerCase().includes("acceso reducida"));
  const [hasVideo,        setHasVideo]        = useState(filters.hasVideo === "true");
  const [hasFloorPlan,    setHasFloorPlan]    = useState(filters.hasFloorPlan === "true");
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(
    new Set((filters.amenities || "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean))
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleAmenity = (item: string) => {
    const key = item.toLowerCase();
    setSelectedAmenities(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const toggleSection = (id: string) =>
    setExpandedSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleApply = () => {
    const p = new URLSearchParams();
    if (filters.operation)               p.set("operation", filters.operation);
    if (filters.location)                p.set("location",  filters.location);
    if (propertyType || filters.type)    p.set("type",      propertyType || filters.type);
    if (orgSlug || filters.orgSlug)      p.set("orgSlug",   orgSlug || filters.orgSlug);
    if (filters.minPrice)   p.set("minPrice",  filters.minPrice);
    if (filters.maxPrice)   p.set("maxPrice",  filters.maxPrice);
    if (filters.bedrooms)   p.set("bedrooms",  filters.bedrooms);
    if (filters.currency)   p.set("currency",  filters.currency);
    if (filters.tour360 === "true") p.set("tour360", "true");
    if (bathrooms)       p.set("bathrooms",       bathrooms);
    if (minSurface)      p.set("minSurface",      minSurface);
    if (maxSurface)      p.set("maxSurface",      maxSurface);
    if (minTotalSurface) p.set("minTotalSurface", minTotalSurface);
    if (maxTotalSurface) p.set("maxTotalSurface", maxTotalSurface);
    if (parking)         p.set("parking",         parking);
    if (publishedAfter)  p.set("publishedAfter",  publishedAfter);
    if (condition)       p.set("condition",       condition);
    if (creditApt)       p.set("creditApt",       "true");
    if (professionalApt) p.set("professionalApt", "true");
    if (petsAllowed)     p.set("petsAllowed",     "true");
    if (hasVideo)        p.set("hasVideo",        "true");
    if (hasFloorPlan)    p.set("hasFloorPlan",    "true");
    const allAmenities = new Set(selectedAmenities);
    if (luminoso)  allAmenities.add("luminoso");
    if (accesible) allAmenities.add("acceso reducida");
    if (allAmenities.size > 0) p.set("amenities", Array.from(allAmenities).join(","));
    router.push(`/propiedades?${p.toString()}`);
    onClose();
  };

  // Sub-componentes locales
  const Pill = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${selected ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}>
      {label}
    </button>
  );

  const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <label className="flex items-center gap-2 cursor-pointer group py-0.5">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-500 shrink-0" />
      <span className="text-sm text-slate-700 group-hover:text-slate-900 leading-snug">{label}</span>
    </label>
  );

  const SectionItems = ({ id, items, perPage = 4 }: { id: string; items: string[]; perPage?: number }) => {
    const expanded = expandedSections.has(id);
    const visible  = expanded ? items : items.slice(0, perPage);
    return (
      <div className="space-y-0.5">
        {visible.map(item => (
          <Check key={item} label={item} checked={selectedAmenities.has(item.toLowerCase())} onChange={() => toggleAmenity(item)} />
        ))}
        {items.length > perPage && (
          <button type="button" onClick={() => toggleSection(id)} className="text-xs text-brand-600 font-semibold hover:underline mt-1 block">
            {expanded ? "Ver menos ↑" : `Ver más (${items.length - perPage} más) ↓`}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="absolute top-full right-0 mt-2 z-50 w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col" style={{ maxHeight: "calc(100vh - 220px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-sm font-bold text-slate-950">Más filtros</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 transition">
          <X className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 min-h-0 px-4 py-3 space-y-4">

        {/* Tipo de propiedad */}
        <section>
          <p className={mfTitle}>Tipo de propiedad</p>
          <div className="flex flex-wrap gap-1.5">
            {(showAllTypes ? PROPERTY_TYPES : PROPERTY_TYPES.slice(0, 6)).map(t => (
              <Pill key={t} label={t} selected={propertyType === t} onClick={() => setPropertyType(t === propertyType ? "" : t)} />
            ))}
          </div>
          {PROPERTY_TYPES.length > 6 && (
            <button type="button" onClick={() => setShowAllTypes(v => !v)} className="text-xs text-brand-600 font-semibold hover:underline mt-1.5 block">
              {showAllTypes ? "Ver menos ↑" : `Ver más (${PROPERTY_TYPES.length - 6} más) ↓`}
            </button>
          )}
        </section>

        {/* Inmobiliaria */}
        {activeOrgs.length > 0 && (
          <section>
            <p className={mfTitle}>Inmobiliaria</p>
            <select
              value={orgSlug}
              onChange={e => setOrgSlug(e.target.value)}
              className={mfInput}
            >
              <option value="">Todas las inmobiliarias</option>
              {activeOrgs.map(org => (
                <option key={org.slug} value={org.slug}>{org.name}</option>
              ))}
            </select>
          </section>
        )}

        {/* Superficie */}
        <section>
          <p className={mfTitle}>Superficie</p>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-400 mb-1">Cubierta (m²)</p>
              <div className="flex items-center gap-2">
                <input type="number" value={minSurface} onChange={e => setMinSurface(e.target.value)} placeholder="Desde" className={mfInput} min="0" />
                <span className="text-slate-300">–</span>
                <input type="number" value={maxSurface} onChange={e => setMaxSurface(e.target.value)} placeholder="Hasta" className={mfInput} min="0" />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Total (m²)</p>
              <div className="flex items-center gap-2">
                <input type="number" value={minTotalSurface} onChange={e => setMinTotalSurface(e.target.value)} placeholder="Desde" className={mfInput} min="0" />
                <span className="text-slate-300">–</span>
                <input type="number" value={maxTotalSurface} onChange={e => setMaxTotalSurface(e.target.value)} placeholder="Hasta" className={mfInput} min="0" />
              </div>
            </div>
          </div>
        </section>

        {/* Baños */}
        <section>
          <p className={mfTitle}>Baños</p>
          <div className="flex flex-wrap gap-1.5">
            {[["","Cualquiera"],["1","1+"],["2","2+"],["3","3+"],["4","4+"],["5","5+"]].map(([val, label]) => (
              <Pill key={val} label={label} selected={bathrooms === val} onClick={() => setBathrooms(val === bathrooms ? "" : val)} />
            ))}
          </div>
        </section>

        {/* Cocheras */}
        <section>
          <p className={mfTitle}>Cocheras</p>
          <div className="flex flex-wrap gap-1.5">
            {[["","Cualquiera"],["0","0"],["1","1+"],["2","2+"],["3","3+"],["4","4+"]].map(([val, label]) => (
              <Pill key={val} label={label} selected={parking === val} onClick={() => setParking(val === parking ? "" : val)} />
            ))}
          </div>
        </section>

        {/* Fecha de publicación */}
        <section>
          <p className={mfTitle}>Fecha de publicación</p>
          <div className="flex flex-wrap gap-1.5">
            {[["yesterday","Desde ayer"],["today","Hoy"],["week","Última semana"]].map(([val, label]) => (
              <Pill key={val} label={label} selected={publishedAfter === val} onClick={() => setPublishedAfter(val === publishedAfter ? "" : val)} />
            ))}
          </div>
        </section>

        {/* Antigüedad */}
        <section>
          <p className={mfTitle}>Antigüedad</p>
          <div className="flex flex-wrap gap-1.5">
            {[["UNDER_CONSTRUCTION","En construcción"],["NEW","A estrenar"],["UP_TO_5_YEARS","Hasta 5 años"]].map(([val, label]) => (
              <Pill key={val} label={label} selected={condition === val} onClick={() => setCondition(val === condition ? "" : val)} />
            ))}
          </div>
        </section>

        {/* Tipos de ambientes */}
        <section>
          <p className={mfTitle}>Tipos de ambientes</p>
          <SectionItems id="ambientes" items={AMBIENTES} perPage={4} />
        </section>

        {/* Comodidades */}
        <section>
          <p className={mfTitle}>Comodidades</p>
          <SectionItems id="comodidades" items={COMODIDADES} perPage={4} />
        </section>

        {/* Características de la propiedad */}
        <section>
          <p className={mfTitle}>Características de la propiedad</p>
          <div className="space-y-0.5">
            <Check label="Apto crédito"          checked={creditApt}       onChange={() => setCreditApt(!creditApt)} />
            <Check label="Apto profesional"       checked={professionalApt} onChange={() => setProfessionalApt(!professionalApt)} />
            <Check label="Permite mascotas"       checked={petsAllowed}     onChange={() => setPetsAllowed(!petsAllowed)} />
            <Check label="Luminoso"               checked={luminoso}        onChange={() => setLuminoso(!luminoso)} />
            <Check label="Acceso movilidad reducida" checked={accesible}    onChange={() => setAccesible(!accesible)} />
          </div>
        </section>

        {/* Servicios */}
        <section>
          <p className={mfTitle}>Servicios</p>
          <SectionItems id="servicios" items={SERVICIOS} perPage={4} />
        </section>

        {/* Multimedia */}
        <section>
          <p className={mfTitle}>Multimedia</p>
          <div className="space-y-0.5">
            <Check label="Recorrido 360°" checked={filters.tour360 === "true"} onChange={() => {}} />
            <Check label="Video"          checked={hasVideo}     onChange={() => setHasVideo(!hasVideo)} />
            <Check label="Planos"         checked={hasFloorPlan} onChange={() => setHasFloorPlan(!hasFloorPlan)} />
          </div>
        </section>

      </div>

      {/* Footer */}
      <div className="flex gap-2 px-4 py-3 border-t border-slate-100 shrink-0">
        <button type="button" onClick={() => { router.push("/propiedades"); onClose(); }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
          <RotateCcw className="h-3.5 w-3.5" /> Limpiar
        </button>
        <button type="button" onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 py-2 text-sm font-bold text-white transition">
          <Search className="h-4 w-4" /> Ver resultados
        </button>
      </div>
    </div>
  );
}

// ── Empty states ─────────────────────────────────────────────────────────────
function EmptyFull({ adminHomeHref }: { adminHomeHref?: string | null }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center bg-white shadow-sm">
      <Building2 className="mx-auto h-12 w-12 text-slate-300" />
      <h3 className="mt-4 text-lg font-bold text-slate-950">Todavía no hay propiedades publicadas</h3>
      <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
        Por ahora no encontramos propiedades para mostrar. Probá ajustando los filtros o volvé en unos días: el catálogo se actualiza constantemente.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/propiedades" className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition px-6 h-11">
          Ver todas las propiedades
        </Link>
        {adminHomeHref && (
          <Link href={adminHomeHref} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition px-6 h-11">
            Ir a mi panel para publicar
          </Link>
        )}
      </div>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center bg-white">
      <Building2 className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-2 text-sm font-semibold text-slate-400">Sin resultados</p>
      <Link href="/propiedades" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
        Limpiar filtros
      </Link>
    </div>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────
const MAP_EMBEDDED = "relative w-full h-full bg-slate-50 overflow-hidden";

// Heights above the content area: header 64px + hero ~90px + switcher ~48px + bar ~58px + gaps ~50px = ~310px
const CONTENT_H = "h-[calc(100vh-310px)] min-h-[480px]";

function ImageCarousel({ images, alt }: { images: { url: string }[], alt: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-300 bg-slate-100">
        <Building2 className="h-12 w-12" />
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <img src={images[0].url} alt={alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
    );
  }

  return (
    <div className="relative h-full w-full group/carousel">
      <img src={images[currentIndex].url} alt={alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/50 group-hover/carousel:opacity-100"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/50 group-hover/carousel:opacity-100"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {images.map((_, i) => (
          <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === currentIndex ? "bg-white" : "bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}

function DevelopmentFullCard({ dev }: { dev: any }) {
  const images = dev.images || (dev.logoUrl ? [{ url: dev.logoUrl }] : []);
  const detail = `/cat/${dev.organization?.slug}/developments/${dev.id}`;
  const total = dev.lots?.length || 0;
  const available = (dev.lots || []).filter((l: any) => l.status === "AVAILABLE").length;

  const waMsg = encodeURIComponent(`Hola, vi el desarrollo "${dev.name}" en Raíces Pilot y me gustaría más detalles.`);
  const waPhone = dev.contactPhone || dev.organization?.contactWhatsapp;
  const wa = waPhone
    ? `https://wa.me/${String(waPhone).replace(/[^0-9]/g, "")}?text=${waMsg}`
    : detail;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden shrink-0">
        <ImageCarousel images={images} alt={dev.name} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow-sm">Masterplan</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Desarrollador</span>
              <span className="rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {dev.organization?.name ?? "Inmobiliaria"}
              </span>
            </div>
          </div>
          <h3 className="line-clamp-2 font-bold text-slate-950 group-hover:text-brand-600 transition leading-snug">{dev.name}</h3>

          <div className="mt-2 flex items-center gap-1 text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate text-xs">
              {[dev.address, dev.city].filter(Boolean).join(", ") || "Ubicación a confirmar"}
            </span>
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
            {dev.description}
          </p>

          <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
             <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
               {available} / {total} libres
             </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={detail} className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
            Ver lotes <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-semibold text-white transition">
            <Phone className="h-3.5 w-3.5" /> Consultar
          </a>
        </div>
      </div>
    </article>
  );
}

function DevelopmentMediumCard({ dev }: { dev: any }) {
  const images = dev.images || (dev.logoUrl ? [{ url: dev.logoUrl }] : []);
  const detail = `/cat/${dev.organization?.slug}/developments/${dev.id}`;
  const total = dev.lots?.length || 0;
  const available = (dev.lots || []).filter((l: any) => l.status === "AVAILABLE").length;

  const waMsg = encodeURIComponent(`Hola, vi el desarrollo "${dev.name}" en Raíces Pilot y me gustaría más detalles.`);
  const waPhone = dev.contactPhone || dev.organization?.contactWhatsapp;
  const wa = waPhone
    ? `https://wa.me/${String(waPhone).replace(/[^0-9]/g, "")}?text=${waMsg}`
    : detail;

  return (
    <article className="group flex min-h-[230px] overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-md hover:border-slate-300">
      {/* Image */}
      <div className="relative w-[210px] shrink-0 bg-slate-100 overflow-hidden">
        <ImageCarousel images={images} alt={dev.name} />
        <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
          <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur-sm leading-tight">
            Masterplan
          </span>
        </div>
      </div>
      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-3 min-w-0">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate mb-0.5">
            {dev.organization?.name ?? "Inmobiliaria"}
          </p>
          <h3 className="text-sm font-bold text-slate-950 line-clamp-2 leading-snug group-hover:text-brand-600 transition">
            {dev.name}
          </h3>
          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {dev.description}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="text-xs font-medium text-slate-600 truncate">
              {[dev.address, dev.city].filter(Boolean).join(", ") || "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
             {available} / {total} libres
          </div>
          <div className="flex items-center gap-1.5">
            <Link href={detail} className="rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase text-white transition whitespace-nowrap">
              Ver lotes
            </Link>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition">
              <Phone className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Wrapper ──────────────────────────────────────────────────────────────────
export function PublicMapWrapper({ filters, properties, filtersSidebar, filtersBar, activeOrgs = [], developments = [], adminHomeHref = null }: PublicMapWrapperProps) {
  const [viewMode, setViewMode] = useState<DesktopViewMode>("hybrid");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [hasStyleUrl, setHasStyleUrl] = useState(false);

  const enableMap = process.env.NEXT_PUBLIC_ENABLE_PROPERTY_MAP === "true";
  const styleUrl = process.env.NEXT_PUBLIC_PROPERTY_MAP_STYLE_URL;

  useEffect(() => { setHasStyleUrl(!!styleUrl); }, [styleUrl]);

  const count = properties.length;

  const activeFilterCount = [
    filters.location, filters.operation, filters.type, filters.orgSlug,
    filters.minPrice, filters.maxPrice, filters.bedrooms, filters.bathrooms,
    filters.tour360 === "true" ? "1" : null,
  ].filter(Boolean).length;

  const moreActiveCount = [
    filters.minSurface, filters.maxSurface,
    filters.minTotalSurface, filters.maxTotalSurface,
    filters.parking, filters.publishedAfter,
  ].filter(Boolean).length;

  const moreFiltersBtn = (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setShowMoreFilters(v => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 h-9 text-sm font-semibold transition whitespace-nowrap ${
          moreActiveCount > 0
            ? "border-brand-500 bg-brand-50 text-brand-700"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Más filtros
        {moreActiveCount > 0 && (
          <span className="rounded-full bg-brand-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center shrink-0">
            {moreActiveCount}
          </span>
        )}
      </button>
      {showMoreFilters && (
        <MoreFiltersDropdown filters={filters} activeOrgs={activeOrgs} onClose={() => setShowMoreFilters(false)} />
      )}
    </div>
  );

  // ── Feature flag off — traditional sidebar layout ────────────────────────
  if (!enableMap) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-4">
          {filtersSidebar}
          <section className="lg:col-span-3">
            <p className="mb-4 text-sm text-slate-500"><strong className="text-slate-900">{count}</strong> propiedades</p>
            {count > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {properties.map((p) => <FullCard key={p.id} prop={p} />)}
              </div>
            ) : <EmptyFull adminHomeHref={adminHomeHref} />}
          </section>
        </div>
      </div>
    );
  }

  // ── Flag on, no style URL — show warning + sidebar fallback ─────────────
  if (!hasStyleUrl) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-4">
          {filtersSidebar}
          <section className="lg:col-span-3">
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-2.5 shadow-sm">
              <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Vista de mapa simplificada</span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  El mapa interactivo está inactivo por falta de configuración de tiles.
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-500"><strong className="text-slate-900">{count}</strong> propiedades</p>
            {count > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {properties.map((p) => <FullCard key={p.id} prop={p} />)}
              </div>
            ) : <EmptyFull adminHomeHref={adminHomeHref} />}
          </section>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FULL MAP EXPERIENCE
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="relative w-full">
      {showMoreFilters && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMoreFilters(false)} />
      )}

      {/* ── Desktop view-mode switcher — sticky below header ── */}
      <div className="hidden lg:flex sticky top-16 z-30 items-center justify-between bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500 leading-none">Portal Multi-Inmobiliaria</span>
            <p className="text-sm font-bold text-slate-900 leading-tight">Buscador General de Inmuebles</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Listado
          </button>
          <button
            onClick={() => setViewMode("hybrid")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              viewMode === "hybrid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
            }`}
          >
            <Columns className="h-3.5 w-3.5" /> Híbrido
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              viewMode === "map" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
            }`}
          >
            <Map className="h-3.5 w-3.5" /> Mapa
          </button>
        </div>
      </div>

      {/* ── Mobile header bar ── */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <span className="text-xs text-slate-500">
          <strong className="text-slate-900">{count + developments.length}</strong>{" "}
          {count + developments.length === 1 ? "resultado" : "resultados"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-all ${
              showMobileFilters
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-brand-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center shrink-0">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileView(mobileView === "list" ? "map" : "list")}
            className="flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3 py-1.5 text-xs font-bold shadow-md active:scale-95 transition-transform"
          >
            {mobileView === "list"
              ? <><Map className="h-3.5 w-3.5 text-brand-400" /> Ver Mapa</>
              : <><List className="h-3.5 w-3.5 text-brand-400" /> Listado</>}
          </button>
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="lg:hidden pb-8">
        {/* Collapsible mobile filters */}
        {showMobileFilters && (
          <div className="px-4 pt-3 pb-2">
            {filtersSidebar}
          </div>
        )}

        {mobileView === "list" ? (
          <div className="px-4 pt-3 space-y-3">
            {developments.length === 0 && count === 0 ? (
              <EmptyFull adminHomeHref={adminHomeHref} />
            ) : (
              <>
                {/* Desarrollos — misma card oscura que desktop */}
                {developments.map((dev) => (
                  <DevelopmentMediumCard key={dev.id} dev={dev} />
                ))}
                {/* Propiedades */}
                {properties.map((p) => <MediumCard key={p.id} prop={p} />)}
              </>
            )}
          </div>
        ) : (
          <div className="relative mx-4 mt-3 h-[calc(100vh-160px)] min-h-[450px] rounded-3xl overflow-hidden border border-slate-200 shadow-soft">
            <PropertyMap filters={filters} mapClassName={MAP_EMBEDDED} />
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30">
              <button
                onClick={() => setMobileView("list")}
                className="flex items-center gap-2 rounded-full bg-slate-950 text-white px-5 py-2.5 text-xs font-bold shadow-xl border border-slate-800 active:scale-95 transition-transform"
              >
                <List className="h-4 w-4 text-brand-400" /> Ver Listado
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP MODES
      ══════════════════════════════════════════════════════════════ */}

      {/* ── LIST MODE: horizontal filter bar + full-width card grid ── */}
      {viewMode === "list" && (
        <div className="hidden lg:flex flex-col px-6 pb-10 gap-4">
          {/* Horizontal filter bar */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3.5">
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">{filtersBar}</div>
              {moreFiltersBtn}
            </div>
          </div>
          {/* Desarrollos Interactivos Grid */}
          {developments.length > 0 && (
            <div className="mb-8 border-b border-slate-100 pb-8">
              <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-1.5">
                <Compass className="h-5 w-5 text-blue-600 animate-spin-slow" /> Desarrollos & Loteos Interactivos
              </h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {developments.map((dev) => (
                  <DevelopmentFullCard key={dev.id} dev={dev} />
                ))}
              </div>
            </div>
          )}

          {/* Full-width grid */}
          {count > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {properties.map((p) => <FullCard key={p.id} prop={p} />)}
            </div>
          ) : <EmptyFull adminHomeHref={adminHomeHref} />}
        </div>
      )}

      {/* ── HYBRID MODE: filter bar top + list panel (38%) + map (62%) ── */}
      {viewMode === "hybrid" && (
        <div className="hidden lg:flex flex-col px-6 pb-6 gap-3">
          {/* Horizontal filter bar — stays at top */}
          <div className="shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3.5">
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">{filtersBar}</div>
              {moreFiltersBtn}
            </div>
          </div>
          {/* Content area — fixed height, separated scroll */}
          <div className={`flex gap-4 overflow-hidden ${CONTENT_H}`}>
            {/* Left: scrollable list panel */}
            <div className="w-[36%] h-full overflow-y-auto flex flex-col gap-2.5 pr-1 shrink-0">
              <p className="shrink-0 text-xs font-semibold text-slate-500 px-0.5">
                <strong className="text-slate-900">{count}</strong> propiedades encontradas
              </p>
              
              {/* Developments in Hybrid Sidebar */}
              {developments.map((dev) => (
                <DevelopmentMediumCard key={dev.id} dev={dev} />
              ))}

              {count > 0
                ? properties.map((p) => <MediumCard key={p.id} prop={p} />)
                : <EmptyPanel />}
            </div>
            {/* Right: stable map — no scroll, fills height */}
            <div className="flex-1 h-full rounded-3xl overflow-hidden border border-slate-200 shadow-soft shrink-0">
              <PropertyMap filters={filters} mapClassName={MAP_EMBEDDED} />
            </div>
          </div>
        </div>
      )}

      {/* ── MAP MODE: filter bar top + full-viewport map ── */}
      {viewMode === "map" && (
        <div className="hidden lg:flex flex-col px-6 pb-6 gap-3">
          {/* Horizontal filter bar — stays at top */}
          <div className="shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3.5">
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">{filtersBar}</div>
              {moreFiltersBtn}
            </div>
          </div>
          {/* Full-height map */}
          <div className={`relative rounded-3xl overflow-hidden border border-slate-200 shadow-soft ${CONTENT_H}`}>
            <PropertyMap filters={filters} mapClassName={MAP_EMBEDDED} />

            {/* Overlay: result count */}
            <div className="absolute top-4 left-4 z-30">
              <span className="rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg">
                {count} {count === 1 ? "resultado" : "resultados"}
              </span>
            </div>

            {/* Overlay bottom: navigation buttons */}
            <div className="absolute bottom-5 inset-x-5 z-30 flex items-center justify-between">
              <button
                onClick={() => setViewMode("hybrid")}
                className="flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-800 shadow-lg hover:bg-white transition"
              >
                <Columns className="h-3.5 w-3.5" /> Vista híbrida
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-800 shadow-lg hover:bg-white transition"
              >
                <List className="h-3.5 w-3.5" /> Ver listado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
