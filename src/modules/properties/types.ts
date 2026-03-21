import type { PropertyStatus } from "@prisma/client";

export type PropertyListItem = {
  id: string;
  title: string;
  address: string;
  city: string;
  neighborhood: string;
  propertyType: string;
  status: PropertyStatus;
  publicVisible: boolean;
  priceCents: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  surfaceM2: number;
};

export type PropertySummary = {
  total: number;
  availableCount: number;
  publicCount: number;
  averageTicketCents: number;
};
