"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Compass, Map, List, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PropertyMap = dynamic(() => import("./property-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-slate-100 rounded-[2rem] flex items-center justify-center border border-slate-200">
      <div className="flex flex-col items-center gap-2 text-slate-500">
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

export function PublicMapWrapper({ filters, children }: PublicMapWrapperProps) {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
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
    <div className="relative w-full">
      {/* Mobile view toggle button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden">
        <Button
          onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
          className="rounded-full bg-slate-950 text-white font-semibold text-xs uppercase tracking-wider px-5 py-3 shadow-xl hover:bg-slate-900 border border-slate-800 flex items-center gap-2 transition-all active:scale-95"
        >
          {viewMode === "list" ? (
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

      {/* Dual Layout Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: List grid */}
        <div
          className={`lg:col-span-7 transition-all duration-300 ${
            viewMode === "map" ? "hidden lg:block" : "block"
          }`}
        >
          {children}
        </div>

        {/* Right Side: Sticky Interactive Map */}
        <div
          className={`lg:col-span-5 lg:sticky lg:top-24 h-[calc(100vh-120px)] min-h-[400px] lg:h-[650px] transition-all duration-300 ${
            viewMode === "list" ? "hidden lg:block" : "block"
          }`}
        >
          <PropertyMap filters={filters} />
        </div>
      </div>
    </div>
  );
}
