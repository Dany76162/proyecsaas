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

/** CSS inyectado una sola vez en el head para pins y popups. */
const PMAP_CSS = `
  @keyframes pmap-pulse {
    0%   { transform: scale(1);   opacity: 0.6; }
    65%  { transform: scale(2.6); opacity: 0;   }
    100% { transform: scale(2.6); opacity: 0;   }
  }

  /* ── Marker container ──────────────────────────────────────────────────── */
  .pmap-marker { cursor: pointer; }

  /* ── Pin wrapper ───────────────────────────────────────────────────────── */
  .pmap-pin {
    display: flex; flex-direction: column; align-items: center;
    position: relative; width: 32px;
  }

  /* ── Pulse halo ring (behind dot) ──────────────────────────────────────── */
  .pmap-pin-pulse {
    position: absolute; top: 0; left: 0;
    width: 32px; height: 32px; border-radius: 50%;
    animation: pmap-pulse 2.2s ease-out infinite;
    pointer-events: none; z-index: 0;
  }
  .pmap-pin--prop .pmap-pin-pulse { background: rgba(30, 41, 59, 0.28); }
  .pmap-pin--dev  .pmap-pin-pulse { background: rgba(15,118,110, 0.38); }

  /* ── Circle dot ────────────────────────────────────────────────────────── */
  .pmap-pin-dot {
    width: 32px; height: 32px; border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,0.95);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 3px 10px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.14);
    transition: transform 0.12s ease, box-shadow 0.12s ease;
    position: relative; z-index: 1;
  }
  .pmap-pin--prop .pmap-pin-dot { background: #1e293b; }
  .pmap-pin--dev  .pmap-pin-dot { background: #0f766e; }
  .pmap-pin-dot:hover { transform: scale(1.1); box-shadow: 0 5px 16px rgba(0,0,0,0.28); }

  /* ── Triangle tip (points down toward coordinate) ──────────────────────── */
  .pmap-pin-tip {
    width: 0; height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    margin-top: -1px; position: relative; z-index: 1;
  }
  .pmap-pin--prop .pmap-pin-tip { border-top: 7px solid #1e293b; }
  .pmap-pin--dev  .pmap-pin-tip { border-top: 7px solid #0f766e; }

  /* ── Active state ──────────────────────────────────────────────────────── */
  .pmap-pin--active .pmap-pin-dot {
    background: #4f46e5 !important;
    transform: scale(1.14) !important;
    box-shadow: 0 4px 16px rgba(79,70,229,0.42) !important;
  }
  .pmap-pin--active .pmap-pin-tip { border-top-color: #4f46e5 !important; }
  .pmap-pin--active .pmap-pin-pulse {
    background: rgba(79,70,229,0.32) !important;
    animation-duration: 1.5s;
  }

  /* ── Popup shell ───────────────────────────────────────────────────────── */
  .maplibregl-popup-content {
    padding: 0 !important; border-radius: 16px !important;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
    border: 1px solid #e2e8f0 !important;
  }
  .maplibregl-popup-close-button {
    top: 7px !important; right: 7px !important;
    background: rgba(255,255,255,0.9) !important;
    border-radius: 50% !important;
    width: 22px !important; height: 22px !important;
    font-size: 15px !important; line-height: 21px !important;
    color: #334155 !important; border: 1px solid #e2e8f0 !important; z-index: 10;
  }

  /* ── Popup content ─────────────────────────────────────────────────────── */
  .pmap-popup { width: 240px; font-family: -apple-system, system-ui, sans-serif; color: #0f172a; }
  .pmap-popup-img-wrap { position: relative; height: 130px; background: #f1f5f9; overflow: hidden; }
  .pmap-popup-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pmap-popup-no-img {
    height: 52px; display: flex; align-items: flex-end; padding: 8px; gap: 4px;
    background: #f8fafc;
  }
  .pmap-popup-no-img--dev {
    background: linear-gradient(135deg, #0f766e 0%, #134e4a 100%);
  }
  .pmap-popup-badge {
    font-size: 9px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.06em; padding: 3px 7px; border-radius: 999px;
    color: #fff; line-height: 1.3;
  }
  .pmap-popup-badge--360  { position: absolute; bottom: 8px; right: 8px; background: #4f46e5; }
  .pmap-popup-badge--op   { position: absolute; top: 8px; left: 8px; background: rgba(15,23,42,0.82); backdrop-filter: blur(4px); }
  .pmap-popup-badge--op-inline  { position: static; background: rgba(255,255,255,0.22); }
  .pmap-popup-badge--dev-inline { position: static; background: rgba(255,255,255,0.22); color: #fff; }
  .pmap-popup-body   { padding: 11px 12px 12px; }
  .pmap-popup-type   { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: #94a3b8; margin: 0 0 3px; }
  .pmap-popup-title  { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 3px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .pmap-popup-loc    { font-size: 11px; color: #64748b; margin: 0 0 9px; }
  .pmap-popup-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 9px; border-top: 1px solid #f1f5f9; gap: 8px; }
  .pmap-popup-price  { font-size: 14px; font-weight: 800; color: #0f172a; white-space: nowrap; flex-shrink: 0; }
  .pmap-popup-cta    { background: #0f172a; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 10px; border-radius: 8px; text-decoration: none; white-space: nowrap; }
  .pmap-popup-cta:hover { background: #1e293b; }
  .pmap-popup-cta--dev  { background: #0f766e; }
  .pmap-popup-cta--dev:hover { background: #0d6b63; }
`;

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

/** Crea el elemento SVG del ícono interno del pin usando DOM API (seguro, sin innerHTML). */
function buildPinIcon(isDevMarker: boolean): SVGSVGElement {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "rgba(255,255,255,0.92)");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  if (isDevMarker) {
    // 2×2 grid icon → represents lots in a development
    ([ ["3","3"], ["13","3"], ["3","13"], ["13","13"] ] as [string,string][]).forEach(([x, y]) => {
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", x); rect.setAttribute("y", y);
      rect.setAttribute("width", "8"); rect.setAttribute("height", "8");
      rect.setAttribute("rx", "1.5");
      svg.appendChild(rect);
    });
  } else {
    // Home icon → property
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z");
    const poly = document.createElementNS(NS, "polyline");
    poly.setAttribute("points", "9,22 9,12 15,12 15,22");
    svg.appendChild(path);
    svg.appendChild(poly);
  }
  return svg;
}

export default function PropertyMap({ filters, onBoundsChange, mapClassName }: PropertyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const activeMarkerRef = useRef<string | null>(null);
  // fetchRef mantiene la función de fetch actualizada sin re-inicializar el mapa
  const fetchRef = useRef<(boundsStr?: string, isInitial?: boolean) => void>(null!);
  const hasMapLoadedRef = useRef(false);
  // Encuadre inicial: ajustar el viewport a TODOS los marcadores (propiedades + desarrollos)
  // una sola vez, cuando llegan los primeros datos. Las búsquedas posteriores
  // ("Buscar en esta zona", cambios de filtro) NO reencuadran para no robarle la vista al usuario.
  const shouldFitInitialRef = useRef(true);

  const [markersData, setMarkersData] = useState<MarkerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);    // overlay de primera carga
  const [isUpdating, setIsUpdating] = useState(false); // indicador sutil en actualizaciones
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingBounds, setPendingBounds] = useState<string | null>(null);

  const mapStyleUrl = process.env.NEXT_PUBLIC_PROPERTY_MAP_STYLE_URL || MAP_STYLE_DEFAULT;

  // Inyectar CSS de pins/popup una sola vez en el head
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

    // Carga inicial al terminar de cargar el mapa.
    // Sin bounds → devuelve todas las properties disponibles globalmente (hasta 200).
    // Esto permite que properties fuera del viewport inicial de BA sean visibles de entrada.
    // Las búsquedas subsiguientes ("Buscar en esta zona") usan bounds normalmente.
    map.on("load", () => {
      hasMapLoadedRef.current = true;
      const boundsStr = getBoundsStr();
      if (onBoundsChange) onBoundsChange(boundsStr);
      fetchRef.current(undefined, true);
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

    // Acumular los límites de TODOS los marcadores válidos (propiedades + desarrollos)
    // para el encuadre inicial.
    const fitBoundsAcc = new maplibregl.LngLatBounds();
    let validMarkerCount = 0;

    markersData.forEach((marker) => {
      const lat = Number(marker.latitude ?? marker.lat);
      const lng = Number(marker.longitude ?? marker.lng);

      if (
        !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180
      ) {
        console.warn("[PropertyMap] Ignorando marker con coordenadas inválidas:", marker.id, lat, lng);
        return;
      }

      fitBoundsAcc.extend([lng, lat]);
      validMarkerCount++;

      const isDevMarker = marker.markerKind === "development";
      const priceCents = normalizeToCents(marker);
      const opLabel = OP_LABEL[marker.operationType ?? marker.operation ?? ""] ?? "";
      const typeLabel = formatTypeFullLabel(marker.propertyType) ?? "";

      // ── Marker element ──────────────────────────────────────────────────
      const el = document.createElement("div");
      el.className = "pmap-marker";
      el.dataset.markerId = marker.id;

      // Pin wrapper
      const pinEl = document.createElement("div");
      pinEl.className = `pmap-pin ${isDevMarker ? "pmap-pin--dev" : "pmap-pin--prop"}`;

      // Halo pulse ring
      const pulseEl = document.createElement("div");
      pulseEl.className = "pmap-pin-pulse";
      pinEl.appendChild(pulseEl);

      // Circle dot with icon
      const dotEl = document.createElement("div");
      dotEl.className = "pmap-pin-dot";
      dotEl.appendChild(buildPinIcon(isDevMarker));
      pinEl.appendChild(dotEl);

      // Triangle tip
      const tipEl = document.createElement("div");
      tipEl.className = "pmap-pin-tip";
      pinEl.appendChild(tipEl);

      el.appendChild(pinEl);

      // ── Popup HTML ──────────────────────────────────────────────────────
      const hasImg = !!marker.imageUrl;
      const imgSection = hasImg
        ? `<div class="pmap-popup-img-wrap">
             <img src="${marker.imageUrl}" alt="" class="pmap-popup-img" loading="lazy" />
             ${opLabel ? `<span class="pmap-popup-badge pmap-popup-badge--op">${opLabel}</span>` : ""}
             ${marker.hasTour360 ? `<span class="pmap-popup-badge pmap-popup-badge--360">Tour 360°</span>` : ""}
           </div>`
        : isDevMarker
          ? `<div class="pmap-popup-no-img pmap-popup-no-img--dev">
               <span class="pmap-popup-badge pmap-popup-badge--dev-inline">Desarrollo</span>
             </div>`
          : `<div class="pmap-popup-no-img">${opLabel ? `<span class="pmap-popup-badge pmap-popup-badge--op-inline">${opLabel}</span>` : ""}</div>`;

      const ctaClass = isDevMarker ? "pmap-popup-cta pmap-popup-cta--dev" : "pmap-popup-cta";
      const ctaLabel = isDevMarker ? "Ver lotes" : "Ver ficha";

      const popupHtml = `
        <div class="pmap-popup">
          ${imgSection}
          <div class="pmap-popup-body">
            ${typeLabel ? `<p class="pmap-popup-type">${typeLabel}</p>` : ""}
            <h4 class="pmap-popup-title">${marker.title}</h4>
            <p class="pmap-popup-loc">${marker.approximate ? "Zona aproximada" : marker.locationLabel}</p>
            <div class="pmap-popup-footer">
              <span class="pmap-popup-price">${formatFullPrice(priceCents, marker.currency)}</span>
              <a href="${marker.url}" class="${ctaClass}">${ctaLabel}</a>
            </div>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: [0, -42], closeButton: true, maxWidth: "260px" })
        .setHTML(popupHtml);

      // Estado activo al hacer click en el marker
      el.addEventListener("click", () => {
        if (activeMarkerRef.current && activeMarkerRef.current !== marker.id) {
          const prev = document.querySelector(
            `.pmap-marker[data-marker-id="${activeMarkerRef.current}"] .pmap-pin`
          );
          prev?.classList.remove("pmap-pin--active");
        }
        pinEl.classList.add("pmap-pin--active");
        activeMarkerRef.current = marker.id;
      });

      popup.on("close", () => {
        pinEl.classList.remove("pmap-pin--active");
        if (activeMarkerRef.current === marker.id) activeMarkerRef.current = null;
      });

      // anchor: "bottom" → el tip del pin apunta exactamente a las coordenadas
      const m = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(m);
    });

    // ── Encuadre inicial ──────────────────────────────────────────────────────
    // Una sola vez, cuando llegan los primeros marcadores, ajustar el viewport para
    // que entren TODOS (propiedades + desarrollos). Sin esto, un desarrollo con
    // ubicación lejana al cluster de propiedades quedaba fuera de la vista inicial
    // y parecía "no aparecer" en el mapa.
    if (shouldFitInitialRef.current && validMarkerCount > 0) {
      shouldFitInitialRef.current = false;
      try {
        map.fitBounds(fitBoundsAcc, {
          padding: 72,
          // Cap de zoom: con un solo marcador (bounds degenerado) evita un acercamiento extremo.
          maxZoom: 14,
          duration: 0,
        });
      } catch (err) {
        console.warn("[PropertyMap] fitBounds inicial falló:", err);
      }
    }
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
