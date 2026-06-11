"use client";

import { useCadStore } from "./visual-cad-store";
import type { CadTool } from "./visual-cad-types";
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
  const { activeTool, setActiveTool, resetView, clearAll, shapes } = useCadStore();

  const tools: { id: CadTool; label: string; icon: React.ReactNode }[] = [
    {
      id: "select",
      label: "Seleccionar",
      icon: <MousePointer className="h-4 w-4" />,
    },
    {
      id: "rect",
      label: "Rectángulo",
      icon: <Square className="h-4 w-4" />,
    },
    {
      id: "circle",
      label: "Círculo",
      icon: <CircleIcon className="h-4 w-4" />,
    },
    {
      id: "line",
      label: "Línea",
      icon: <Minus className="h-4 w-4" />,
    },
    {
      id: "text",
      label: "Texto",
      icon: <Type className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 p-2 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
              activeTool === tool.id
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={resetView}
          title="Restablecer Vista"
          className="flex h-8 px-2 items-center gap-1 rounded text-xs text-slate-400 transition-colors hover:bg-slate-900 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>

        <button
          type="button"
          onClick={clearAll}
          title="Borrar Todo"
          disabled={shapes.length === 0}
          className="flex h-8 px-2 items-center gap-1 rounded text-xs text-red-400 transition-colors hover:bg-red-950/30 hover:text-red-300 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Limpiar</span>
        </button>
      </div>

      <div className="ml-auto text-[10px] text-slate-500 pr-1">
        {shapes.length} {shapes.length === 1 ? "objeto" : "objetos"}
      </div>
    </div>
  );
}
