"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Compass, Map, List, HelpCircle, LayoutGrid, Columns, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PropertyMap = dynamic(() => import("./property-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[450px] bg-slate-100 rounded-[2.5rem] flex items-center justify-center border border-slate-200 shadow-inner">
      <div className="flex flex-col items-center gap-2 text-slate-500 animate-pulse">
        <Compass className="h-8 w-8 animate-spin text-brand-500" />
        <span className="text-xs font-semibold">Cargando mapa interactivo...</span>
      </div>
    </div>
  ),
});

type PublicMapWrapperProps = {
  filters: any;
  children: React.ReactNode;
};

type DesktopViewMode = "list" | "hybrid" | "map";

export function PublicMapWrapper({ filters, children }: PublicMapWrapperProps) {
  const [viewMode, setViewMode] = useState<DesktopViewMode>("hybrid");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [hasStyleUrl, setHasStyleUrl] = useState(false);

  const enableMap = process.env.NEXT_PUBLIC_ENABLE_PROPERTY_MAP === "true";
  const styleUrl = process.env.NEXT_PUBLIC_PROPERTY_MAP_STYLE_URL;

  useEffect(() => {
    setHasStyleUrl(!!styleUrl);
  }, [styleUrl]);

  // Case A: Feature flag is disabled or missing
  if (!enableMap) {
    return <>{children}</>;
  }

  // Case B: Feature flag enabled but missing tile configuration / style URL
  if (!hasStyleUrl) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 flex items-start gap-2.5 shadow-sm">
          <HelpCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Vista de mapa simplificada</span>
            <p className="text-[11px] text-amber-700 mt-0.5">
              El mapa interactivo se encuentra inactivo debido a falta de configuración de tiles. Podés continuar explorando el listado sin interrupciones.
            </p>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-6">
      {/* Desktop view switcher (Navy & Glassmorphism Design) */}
      <div className="hidden lg:flex items-center justify-between bg-white border border-slate-200/80 p-3 rounded-2xl shadow-soft">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">
          Modo de visualización
        </span>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/40">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === "list"
                ? "bg-slate-900 text-white shadow-md scale-[1.02]"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <LayoutGrid className="h-4.5 w-4.5" />
            <span>Listado</span>
          </button>
          <button
            onClick={() => setViewMode("hybrid")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === "hybrid"
                ? "bg-slate-900 text-white shadow-md scale-[1.02]"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Columns className="h-4.5 w-4.5" />
            <span>Híbrido (50/50)</span>
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === "map"
                ? "bg-slate-900 text-white shadow-md scale-[1.02]"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Maximize2 className="h-4.5 w-4.5" />
            <span>Mapa Protagonista</span>
          </button>
        </div>
      </div>

      {/* Mobile view toggle button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden">
        <Button
          onClick={() => setMobileView(mobileView === "list" ? "map" : "list")}
          className="rounded-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 shadow-xl border border-slate-800 flex items-center gap-2 transition-all active:scale-95"
        >
          {mobileView === "list" ? (
            <>
              <Map className="h-4 w-4 text-brand-400" />
              <span>Ver Mapa</span>
            </>
          ) : (
            <>
              <List className="h-4 w-4 text-brand-400" />
              <span>Ver Listado</span>
            </>
          )}
        </Button>
      </div>

      {/* Main content grid based on selected view mode */}
      <div className="relative w-full">
        {/* VIEW MODE: ONLY LIST */}
        {viewMode === "list" && (
          <div className={`lg:col-span-12 ${mobileView === "map" ? "hidden" : "block"}`}>
            {children}
          </div>
        )}

        {/* VIEW MODE: HYBRID (50 / 50 split) */}
        {viewMode === "hybrid" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* List side */}
            <div className={`lg:col-span-6 ${mobileView === "map" ? "hidden lg:block" : "block"}`}>
              {children}
            </div>
            {/* Sticky map side */}
            <div
              className={`lg:col-span-6 lg:sticky lg:top-24 h-[calc(100vh-220px)] min-h-[450px] rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-soft ${
                mobileView === "list" ? "hidden lg:block" : "block"
              }`}
            >
              <PropertyMap filters={filters} />
            </div>
          </div>
        )}

        {/* VIEW MODE: MAP PROTAGONIST (33% compact list side / 67% map side) */}
        {viewMode === "map" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Compact List side */}
            <div
              className={`lg:col-span-4 max-h-[calc(100vh-220px)] lg:overflow-y-auto pr-1 lg:scrollbar-thin ${
                mobileView === "map" ? "hidden lg:block" : "block"
              }`}
            >
              {children}
            </div>
            {/* Big Map side */}
            <div
              className={`lg:col-span-8 lg:sticky lg:top-24 h-[calc(100vh-220px)] min-h-[500px] rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-soft ${
                mobileView === "list" ? "hidden lg:block" : "block"
              }`}
            >
              <PropertyMap filters={filters} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
