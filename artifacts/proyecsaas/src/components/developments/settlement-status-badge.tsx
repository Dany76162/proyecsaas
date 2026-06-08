import * as React from "react";
import { Badge } from "@/components/ui/badge";

// Reflects the ReservationSettlementStatus enum from Prisma schema (Fase 2).
// Used in the Superadmin liquidation panel (Fase 3) and developer workspace reports.
export type SettlementStatus = "PENDING" | "IN_REVIEW" | "SETTLED" | "HELD" | "REFUNDED";

export interface SettlementStatusBadgeProps {
  status: SettlementStatus;
  className?: string;
}

const settlementConfig: Record<SettlementStatus, { label: string; variant: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  PENDING:   { label: "Liquidación pendiente", variant: "warning" },
  IN_REVIEW: { label: "En revisión",           variant: "info" },
  SETTLED:   { label: "Liquidado",             variant: "success" },
  HELD:      { label: "Retenido",              variant: "danger" },
  REFUNDED:  { label: "Devuelto",              variant: "neutral" },
};

export function SettlementStatusBadge({ status, className }: SettlementStatusBadgeProps) {
  const config = settlementConfig[status] ?? { label: status, variant: "neutral" as const };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

// Label-only helper for use in tables and lists without rendering a Badge.
export function getSettlementStatusLabel(status: SettlementStatus | string | null | undefined): string {
  if (!status) return "—";
  return settlementConfig[status as SettlementStatus]?.label ?? status;
}
