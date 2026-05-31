"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass, Sparkles, MapPin, X, AlertCircle } from "lucide-react";

type MarkerData = {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  operation: string;
  propertyType: string;
  url: string;
  imageUrl: string | null;
  hasTour360: boolean;
  approximate: boolean;
  lat: number;
  lng: number;
  locationLabel: string;
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
};

const MAP_STYLE_DEFAULT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export default function PropertyMap({ filters, onBoundsChange }: PropertyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const circlesRef = useRef<any[]>([]); // To clean up visual approximate zones

  const [markersData, setMarkersData] = useState<MarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mapStyleUrl = process.env.NEXT_PUBLIC_PROPERTY_MAP_STYLE_URL || MAP_STYLE_DEFAULT;

  // 1. Fetch markers based on active filters & bounds
  const fetchMarkers = async (boundsStr?: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const queryParams = new URLSearchParams();
      if (filters.operation) queryParams.set("operation", filters.operation);
      if (filters.type) queryParams.set("type", filters.type);
      if (filters.minPrice) queryParams.set("minPrice", filters.minPrice);
      if (filters.maxPrice) queryParams.set("maxPrice", filters.maxPrice);
      if (filters.bedrooms) queryParams.set("bedrooms", filters.bedrooms);
      if (filters.bathrooms) queryParams.set("bathrooms", filters.bathrooms);
      if (filters.tour360) queryParams.set("tour360", filters.tour360);
      if (filters.orgSlug) queryParams.set("orgSlug", filters.orgSlug);
      if (boundsStr) queryParams.set("bounds", boundsStr);

      const res = await fetch(`/api/public/properties/map?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error("Error al consultar el mapa de propiedades.");
      }

      const data = await res.json();
      setMarkersData(data);
    } catch (err: any) {
      console.error("[PropertyMap] Fetch error:", err);
      setErrorMsg(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      setErrorMsg(null);
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyleUrl,
        center: [-58.44, -34.58], // CABA/Palermo center coordinates default
        zoom: 12,
        maxZoom: 18,
        minZoom: 4,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      // Handle viewport movement with a gentle debounce
      let moveTimeout: NodeJS.Timeout;
      const handleMapMove = () => {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          const boundsStr = `${sw.lng.toFixed(6)},${sw.lat.toFixed(6)},${ne.lng.toFixed(6)},${ne.lat.toFixed(6)}`;
          
          if (onBoundsChange) {
            onBoundsChange(boundsStr);
          }
          fetchMarkers(boundsStr);
        }, 500);
      };

      map.on("dragend", handleMapMove);
      map.on("zoomend", handleMapMove);

      map.on("load", () => {
        handleMapMove();
      });

      mapInstanceRef.current = map;
    } catch (err: any) {
      console.error("[PropertyMap] Initialization error:", err);
      setErrorMsg("No se pudo cargar el proveedor de mapas. Verificá la configuración.");
      setLoading(false);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapStyleUrl]);

  // 3. React to updates on filters
  useEffect(() => {
    if (mapInstanceRef.current && mapInstanceRef.current.loaded()) {
      const bounds = mapInstanceRef.current.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const boundsStr = `${sw.lng.toFixed(6)},${sw.lat.toFixed(6)},${ne.lng.toFixed(6)},${ne.lat.toFixed(6)}`;
      fetchMarkers(boundsStr);
    } else {
      fetchMarkers();
    }
  }, [filters]);

  // 4. Update markers & popups in the view
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear circles / sources
    circlesRef.current.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });
    circlesRef.current = [];

    markersData.forEach((marker) => {
      const el = document.createElement("div");
      el.className = "cursor-pointer group relative flex items-center justify-center";

      if (marker.approximate) {
        // Approximate zone: rendered as a distinct visual glow pin or clean circle indicator
        el.innerHTML = `
          <div class="h-7 w-7 rounded-full bg-brand-500/20 border-2 border-brand-500 flex items-center justify-center animate-pulse shadow-lg transition-transform group-hover:scale-110">
            <div class="h-2.5 w-2.5 rounded-full bg-brand-600"></div>
          </div>
        `;
      } else {
        // Exact pin
        el.innerHTML = `
          <div class="h-9 w-9 rounded-full bg-slate-950 border-2 border-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
            <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        `;
      }

      // Premium visual styling popup card with vanilla tailwind CSS matching Raices Pilot DS
      const popupHtml = `
        <div class="w-64 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl font-sans text-slate-900">
          ${
            marker.imageUrl
              ? `<div class="relative aspect-[16/10] bg-slate-100">
                   <img src="${marker.imageUrl}" alt="${marker.title}" class="h-full w-full object-cover" />
                   ${
                     marker.hasTour360
                       ? `<span class="absolute bottom-2 right-2 rounded-full bg-brand-500 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-white flex items-center gap-1 shadow">
                            <svg class="h-3 w-3 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"></path>
                            </svg>
                            Tour 360°
                          </span>`
                       : ""
                   }
                 </div>`
              : `<div class="aspect-[16/10] bg-slate-100 flex items-center justify-center text-slate-400">Sin Imagen</div>`
          }
          <div class="p-4">
            <h4 class="font-bold text-sm text-slate-900 line-clamp-1 leading-tight mb-1">${marker.title}</h4>
            <p class="text-xs font-semibold text-slate-400 mb-2">${marker.approximate ? "Zona aproximada" : marker.locationLabel}</p>
            <div class="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
              <span class="text-sm font-extrabold text-slate-950">${
                marker.price != null
                  ? `${marker.currency} ${marker.price.toLocaleString("es-AR")}`
                  : "A consultar"
              }</span>
              <a href="${marker.url}" class="rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slate-800 transition">Ver ficha</a>
            </div>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupHtml);

      const m = new maplibregl.Marker({ element: el })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(m);
    });
  }, [markersData]);

  return (
    <div className="relative w-full h-full min-h-[350px] lg:min-h-[500px] bg-slate-50 border border-slate-200 rounded-[2rem] overflow-hidden shadow-soft">
      {/* Mapbox container */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-10" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] z-30 flex items-center justify-center transition-all duration-300">
          <div className="rounded-full bg-slate-950 text-white px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-lg border border-slate-800">
            <Compass className="h-4 w-4 animate-spin text-brand-400" />
            <span>Cargando propiedades...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {errorMsg && (
        <div className="absolute inset-x-4 top-4 bg-rose-50 border border-rose-200 rounded-2xl p-3 z-30 flex items-start gap-2.5 shadow-md">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold text-rose-900 leading-tight">Error del Mapa</h5>
            <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !errorMsg && markersData.length === 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 text-white border border-slate-800 rounded-2xl p-4 z-20 shadow-lg flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4 text-brand-400" />
          </div>
          <div>
            <p className="text-xs font-semibold">Sin coincidencias espaciales</p>
            <p className="text-[10px] text-slate-400">No hay propiedades con ubicación cargada en esta zona del mapa.</p>
          </div>
        </div>
      )}
    </div>
  );
}
