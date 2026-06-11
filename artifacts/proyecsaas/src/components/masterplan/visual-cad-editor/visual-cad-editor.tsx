"use client";

import dynamic from "next/dynamic";
import { VisualCadToolbar } from "./visual-cad-toolbar";

// Load canvas dynamically to avoid SSR errors with Konva
const VisualCadCanvas = dynamic(() => import("./visual-cad-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-500">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
        <span className="text-sm font-medium">Iniciando motor CAD 2D...</span>
      </div>
    </div>
  ),
});

export default function VisualCadEditor() {
  return (
    <div className="flex h-[650px] w-full flex-col gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
      {/* Header and Toolbar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            VisualCadEditor (Fase 0.1)
          </h2>
          <p className="text-xs text-slate-400">
            Prototipo paralelo e independiente con renderizado basado en Konva 2D.
          </p>
        </div>
        <VisualCadToolbar />
      </div>

      {/* Main CAD Stage */}
      <div className="relative flex-1 min-h-0">
        <VisualCadCanvas />
      </div>

      {/* Footer / Help instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-400 border-t border-slate-800/60 pt-3">
        <div>
          <span className="font-semibold text-slate-300">Navegación:</span> Rueda del ratón para hacer Zoom. Con la herramienta <span className="text-blue-400">Seleccionar</span> activa, arrastra el fondo para moverte (Pan).
        </div>
        <div>
          <span className="font-semibold text-slate-300">Edición:</span> Selecciona una herramienta de dibujo de la barra superior y haz clic en el lienzo para colocarla.
        </div>
        <div>
          <span className="font-semibold text-slate-300">Modificación:</span> Activa <span className="text-blue-400">Seleccionar</span>, haz clic en una figura para arrastrarla o transformarla usando los manejadores.
        </div>
      </div>
    </div>
  );
}
