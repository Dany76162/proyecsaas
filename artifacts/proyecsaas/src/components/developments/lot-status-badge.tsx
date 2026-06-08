import * as React from "react";
import { Badge } from "@/components/ui/badge";

export type LotStatus = "AVAILABLE" | "RESERVED" | "RESERVED_PENDING" | "SOLD" | "BLOCKED";

export interface LotStatusBadgeProps {
  status: LotStatus;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
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
    variant: "neutral",
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
