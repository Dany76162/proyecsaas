// src/components/masterplan/visual-pro-toolbar.tsx
"use client";

import { cn } from "@/lib/utils";
import { VISUAL_TOOL_PRESETS } from "@/lib/visual-object-presets";
import type { ComponentType } from "react";

export interface VisualProToolbarProps {
  activeTool: string; // preset id or technical tool id
  onToolChange: (toolId: string) => void;
  disabled?: boolean;
}

export default function VisualProToolbar({
  activeTool,
  onToolChange,
  disabled = false,
}: VisualProToolbarProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/95 p-1 text-slate-100 shadow-xl">
      {Object.values(VISUAL_TOOL_PRESETS).map((preset) => {
        const Icon = preset.icon as ComponentType<{ className?: string }>;
        const isActive = activeTool === preset.id;
        const isDisabled = disabled;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onToolChange(preset.id)}
            disabled={isDisabled}
            title={preset.label}
            aria-label={preset.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-black transition",
              isActive ? "bg-brand-500 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white",
              isDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-slate-400",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
