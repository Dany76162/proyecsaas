"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { VisualCadToolbar } from "./visual-cad-toolbar";
import { Info } from "lucide-react";

// Load canvas dynamically to avoid SSR errors with Konva
const VisualCadCanvas = dynamic(() => import("./visual-cad-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#070b12] text-slate-500 rounded-xl border border-slate-800">
      <div className="flex flex-col items-center gap-2">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
        <span className="text-xs font-mono tracking-wider text-slate-400">INICIANDO MOTOR VECTORIAL CAD 2D...</span>
      </div>
    </div>
  ),
});

interface VisualCadEditorProps {
  developmentId?: string;
  title?: string;
}

export default function VisualCadEditor({ developmentId, title }: VisualCadEditorProps = {}) {
  const [masterplanSVG, setMasterplanSVG] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!developmentId) return;

    let active = true;
    setLoading(true);
    setError(null);

    // Fetch the real development blueprint SVG content from DB
    fetch(`/api/developments/${developmentId}/blueprint`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el plano base.");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const svg = data?.masterplanSVG ?? data?.svgContent ?? data?.blueprintSvg ?? null;
        setMasterplanSVG(svg);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error fetching blueprint:", err);
        setError(err instanceof Error ? err.message : "Error al cargar plano");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [developmentId]);

  return (
    <div className="flex h-[670px] w-full flex-col gap-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
      {/* Editor Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-black text-slate-100 flex items-center gap-2 tracking-tight">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
              {title ?? "Editor CAD Lotes (Fase 0.2)"}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/20 shadow-sm animate-fade-in">
              <Info className="h-3 w-3" />
              PLANO VIVO (LEMANS)
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Capa base real del plano (solo lectura) con dibujo vectorial CAD en memoria superior.
          </p>
        </div>
        <VisualCadToolbar />
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative flex-1 min-h-0 w-full">
        {error ? (
          <div className="flex h-full w-full items-center justify-center bg-[#070b12] text-red-400 rounded-xl border border-red-950/30">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-mono tracking-wider">⚠️ ERROR AL CARGAR EL PLANO BASE REAL</span>
              <span className="text-[10px] text-slate-500">{error}</span>
            </div>
          </div>
        ) : (
          <VisualCadCanvas masterplanSVG={masterplanSVG} loading={loading} />
        )}
      </div>

      {/* CAD Help Footer */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-t border-slate-800/60 pt-3.5 text-[11px] text-slate-500 shrink-0">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-400">Navegación:</span>
            <span>Rueda del mouse = Zoom | Arrastre de fondo = Paneo (Pan)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-400">Dibujo:</span>
            <span>Haz clic en el lienzo con una herramienta para insertar</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-amber-500/80 bg-amber-950/15 border border-amber-900/30 px-2 py-1 rounded-md text-[10px] font-mono leading-none">
          <span>⚠️ Los cambios realizados se guardan temporalmente en memoria</span>
        </div>
      </div>
    </div>
  );
}
