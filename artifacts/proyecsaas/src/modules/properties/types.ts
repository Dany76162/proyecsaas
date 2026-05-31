import type { PropertyImageCategory, PropertyStatus, VisitStatus } from "@prisma/client";

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
  category: PropertyImageCategory;
  sortOrder: number;
  isPrimary: boolean;
};

export type PropertyPanoramaItem = {
  id: string;
  url: string;
  label: string | null;
  direction: string | null;
  roomName: string | null;
  floor: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  connections: string[];
  sortOrder: number;
  initialYaw: number;
  initialPitch: number;
  initialHfov: number;
  hotspotPitch?: number | null;
  hotspotYaw?: number | null;
};

export type PropertyDetail = PropertyListItem & {
  description: string | null;
  amenities: string | null;
  externalLink: string | null;
  videoUrl: string | null;
  floorPlanUrl: string | null;
  latitude?: number;
  longitude?: number;
  interestedLeads: PropertyInterestLead[];
  visits: PropertyVisitItem[];
  images: PropertyImageItem[];
  panoramas: PropertyPanoramaItem[];
  organizationSlug: string;
};

export type PublicCatalogProperty = PropertyListItem & {
  images: { id: string; url: string; isPrimary: boolean }[];
  panoramas: { id: string; url: string; roomName: string | null; label: string | null }[];
};
