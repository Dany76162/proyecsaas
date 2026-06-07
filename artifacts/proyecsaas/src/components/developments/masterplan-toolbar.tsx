import * as React from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Filter, 
  LayoutGrid, 
  List, 
  Settings, 
  Map 
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MasterplanToolbarProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  showLabels?: boolean;
  onToggleLabels?: (show: boolean) => void;
  viewMode?: "map" | "list";
  onViewModeChange?: (mode: "map" | "list") => void;
  isAdmin?: boolean;
  onEditModeToggle?: () => void;
  isEditing?: boolean;
  className?: string;
}

export function MasterplanToolbar({
  onZoomIn,
  onZoomOut,
  onZoomReset,
  showLabels = true,
  onToggleLabels,
  viewMode = "map",
  onViewModeChange,
  isAdmin = false,
  onEditModeToggle,
  isEditing = false,
  className,
}: MasterplanToolbarProps) {
  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm ${className || ""}`}>
      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          onClick={onZoomIn}
          title="Acercar (Zoom In)"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          onClick={onZoomOut}
          title="Alejar (Zoom Out)"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          onClick={onZoomReset}
          title="Restablecer vista"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Visibility and View Toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        {onToggleLabels && (
          <Button
            variant="outline"
            size="sm"
            className={`h-8 gap-1.5 text-xs font-medium px-3 transition-colors ${
              showLabels 
                ? "bg-slate-50 text-slate-700 border-slate-300" 
                : "text-slate-400 border-slate-200"
            }`}
            onClick={() => onToggleLabels(!showLabels)}
          >
            {showLabels ? (
              <>
                <Eye className="h-3.5 w-3.5 text-brand-600" />
                <span>Etiquetas visibles</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Etiquetas ocultas</span>
              </>
            )}
          </Button>
        )}

        {onViewModeChange && (
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
            <button
              onClick={() => onViewModeChange("map")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "map"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Vista de Masterplan"
            >
              <Map className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Mapa / Plano</span>
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Vista de Listado"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Tabla / Listado</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Actions / Toolbar controls */}
      {isAdmin && onEditModeToggle && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onEditModeToggle}
            className={`h-8 gap-1.5 text-xs font-medium transition-all ${
              isEditing
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            <Settings className="h-3.5 w-3.5 animate-spin-slow" />
            <span>{isEditing ? "Salir de Edición" : "Editar Polígonos"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
