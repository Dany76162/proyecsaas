import { PropertyStatus } from "@prisma/client";
import { z } from "zod";

function emptyStringToNull(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function stringNumberToNullableInt(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();

  if (normalized === "") {
    return null;
  }

  // Strip dots/commas used as thousands separators (e.g. "300.000" → "300000")
  const noSep = normalized.replace(/[,.](?=(\d{3})+(?!\d))/g, "");
  const parsed = Number.parseInt(noSep, 10);
  return Number.isNaN(parsed) ? value : parsed;
}

export const createPropertySchema = z.object({
  title: z.string().min(2).max(120),
  address: z.string().min(4).max(160),
  city: z.string().min(2).max(120),
  priceCents: z.number().int().nonnegative(),
});

export const updatePropertySchema = z.object({
  propertyId: z.string().trim().min(1),
  // Datos comerciales
  title: z.string().trim().min(2).max(120),
  operationType: z.preprocess(emptyStringToNull, z.string().trim().max(40).nullable()),
  propertyType: z.preprocess(emptyStringToNull, z.string().trim().max(80).nullable()),
  priceCents: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  currency: z.preprocess(emptyStringToNull, z.string().trim().max(12).nullable()),
  expensesCents: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  status: z.nativeEnum(PropertyStatus),
  publicVisible: z.boolean(),
  // Ubicación
  address: z.preprocess(emptyStringToNull, z.string().trim().max(160).nullable()),
  city: z.preprocess(emptyStringToNull, z.string().trim().max(120).nullable()),
  neighborhood: z.preprocess(emptyStringToNull, z.string().trim().max(120).nullable()),
  // Características
  rooms: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  bedrooms: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  bathrooms: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  surfaceM2: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  parkingSpots: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  // Descripción y multimedia
  description: z.preprocess(emptyStringToNull, z.string().trim().max(4000).nullable()),
  amenities: z.preprocess(emptyStringToNull, z.string().trim().max(500).nullable()),
  externalLink: z.preprocess(emptyStringToNull, z.string().trim().max(500).nullable()),
  videoUrl: z.preprocess(emptyStringToNull, z.string().trim().max(500).nullable()),
});

export const setPropertyVideoSchema = z.object({
  propertyId: z.string().min(1),
  url: z.string().url().max(1000).nullable(),
});

export const addPropertyImageSchema = z.object({
  propertyId: z.string().min(1),
  url: z.string().url().max(1000),
  altText: z.string().max(200).optional(),
  isPrimary: z.boolean().optional(),
});

export const removePropertyImageSchema = z.object({
  imageId: z.string().min(1),
  propertyId: z.string().min(1),
});

export const setPropertyImagePrimarySchema = z.object({
  imageId: z.string().min(1),
  propertyId: z.string().min(1),
});

export const deletePropertySchema = z.object({
  propertyId: z.string().min(1),
});
