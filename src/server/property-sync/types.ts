export interface SyncProperty {
  title: string;
  description: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  propertyType?: string | null;
  operationType?: string | null;
  priceCents?: number | null;
  currency?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  surfaceM2?: number | null;
  externalLink?: string | null;
  imageUrl?: string | null;
  externalId: string;
}

export type SyncStrategy = "wordpress-api" | "json-ld" | "html-static";

export interface SyncResult {
  strategy: SyncStrategy;
  properties: SyncProperty[];
  totalFetched: number;
}
