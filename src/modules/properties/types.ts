import type { PropertyStatus, VisitStatus } from "@prisma/client";

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
