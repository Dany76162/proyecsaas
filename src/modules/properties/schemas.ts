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

  const parsed = Number.parseInt(normalized, 10);
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
  title: z.string().trim().min(2).max(120),
  address: z.preprocess(emptyStringToNull, z.string().trim().max(160).nullable()),
  city: z.preprocess(emptyStringToNull, z.string().trim().max(120).nullable()),
  neighborhood: z.preprocess(emptyStringToNull, z.string().trim().max(120).nullable()),
  propertyType: z.preprocess(emptyStringToNull, z.string().trim().max(80).nullable()),
  priceCents: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  currency: z.preprocess(emptyStringToNull, z.string().trim().max(12).nullable()),
  bedrooms: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  bathrooms: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  surfaceM2: z.preprocess(stringNumberToNullableInt, z.number().int().nonnegative().nullable()),
  status: z.nativeEnum(PropertyStatus),
  publicVisible: z.boolean(),
});
