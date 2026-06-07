import * as React from "react";
import { Badge } from "@/components/ui/badge";

export type LotStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";

export interface LotStatusBadgeProps {
  status: LotStatus;
  className?: string;
}

const statusConfig = {
  AVAILABLE: {
    label: "Disponible",
    variant: "success" as const,
  },
  RESERVED: {
    label: "Reservado",
    variant: "warning" as const,
  },
  SOLD: {
    label: "Vendido",
    variant: "danger" as const,
  },
  BLOCKED: {
    label: "Bloqueado",
    variant: "neutral" as const,
  },
};

export function LotStatusBadge({ status, className }: LotStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "neutral" as const };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
