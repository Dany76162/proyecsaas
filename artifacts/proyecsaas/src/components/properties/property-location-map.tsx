"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Compass, AlertCircle } from "lucide-react";

type PropertyLocationMapProps = {
  property: {
    id: string;
    title: string;
    latitude?: number | null;
    longitude?: number | null;
    approximate?: boolean;
    locationLabel: string;
  };
};

const MAP_STYLE_DEFAULT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Deterministic math offset to match the public markers map
function getDeterministicOffset(id: string): { offsetLat: number; offsetLng: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const angle = Math.abs(hash % 360) * (Math.PI / 180);
  const distanceMeters = 100 + (Math.abs(hash >> 8) % 150);
  const offsetLat = (distanceMeters * Math.cos(angle)) / 111111;
  const offsetLng = (distanceMeters * Math.sin(angle)) / (111111 * Math.cos(-34.6 * Math.PI / 180));
  return { offsetLat, offsetLng };
}

export function PropertyLocationMap({ property }: PropertyLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const enableMap = process.env.NEXT_PUBLIC_ENABLE_PROPERTY_MAP !== "false";
  const mapStyleUrl = process.env.NEXT_PUBLIC_PROPERTY_MAP_STYLE_URL || MAP_STYLE_DEFAULT;

  // Extract coordinates defensively
  const rawLat = Number(property.latitude);
  const rawLng = Number(property.longitude);

  const hasCoords = Number.isFinite(rawLat) && Number.isFinite(rawLng) && rawLat !== 0 && rawLng !== 0;

  // If not enabled or no coordinates, show fallback directly
  const shouldRenderMap = enableMap && hasCoords;

  // Calculate final coordinates based on approximate flag
  let lat = rawLat;
  let lng = rawLng;
  const approximate = property.approximate ?? true; // Default to true for conservative privacy on legacy production DB

  if (hasCoords && approximate) {
    const { offsetLat, offsetLng } = getDeterministicOffset(property.id);
    lat = Number((rawLat + offsetLat).toFixed(6));
    lng = Number((rawLng + offsetLng).toFixed(6));
  }

  useEffect(() => {
    if (!shouldRenderMap || !mapContainerRef.current) {
      setLoading(false);
      return;
    }

    try {
      setErrorMsg(null);
      setLoading(true);

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyleUrl,
        center: [lng, lat],
        zoom: approximate ? 14 : 15,
        maxZoom: 18,
        minZoom: 4,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        setLoading(false);

        const el = document.createElement("div");
        el.className = "cursor-pointer group flex items-center justify-center";

        if (approximate) {
          // Approximate zone: visual pulser ring
          el.innerHTML = `
            <div class="h-10 w-10 rounded-full bg-brand-500/20 border-2 border-brand-500 flex items-center justify-center animate-pulse shadow-lg">
              <div class="h-3 w-3 rounded-full bg-brand-600"></div>
            </div>
          `;
        } else {
          // Exact pin
          el.innerHTML = `
            <div class="h-9 w-9 rounded-full bg-slate-950 border-2 border-white flex items-center justify-center shadow-lg">
              <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          `;
        }

        new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      });

      mapInstanceRef.current = map;
    } catch (err: any) {
      console.error("[PropertyLocationMap] Init error:", err);
      setErrorMsg("No se pudo iniciar el visualizador del mapa.");
      setLoading(false);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [shouldRenderMap, lat, lng, approximate, mapStyleUrl]);

  if (!enableMap) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-bold text-[#0b132b] mb-1">Ubicación</h4>
        <p className="text-xs text-slate-400 font-semibold mb-4">{property.locationLabel}</p>
        <div className="h-48 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center p-4">
          <Compass className="h-8 w-8 text-slate-400 mb-2 animate-spin-slow" />
          <p className="text-xs font-bold text-slate-600">Mapa disponible próximamente</p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs">La geolocalización interactiva está siendo configurada para este catálogo.</p>
        </div>
      </div>
    );
  }

  if (!hasCoords) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-bold text-[#0b132b] mb-1">Ubicación</h4>
        <p className="text-xs text-slate-400 font-semibold mb-4">{property.locationLabel}</p>
        <div className="h-48 rounded-2xl bg-slate-50 border border-slate-100/60 flex flex-col items-center justify-center text-center p-4">
          <MapPin className="h-8 w-8 text-slate-400 mb-2" />
          <p className="text-xs font-bold text-slate-650">Ubicación a confirmar</p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Esta propiedad todavía no tiene ubicación cargada en el mapa público.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h4 className="text-base font-bold text-[#0b132b] mb-1">Ubicación</h4>
        <p className="text-xs text-slate-400 font-semibold">{property.locationLabel}</p>
      </div>

      <div className="relative w-full h-[280px] sm:h-[320px] rounded-2xl overflow-hidden border border-slate-150 bg-slate-100 shadow-inner">
        {shouldRenderMap && (
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />
        )}

        {loading && (
          <div className="absolute inset-0 bg-slate-950/10 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <div className="rounded-full bg-slate-950 text-white px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow">
              <Compass className="h-3.5 w-3.5 animate-spin text-brand-400" />
              <span>Cargando mapa...</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="absolute inset-x-4 top-4 bg-rose-50 border border-rose-200 rounded-xl p-3 z-30 flex items-start gap-2.5 shadow">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900 leading-tight">Error</p>
              <p className="text-[10px] text-rose-700 mt-0.5 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

      {approximate && (
        <p className="text-[11px] font-semibold text-slate-450 leading-relaxed text-center bg-slate-50 border border-slate-100/60 rounded-xl p-3">
          ℹ️ La ubicación se muestra de forma aproximada para proteger la privacidad de la operación inmobiliaria.
        </p>
      )}
    </div>
  );
}
