"use client";

import { useState } from "react";
import { MapPin, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

type CoordinatesFieldsProps = {
  initialLatitude: string | null;
  initialLongitude: string | null;
  initialShowExactLocation: boolean;
};

export function CoordinatesFields({
  initialLatitude,
  initialLongitude,
  initialShowExactLocation,
}: CoordinatesFieldsProps) {
  const [latitude, setLatitude] = useState(initialLatitude ?? "");
  const [longitude, setLongitude] = useState(initialLongitude ?? "");
  const [showExactLocation, setShowExactLocation] = useState(initialShowExactLocation);

  const hasCoords = latitude.trim() !== "" && longitude.trim() !== "";
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  
  const isLatValid = latitude.trim() === "" || (!isNaN(latNum) && latNum >= -90 && latNum <= 90);
  const isLngValid = longitude.trim() === "" || (!isNaN(lngNum) && lngNum >= -180 && lngNum <= 180);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="property-latitude">
            Latitud
          </label>
          <input
            id="property-latitude"
            name="latitude"
            type="text"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="Ej. -34.588400"
            className={`w-full rounded-xl border ${
              !isLatValid ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
            } bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-1`}
          />
          {!isLatValid && (
            <p className="mt-1.5 text-xs text-red-600 font-semibold">La latitud debe ser un decimal entre -90 y 90.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="property-longitude">
            Longitud
          </label>
          <input
            id="property-longitude"
            name="longitude"
            type="text"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="Ej. -58.430100"
            className={`w-full rounded-xl border ${
              !isLngValid ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
            } bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-1`}
          />
          {!isLngValid && (
            <p className="mt-1.5 text-xs text-red-600 font-semibold">La longitud debe ser un decimal entre -180 y 180.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 text-sm text-slate-700 transition hover:bg-slate-50 flex-1 min-w-[240px]">
          <input
            name="showExactLocation"
            type="checkbox"
            checked={showExactLocation}
            onChange={(e) => setShowExactLocation(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 accent-brand-500"
          />
          <div>
            <span className="font-semibold text-slate-800">Mostrar ubicación exacta en el mapa público</span>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Si se desmarca, se mostrará un círculo de zona difusa en lugar del pin exacto.
            </p>
          </div>
        </label>

        {hasCoords && (
          <button
            type="button"
            onClick={() => {
              setLatitude("");
              setLongitude("");
            }}
            className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-4 py-3.5 text-xs font-bold text-rose-700 transition-all shadow-sm active:scale-[0.98]"
          >
            Limpiar coordenadas
          </button>
        )}
      </div>

      {/* Indicaciones visuales y de estado */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3 shadow-inner">
        <div className="flex items-start gap-2.5 text-xs">
          {hasCoords ? (
            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>Coordenadas cargadas</span>
            </div>
          ) : (
            <div className="flex items-start gap-1.5 font-semibold text-amber-700 leading-relaxed">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
              <span>Esta propiedad aparecerá en listados, pero no en el mapa hasta cargar ubicación.</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-500 border-t border-slate-200/50 pt-3">
          <Info className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            {showExactLocation
              ? "La ubicación pública podrá mostrarse de forma exacta."
              : "La ubicación pública se mostrará de forma aproximada."}
          </span>
        </div>
      </div>
    </div>
  );
}
