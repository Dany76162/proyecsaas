import * as React from "react";
import { MapPin, Layers, DollarSign, Activity, Trees, Flame, Shield, Droplets } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type DevelopmentStatus = "PRE_SALE" | "UNDER_CONSTRUCTION" | "DELIVERED";

export interface DevelopmentProject {
  id: string;
  name: string;
  location: string;
  status: DevelopmentStatus;
  totalLots: number;
  availableLots: number;
  priceFrom: number;
  currency: string;
  progressPercent: number; // e.g. percent of development completion or sales
  coverUrl?: string;
  features?: {
    hasSecurity?: boolean;
    hasWater?: boolean;
    hasGas?: boolean;
    hasElectricity?: boolean;
  };
}

export interface DevelopmentCardProps {
  project: DevelopmentProject;
  onClick?: (id: string) => void;
}

const statusLabelMap = {
  PRE_SALE: { label: "En Pozo / Preventa", variant: "brand" as const },
  UNDER_CONSTRUCTION: { label: "En Construcción", variant: "warning" as const },
  DELIVERED: { label: "Listo para Entregar", variant: "success" as const },
};

export function DevelopmentCard({ project, onClick }: DevelopmentCardProps) {
  const statusInfo = statusLabelMap[project.status] || { label: project.status, variant: "neutral" as const };
  const percentSold = Math.round(((project.totalLots - project.availableLots) / project.totalLots) * 100);

  const formattedPrice = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: project.currency,
    maximumFractionDigits: 0,
  }).format(project.priceFrom);

  return (
    <Card 
      className="group overflow-hidden border border-slate-100 bg-white transition-all duration-300 hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1 cursor-pointer"
      onClick={() => onClick?.(project.id)}
    >
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        {project.coverUrl ? (
          <img 
            src={project.coverUrl} 
            alt={project.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400">
            <Trees className="h-12 w-12 stroke-[1.2]" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge variant={statusInfo.variant} className="shadow-sm backdrop-blur-sm bg-white/90">
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-base leading-tight group-hover:text-brand-600 transition-colors">
              {project.name}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              <span>{project.location}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 py-2 space-y-4">
        {/* Lotes summary */}
        <div className="grid grid-cols-2 gap-3 text-xs border-y border-slate-50 py-3">
          <div className="space-y-0.5">
            <span className="text-slate-400">Lotes Disponibles</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>{project.availableLots} / {project.totalLots}</span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400">Precio Inicial</span>
            <div className="flex items-center gap-0.5 font-semibold text-emerald-600">
              <DollarSign className="h-3.5 w-3.5" />
              <span>{formattedPrice}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Vendido / Reservado</span>
            <span className="text-slate-600 font-semibold">{percentSold}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-500 rounded-full transition-all duration-500" 
              style={{ width: `${percentSold}%` }}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 bg-slate-50/50">
        <div className="flex gap-2">
          {project.features?.hasSecurity && (
            <span title="Seguridad 24hs">
              <Shield className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
            </span>
          )}
          {project.features?.hasWater && (
            <span title="Agua Corriente">
              <Droplets className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
            </span>
          )}
          {project.features?.hasGas && (
            <span title="Gas Natural">
              <Flame className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase text-brand-600">
          <Activity className="h-3 w-3" />
          <span>{project.progressPercent}% obras</span>
        </div>
      </CardFooter>
    </Card>
  );
}
