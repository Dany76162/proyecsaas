"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass, AlertCircle, Search, Loader2 } from "lucide-react";

type MarkerData = {
  id: string;
  title: string;
  price?: number | null;
  priceCents?: number | null;
  currency: string;
  operation?: string;
  operationType?: string | null;
  propertyType: string | null;
  url: string;
  imageUrl: string | null;
  hasTour360: boolean;
  approximate: boolean;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  locationLabel: string;
  /** "development" markers link to the public development page instead of a property ficha. */
  markerKind?: "property" | "development";
};

type PropertyMapProps = {
  filters: {
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
  onBoundsChange?: (boundsStr: string) => void;
  /** Override outer container classes. Defaults to the standalone card style. */
  mapClassName?: string;
};

const MAP_STYLE_DEFAULT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const OP_LABEL: Record<string, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY: "Temporario",
  EMPRENDIMIENTO: "Emprendimiento",
};

/** CSS inyectado una sola vez en el head para markers y popups. */
const PMAP_CSS = `
  .pmap-marker { cursor: pointer; }
  .pmap-chip {
    display: inline-flex; align-items: center; gap: 5px;
    height: 26px; padding: 0 9px 0 5px;
    background: #0f172a; color: #fff;
    border: 2px solid #fff; border-radius: 999px;
    font-size: 11px; font-weight: 700; line-height: 1; white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.28);
    transition: transform 0.12s ease, background 0.12s ease;
    position: relative; z-index: 1;
  }
  .pmap-chip:hover { transform: scale(1.1); background: #1e293b; z-index: 5; }
  .pmap-chip--active { background: #4f46e5 !important; border-color: #a5b4fc !important; transform: scale(1.12) !important; z-index: 10 !important; }
  .pmap-chip--consultar { background: #334155; border-color: #cbd5e1; }
  .pmap-chip--consultar:hover { background: #1e293b; }
  .pmap-chip-logo {
    display: inline-flex; align-items: center; justify-content: center;
    width: 16px; height: 16px; flex-shrink: 0;
    background: rgba(255,255,255,0.18); border-radius: 50%;
    font-size: 8px; font-weight: 900; letter-spacing: -0.01em; color: #fff; line-height: 1;
  }
  .pmap-chip--active .pmap-chip-logo { background: rgba(255,255,255,0.28); }
  .pmap-chip--consultar .pmap-chip-logo { background: rgba(255,255,255,0.12); }
  .pmap-chip-type { opacity: 0.75; font-weight: 700; font-size: 10px; }
  .pmap-chip-sep { opacity: 0.4; font-size: 10px; margin: 0 1px; }
  .maplibregl-popup-content { padding: 0 !important; border-radius: 16px !important; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important; border: 1px solid #e2e8f0 !important; }
  .maplibregl-popup-close-button { top: 7px !important; right: 7px !important; background: rgba(255,255,255,0.9) !important; border-radius: 50% !important; width: 22px !important; height: 22px !important; font-size: 15px !important; line-height: 21px !important; color: #334155 !important; border: 1px solid #e2e8f0 !important; z-index: 10; }
  .pmap-popup { width: 240px; font-family: -apple-system, system-ui, sans-serif; color: #0f172a; }
  .pmap-popup-img-wrap { position: relative; height: 130px; background: #f1f5f9; overflow: hidden; }
  .pmap-popup-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pmap-popup-no-img { height: 44px; background: #f8fafc; display: flex; align-items: flex-end; padding: 8px; gap: 4px; }
  .pmap-popup-badge { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 7px; border-radius: 999px; color: #fff; line-height: 1.3; }
  .pmap-popup-badge--360 { position: absolute; bottom: 8px; right: 8px; background: #4f46e5; }
  .pmap-popup-badge--op { position: absolute; top: 8px; left: 8px; background: rgba(15,23,42,0.82); backdrop-filter: blur(4px); }
  .pmap-popup-badge--op-inline { position: static; background: #0f172a; }
  .pmap-popup-body { padding: 11px 12px 12px; }
  .pmap-popup-type { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: #94a3b8; margin: 0 0 3px; }
  .pmap-popup-title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 3px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .pmap-popup-loc { font-size: 11px; color: #64748b; margin: 0 0 9px; }
  .pmap-popup-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 9px; border-top: 1px solid #f1f5f9; gap: 8px; }
  .pmap-popup-price { font-size: 14px; font-weight: 800; color: #0f172a; white-space: nowrap; flex-shrink: 0; }
  .pmap-popup-cta { background: #0f172a; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 10px; border-radius: 8px; text-decoration: none; white-space: nowrap; }
  .pmap-popup-cta:hover { background: #1e293b; }
`;

const TYPE_LABELS: Record<string, string> = {
  departamento: "Depto",
  apartment:    "Depto",
  depto:        "Depto",
  casa:         "Casa",
  house:        "Casa",
  lote:         "Lote",
  terreno:      "Lote",
  land:         "Lote",
  local:        "Local",
  oficina:      "Ofic.",
  office:       "Ofic.",
  loft:         "Loft",
  ph:           "PH",
  emprendimiento: "Empr.",
  development:  "Empr.",
};

const TYPE_FULL_LABELS: Record<string, string> = {
  departamento:   "Departamento",
  apartment:      "Departamento",
  depto:          "Departamento",
  casa:           "Casa",
  house:          "Casa",
  lote:           "Lote",
  terreno:        "Lote",
  land:           "Lote",
  local:          "Local",
  oficina:        "Oficina",
  office:         "Oficina",
  loft:           "Loft",
  ph:             "PH",
  emprendimiento: "Emprendimiento",
  development:    "Emprendimiento",
};

/** Tipo completo para el popup: "Departamento", "Oficina", etc. Devuelve null si no reconocido. */
function formatTypeFullLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  const key = type.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return TYPE_FULL_LABELS[key] ?? null;
}

/** Tipo compacto para el chip: "Depto", "Casa", etc. Devuelve null si no reconocido. */
function formatTypeLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  const key = type.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return TYPE_LABELS[key] ?? null;
}

/** Precio compacto para el chip del marker: "USD 120K", "ARS 2,5M", "Consultar". */
function formatChipPrice(priceCents: number | null | undefined, currency: string): string {
  if (priceCents == null) return "Consultar";
  const v = priceCents / 100;
  const cur = /^[A-Z]{3}$/.test((currency ?? "").trim().toUpperCase())
    ? currency.trim().toUpperCase()
    : "USD";
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${cur} ${m % 1 === 0 ? m : parseFloat(m.toFixed(1))}M`;
  }
  if (v >= 1_000) {
    const k = Math.round(v / 1_000);
    if (k >= 1_000) {
      // Ej: 999.500 → round(999.5K) = 1000K → mostrar como 1M
      const m = v / 1_000_000;
      return `${cur} ${m % 1 === 0 ? m : parseFloat(m.toFixed(1))}M`;
    }
    return `${cur} ${k}K`;
  }
  return `${cur} ${v.toLocaleString("es-AR")}`;
}

/** Precio formateado para el popup: "USD 120.000", "A consultar". */
function formatFullPrice(priceCents: number | null | undefined, currency: string): string {
  if (priceCents == null) return "A consultar";
  const cur = /^[A-Z]{3}$/.test((currency ?? "").trim().toUpperCase())
    ? currency.trim().toUpperCase()
    : "USD";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

/** Normaliza a centavos desde priceCents o desde price (monto entero). */
function normalizeToCents(marker: MarkerData): number | null {
  if (marker.priceCents != null) return marker.priceCents;
  if (marker.price != null) return Math.round(marker.price * 100);
  return null;
}

export default function PropertyMap({ filters, onBoundsChange, mapClassName }: PropertyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const activeMarkerRef = useRef<string | null>(null);
  // fetchRef mantiene la función de fetch actualizada sin re-inicializar el mapa
  const fetchRef = useRef<(boundsStr?: string, isInitial?: boolean) => void>(null!);
  const hasMapLoadedRef = useRef(false);

  const [markersData, setMarkersData] = useState<MarkerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);    // overlay de primera carga
  const [isUpdating, setIsUpdating] = useState(false); // indicador sutil en actualizaciones
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingBounds, setPendingBounds] = useState<string | null>(null);

  const mapStyleUrl = process.env.NEXT_PUBLIC_PROPERTY_MAP_STYLE_URL || MAP_STYLE_DEFAULT;

  // Inyectar CSS de markers/popup una sola vez en el head
  useEffect(() => {
    const id = "pmap-global-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = PMAP_CSS;
      document.head.appendChild(s);
    }
  }, []);

  // Función de fetch — se mantiene actualizada vía fetchRef para evitar stale closures
  const doFetch = (boundsStr?: string, isInitial = false) => {
    const q = new URLSearchParams();
    if (filters.operation) q.set("operation", filters.operation);
    if (filters.type)      q.set("type",      filters.type);
    if (filters.minPrice)  q.set("minPrice",  filters.minPrice);
    if (filters.maxPrice)  q.set("maxPrice",  filters.maxPrice);
    if (filters.bedrooms)  q.set("bedrooms",  filters.bedrooms);
    if (filters.bathrooms) q.set("bathrooms", filters.bathrooms);
    if (filters.tour360)   q.set("tour360",   filters.tour360);
    if (filters.orgSlug)   q.set("orgSlug",   filters.orgSlug);
    if (boundsStr)         q.set("bounds",    boundsStr);

    if (isInitial) { setIsLoading(true); setIsUpdating(false); }
    else           { setIsUpdating(true); }
    setErrorMsg(null);

    fetch(`/api/public/properties/map?${q.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al consultar el mapa de propiedades.");
        return res.json();
      })
      .then((data) => {
        setMarkersData(Array.isArray(data) ? data : []);
        setPendingBounds(null);
      })
      .catch((err: any) => {
        console.error("[PropertyMap]", err);
        setErrorMsg(err?.message || "Error al conectar con el servidor.");
      })
      .finally(() => {
        setIsLoading(false);
        setIsUpdating(false);
      });
  };
  // Mantener la ref actualizada en cada render
  fetchRef.current = doFetch;

  // Inicializar MapLibre (solo cuando cambia el style URL)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    setErrorMsg(null);

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyleUrl,
        center: [-58.44, -34.58],
        zoom: 12,
        maxZoom: 18,
        minZoom: 4,
      });
    } catch (err: any) {
      console.error("[PropertyMap] Initialization error:", err);
      setErrorMsg("No se pudo cargar el proveedor de mapas. Verificá la configuración.");
      setIsLoading(false);
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const getBoundsStr = (): string => {
      const b = map.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      return `${sw.lng.toFixed(6)},${sw.lat.toFixed(6)},${ne.lng.toFixed(6)},${ne.lat.toFixed(6)}`;
    };

    // Carga inicial al terminar de cargar el mapa
    map.on("load", () => {
      hasMapLoadedRef.current = true;
      const boundsStr = getBoundsStr();
      if (onBoundsChange) onBoundsChange(boundsStr);
      fetchRef.current(boundsStr, true);
    });

    // Al mover/hacer zoom: mostrar botón "Buscar en esta zona" en lugar de auto-fetch
    let moveTimeout: ReturnType<typeof setTimeout>;
    const onMoveEnd = () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        const boundsStr = getBoundsStr();
        if (onBoundsChange) onBoundsChange(boundsStr);
        setPendingBounds(boundsStr);
      }, 400);
    };

    map.on("dragend", onMoveEnd);
    map.on("zoomend", onMoveEnd);

    mapInstanceRef.current = map;

    return () => {
      clearTimeout(moveTimeout);
      map.remove();
      mapInstanceRef.current = null;
      hasMapLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyleUrl]);

  // Re-fetch inmediato al cambiar filtros (intención explícita del usuario)
  useEffect(() => {
    if (!hasMapLoadedRef.current) return; // saltar hasta que el mapa esté listo
    const map = mapInstanceRef.current;
    let boundsStr: string | undefined;
    if (map) {
      const b = map.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      boundsStr = `${sw.lng.toFixed(6)},${sw.lat.toFixed(6)},${ne.lng.toFixed(6)},${ne.lat.toFixed(6)}`;
    }
    fetchRef.current(boundsStr, false);
    setPendingBounds(null);
  }, [filters]);

  // Renderizar markers cuando cambian los datos
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Reemplazar markers anteriores
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    activeMarkerRef.current = null;

    markersData.forEach((marker) => {
      const lat = Number(marker.latitude ?? marker.lat);
      const lng = Number(marker.longitude ?? marker.lng);

      if (
        !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180
      ) {
        console.warn("[PropertyMap] Ignorando propiedad con coordenadas inválidas:", marker.id, lat, lng);
        return;
      }

      const priceCents = normalizeToCents(marker);
      const chipLabel = formatChipPrice(priceCents, marker.currency);
      const isConsultar = chipLabel === "Consultar";
      const opLabel = OP_LABEL[marker.operationType ?? marker.operation ?? ""] ?? "";
      const typeLabel = formatTypeFullLabel(marker.propertyType) ?? "";

      // Elemento del marker
      const el = document.createElement("div");
      el.className = "pmap-marker";
      el.dataset.markerId = marker.id;

      const chipEl = document.createElement("div");
      chipEl.className = `pmap-chip${isConsultar ? " pmap-chip--consultar" : ""}`;

      // Insignia de marca (elemento DOM seguro, sin innerHTML dinámico)
      const logoEl = document.createElement("span");
      logoEl.className = "pmap-chip-logo";
      logoEl.textContent = "R";
      chipEl.appendChild(logoEl);

      const typeShort = formatTypeLabel(marker.propertyType);
      if (typeShort) {
        const typeEl = document.createElement("span");
        typeEl.className = "pmap-chip-type";
        typeEl.textContent = typeShort;
        chipEl.appendChild(typeEl);

        const sepEl = document.createElement("span");
        sepEl.className = "pmap-chip-sep";
        sepEl.textContent = "·";
        chipEl.appendChild(sepEl);
      }

      const labelEl = document.createElement("span");
      labelEl.textContent = chipLabel;
      chipEl.appendChild(labelEl);
      el.appendChild(chipEl);

      // HTML del popup
      const hasImg = !!marker.imageUrl;
      const imgSection = hasImg
        ? `<div class="pmap-popup-img-wrap">
             <img src="${marker.imageUrl}" alt="" class="pmap-popup-img" loading="lazy" />
             ${opLabel ? `<span class="pmap-popup-badge pmap-popup-badge--op">${opLabel}</span>` : ""}
             ${marker.hasTour360 ? `<span class="pmap-popup-badge pmap-popup-badge--360">Tour 360°</span>` : ""}
           </div>`
        : `<div class="pmap-popup-no-img">${opLabel ? `<span class="pmap-popup-badge pmap-popup-badge--op-inline">${opLabel}</span>` : ""}</div>`;

      const popupHtml = `
        <div class="pmap-popup">
          ${imgSection}
          <div class="pmap-popup-body">
            ${typeLabel ? `<p class="pmap-popup-type">${typeLabel}</p>` : ""}
            <h4 class="pmap-popup-title">${marker.title}</h4>
            <p class="pmap-popup-loc">${marker.approximate ? "Zona aproximada" : marker.locationLabel}</p>
            <div class="pmap-popup-footer">
              <span class="pmap-popup-price">${formatFullPrice(priceCents, marker.currency)}</span>
              <a href="${marker.url}" class="pmap-popup-cta">${marker.markerKind === "development" ? "Ver lotes" : "Ver ficha"}</a>
            </div>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: "260px" })
        .setHTML(popupHtml);

      // Estado activo al hacer click en el marker
      el.addEventListener("click", () => {
        if (activeMarkerRef.current && activeMarkerRef.current !== marker.id) {
          const prev = document.querySelector(
            `.pmap-marker[data-marker-id="${activeMarkerRef.current}"] .pmap-chip`
          );
          prev?.classList.remove("pmap-chip--active");
        }
        chipEl.classList.add("pmap-chip--active");
        activeMarkerRef.current = marker.id;
      });

      popup.on("close", () => {
        chipEl.classList.remove("pmap-chip--active");
        if (activeMarkerRef.current === marker.id) activeMarkerRef.current = null;
      });

      const m = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(m);
    });
  }, [markersData]);

  return (
    <div
      className={
        mapClassName ??
        "relative w-full h-full min-h-[350px] lg:min-h-[500px] bg-slate-50 border border-slate-200 rounded-[2rem] overflow-hidden shadow-soft"
      }
    >
      {/* Contenedor del mapa */}
      <div ref={mapContainerRef} className="absolute inset-0 z-10 w-full h-full" />

      {/* Overlay de primera carga */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-lg">
            <Compass className="h-4 w-4 animate-spin text-brand-400" />
            Cargando propiedades...
          </div>
        </div>
      )}

      {/* Indicador sutil de actualización (mantiene markers visibles) */}
      {isUpdating && !isLoading && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow backdrop-blur-sm">
            <Loader2 className="h-3 w-3 animate-spin text-brand-400" />
            Actualizando resultados...
          </div>
        </div>
      )}

      {/* Botón "Buscar en esta zona" */}
      {!!pendingBounds && !isUpdating && !isLoading && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2">
          <button
            onClick={() => fetchRef.current(pendingBounds, false)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95"
          >
            <Search className="h-3.5 w-3.5 text-brand-400" />
            Buscar en esta zona
          </button>
        </div>
      )}

      {/* Error */}
      {errorMsg && !isLoading && (
        <div className="absolute inset-x-4 top-4 z-30 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 shadow-md">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <h5 className="text-xs font-bold leading-tight text-rose-900">Error del Mapa</h5>
            <p className="mt-0.5 text-xs text-rose-700">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!isLoading && !isUpdating && !errorMsg && markersData.length === 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-white shadow-lg">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
            <AlertCircle className="h-4 w-4 text-brand-400" />
          </div>
          <div>
            <p className="text-xs font-semibold">Sin coincidencias espaciales</p>
            <p className="text-[10px] text-slate-400">
              No hay propiedades con ubicación cargada en esta zona del mapa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
