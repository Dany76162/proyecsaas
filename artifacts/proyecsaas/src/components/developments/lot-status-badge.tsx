import * as React from "react";
import { Badge } from "@/components/ui/badge";

export type LotStatus = "AVAILABLE" | "RESERVED" | "RESERVED_PENDING" | "SOLD" | "BLOCKED";

export interface LotStatusBadgeProps {
  status: LotStatus;
  className?: string;
  /**
   * "internal" (por defecto) usa la nomenclatura operativa del panel.
   * "public" suaviza términos de jerga interna para el catálogo de cara al cliente
   * (ej.: BLOCKED → "No disponible" en lugar de "Bloqueado").
   */
  audience?: "internal" | "public";
}

const statusConfig: Record<string, { label: string; publicLabel?: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  AVAILABLE: {
    label: "Disponible",
    variant: "success",
  },
  RESERVED: {
    label: "Reservado",
    variant: "warning",
  },
  RESERVED_PENDING: {
    label: "Reservado",
    variant: "warning",
  },
  SOLD: {
    label: "Vendido",
    variant: "danger",
  },
  BLOCKED: {
    label: "Bloqueado",
    publicLabel: "No disponible",
    variant: "neutral",
  },
};

export function LotStatusBadge({ status, className, audience = "internal" }: LotStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "neutral" as const };
  const label = audience === "public" && config.publicLabel ? config.publicLabel : config.label;

  return (
    <Badge variant={config.variant} className={className}>
      {label}
    </Badge>
  );
}
