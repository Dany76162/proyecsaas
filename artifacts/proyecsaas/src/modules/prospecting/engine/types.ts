import { DataValidationStatus, ProspectSourceType } from "@prisma/client";

export interface NormalizedProspect {
  companyName: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  formattedAddress: string | null;
  city: string | null;
  stateProvince: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceType: ProspectSourceType;
  rawSourceData: unknown;
  placeId: string | null;
  externalId: string | null;
  sourceUrl: string | null;
  businessStatus: string | null;
  validationStatus: DataValidationStatus;
  addressVerified: boolean;
  confidenceScore: number | null;
}

export interface ProspectSearchParams {
  query: string;
  country: string;
  countryCode?: string;
  city: string;
  sourceType: ProspectSourceType;
  limit?: number;
  radiusKm?: number;
  language?: string;
}

export interface ProspectSourceAdapter {
  search(params: ProspectSearchParams): Promise<NormalizedProspect[]>;
  getDetails?(externalId: string): Promise<NormalizedProspect>;
  normalize(rawData: unknown): NormalizedProspect;
  healthCheck(): Promise<boolean>;
}
