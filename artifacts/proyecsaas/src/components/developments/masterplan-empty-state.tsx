import * as React from "react";
import { Map, UploadCloud, FileImage, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MasterplanEmptyStateProps {
  onUploadClick?: () => void;
  isAdmin?: boolean;
  className?: string;
}

export function MasterplanEmptyState({
  onUploadClick,
  isAdmin = false,
  className,
}: MasterplanEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 md:p-16 bg-white border border-dashed border-slate-200 rounded-2xl shadow-sm text-center ${className || ""}`}>
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-6">
        <Map className="h-8 w-8 stroke-[1.2] text-slate-500" />
        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-800 leading-tight mb-2">
        Sin Masterplan Cargado
      </h3>
      
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
        {isAdmin 
          ? "Este desarrollo no cuenta con un plano interactivo. Subí el plano SVG del loteo para habilitar la navegación interactiva y el control de disponibilidad de los lotes."
          : "Este desarrollo no tiene cargado un plano interactivo en este momento. Podés revisar la lista de lotes abajo o consultar con un agente."}
      </p>

      {isAdmin && onUploadClick && (
        <Button 
          onClick={onUploadClick}
          className="gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs px-5 h-9 rounded-lg shadow-sm"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Subir Masterplan (SVG / Imagen)</span>
        </Button>
      )}
    </div>
  );
}
