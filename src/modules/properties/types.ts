import type { PropertyStatus, VisitStatus } from "@prisma/client";

export type PropertyListItem = {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  propertyType: string | null;
  operationType: string | null;
  status: PropertyStatus;
  publicVisible: boolean;
  priceCents: number | null;
  currency: string | null;
  expensesCents: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  surfaceM2: number | null;
  parkingSpots: number | null;
  thumbnailUrl: string | null;
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

export type PropertyImageItem = {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type PropertyDetail = PropertyListItem & {
  description: string | null;
  amenities: string | null;
  externalLink: string | null;
  videoUrl: string | null;
  latitude?: number;
  longitude?: number;
  interestedLeads: PropertyInterestLead[];
  visits: PropertyVisitItem[];
  images: PropertyImageItem[];
  organizationSlug: string;
};
