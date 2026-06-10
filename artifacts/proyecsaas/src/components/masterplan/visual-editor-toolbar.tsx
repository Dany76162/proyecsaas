"use client";

import { MousePointer2, Square, Type, Slash } from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export type VisualEditorTool = "select" | "rect" | "text" | "line";

interface VisualEditorToolbarProps {
  activeTool: VisualEditorTool;
  onToolChange: (tool: VisualEditorTool) => void;
  disabled?: boolean;
  disabledTools?: Partial<Record<VisualEditorTool, string>>;
}

const TOOLS: Array<{
  id: VisualEditorTool;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "select", label: "Seleccionar", icon: MousePointer2 },
  { id: "rect", label: "Rectangulo", icon: Square },
  { id: "text", label: "Etiqueta", icon: Type },
  { id: "line", label: "Línea", icon: Slash },
];

export default function VisualEditorToolbar({
  activeTool,
  onToolChange,
  disabled = false,
  disabledTools = {},
}: VisualEditorToolbarProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/95 p-1 text-slate-100 shadow-xl">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const active = activeTool === tool.id;
        const disabledReason = disabledTools[tool.id];
        const isDisabled = disabled || Boolean(disabledReason);
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onToolChange(tool.id)}
            disabled={isDisabled}
            title={disabledReason ?? tool.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition",
              active
                ? "bg-brand-500 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white",
              isDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-slate-400",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tool.label}
          </button>
        );
      })}
    </div>
  );
}
