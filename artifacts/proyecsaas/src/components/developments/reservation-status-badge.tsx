import * as React from "react";
import { Badge } from "@/components/ui/badge";

export type ReservationStatus = "PENDING" | "APPROVED" | "EXPIRED" | "REJECTED";

export interface ReservationStatusBadgeProps {
  status: ReservationStatus;
  className?: string;
}

const reservationConfig = {
  PENDING: {
    label: "Pendiente de seña",
    variant: "warning" as const,
  },
  APPROVED: {
    label: "Aprobada",
    variant: "success" as const,
  },
  EXPIRED: {
    label: "Expirada",
    variant: "danger" as const,
  },
  REJECTED: {
    label: "Rechazada",
    variant: "outline" as const,
  },
};

export function ReservationStatusBadge({ status, className }: ReservationStatusBadgeProps) {
  const config = reservationConfig[status] || { label: status, variant: "neutral" as const };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
