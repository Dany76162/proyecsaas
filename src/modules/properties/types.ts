import type { PropertyStatus, VisitStatus } from "@prisma/client";

export type PropertyListItem = {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  propertyType: string | null;
  status: PropertyStatus;
  publicVisible: boolean;
  priceCents: number | null;
  currency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  surfaceM2: number | null;
};

export type PropertySummary = {
  total: number;
  availableCount: number;
  publicCount: number;
  averageTicketCents: number;
};

export type PropertyInterestLead = {
  id: string;
  fullName: string;
  status: string;
  ownerName: string;
};

export type PropertyVisitItem = {
  id: string;
  scheduledAt: string;
  status: VisitStatus;
  leadName: string;
};

export type PropertyDetail = PropertyListItem & {
  latitude?: number;
  longitude?: number;
  interestedLeads: PropertyInterestLead[];
  visits: PropertyVisitItem[];
  organizationSlug: string;
};
