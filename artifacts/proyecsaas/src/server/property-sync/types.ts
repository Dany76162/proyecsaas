/**
 * Shared types for the property sync system.
 */

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
  /** Galería completa obtenida de la ficha detalle (hasta 20). Primera = portada. */
  imageUrls?: string[] | null;
  externalId: string;
}

export type SyncStrategy = "wordpress-api" | "json-ld" | "html-static" | "sitemap";

export interface SyncResult {
  /** Estrategia/origen efectivo: SyncStrategy o `adapter:<id>` para adaptadores. */
  strategy: SyncStrategy | string;
  properties: SyncProperty[];
  totalFetched: number;
}
