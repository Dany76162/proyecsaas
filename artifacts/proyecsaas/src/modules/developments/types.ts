import type { DevelopmentStatus, DevelopmentLotStatus, DevelopmentReservationStatus } from "@prisma/client";

export type { DevelopmentStatus, DevelopmentLotStatus, DevelopmentReservationStatus };

export type DevelopmentListItem = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  status: DevelopmentStatus;
  publicVisible: boolean;
  lotCount: number;
  availableCount: number;
  logoUrl: string | null;
  coverImageUrl: string | null;
  themeColor: string | null;
  createdAt: Date;
};

export type DevelopmentDetail = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  status: DevelopmentStatus;
  publicVisible: boolean;
  masterplanSVG: string | null;
  masterplanSourceUrl: string | null;
  masterplanSourceKind: string | null;
  latitude: number | null;
  longitude: number | null;
  lots: DevelopmentLotItem[];
  createdAt: Date;
  updatedAt: Date;
};

export type DevelopmentLotItem = {
  id: string;
  lotNumber: string;
  status: DevelopmentLotStatus;
  pathData: string | null;
  centerX: number | null;
  centerY: number | null;
  areaSqm: number | null;
  priceCents: number | null;
  currency: string | null;
};

export type DevelopmentReservationItem = {
  id: string;
  lotId: string;
  lotNumber: string;
  leadId: string | null;
  agentId: string | null;
  status: DevelopmentReservationStatus;
  depositCents: number | null;
  notes: string | null;
  expiresAt: Date | null;
  approvedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
};
