"use client";

import { useCadStore } from "./visual-cad-store";
import type { CadTool, LocalPresetId } from "./visual-cad-types";
import {
  MousePointer,
  Square,
  Circle as CircleIcon,
  Minus,
  Type,
  RotateCcw,
  Trash2,
} from "lucide-react";

export function VisualCadToolbar() {
  const { activeTool, setActiveTool, activePresetId, setActivePresetId, resetView, clearAll, shapes } = useCadStore();

  const tools: { id: CadTool; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: "select",
      label: "Seleccionar",
      icon: <MousePointer className="h-4 w-4" />,
      desc: "Arrastra y transforma figuras (Teclado: V)",
    },
    {
      id: "rect",
      label: "Área / Bloque",
      icon: <Square className="h-4 w-4" />,
      desc: "Dibuja un bloque o área rectangular",
    },
    {
      id: "circle",
      label: "Laguna / Rotonda",
      icon: <CircleIcon className="h-4 w-4" />,
      desc: "Dibuja una laguna, rotonda o área circular",
    },
    {
      id: "line",
      label: "Calle / Línea",
      icon: <Minus className="h-4 w-4" />,
      desc: "Dibuja un trazo lineal para calles o límites",
    },
    {
      id: "text",
      label: "Etiqueta",
      icon: <Type className="h-4 w-4" />,
      desc: "Inserta una etiqueta de texto descriptiva",
    },
  ];

  const presets: { id: LocalPresetId; label: string; dotColor: string }[] = [
    { id: "verde", label: "Área Verde", dotColor: "#10b981" },
    { id: "agua", label: "Laguna", dotColor: "#0ea5e9" },
    { id: "amenity", label: "Amenity", dotColor: "#f97316" },
    { id: "calle", label: "Calle / Lote", dotColor: "#94a3b8" },
    { id: "etiqueta", label: "Etiqueta", dotColor: "#f1f5f9" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-lg">
      {/* CAD Draw Tools Selection */}
      <div className="flex items-center gap-1.5 border-r border-slate-800/80 pr-3">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.label} — ${tool.desc}`}
              className={`group flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-150 ${
                isActive
                  ? "border-blue-500/30 bg-blue-600/20 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                  : "border-slate-800/80 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              {tool.icon}
            </button>
          );
        })}
      </div>

      {/* Local Style Presets Selector (shown when drawing) */}
      {activeTool !== "select" && (
        <div className="flex items-center gap-1.5 border-r border-slate-800/80 pr-3 animate-fade-in">
          <span className="text-[9px] font-bold text-slate-500 mr-1 uppercase">Estilo:</span>
          {presets.map((preset) => {
            const isPresetActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setActivePresetId(preset.id)}
                title={`Aplicar estilo: ${preset.label}`}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all duration-150 ${
                  isPresetActive
                    ? "border-blue-500/30 bg-blue-600/20 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.1)]"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900/80 hover:text-slate-300"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: preset.dotColor }} />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Global Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={resetView}
          title="Centrar y reajustar cámara de dibujo"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 text-xs font-semibold text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reajustar Vista</span>
        </button>

        <button
          type="button"
          onClick={clearAll}
          title="Borrar todos los elementos agregados por el usuario"
          disabled={shapes.length === 0}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-red-950/20 bg-red-950/5 px-3 text-xs font-semibold text-red-400/90 transition-all hover:border-red-900/30 hover:bg-red-950/20 hover:text-red-300 disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Limpiar Capa CAD</span>
        </button>
      </div>

      {/* Objects Count badge */}
      <div className="ml-2 hidden items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 border border-slate-800/60 md:flex">
        <span>USUARIO:</span>
        <span className="text-slate-300">{shapes.length}</span>
      </div>
    </div>
  );
}
