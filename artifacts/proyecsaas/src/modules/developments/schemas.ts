import { z } from "zod";

export const createDevelopmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  logoUrl: z.string().optional().nullable().or(z.literal("")),
  companyLogoUrl: z.string().optional().nullable().or(z.literal("")),
  themeColor: z.string().optional().nullable().or(z.literal("")),
  brochurePlanUrl: z.string().optional().nullable().or(z.literal("")),
  contactPhone: z.string().optional().nullable().or(z.literal("")),
  contactWeb: z.string().optional().nullable().or(z.literal("")),
  contactAddress: z.string().optional().nullable().or(z.literal("")),
  services: z.array(z.string()).optional(),
  pricePerSqmEtapa1: z.number().optional().nullable(),
  pricePerSqmEtapa2: z.number().optional().nullable(),
  pricePerSqmEtapa3: z.number().optional().nullable(),
  pricePerSqmEtapa4: z.number().optional().nullable(),
  pricePerSqmEtapa5: z.number().optional().nullable(),
});

export const updateDevelopmentSchema = createDevelopmentSchema.partial().extend({
  developmentId: z.string().cuid(),
  status: z.enum(["DRAFT", "ACTIVE", "SOLD_OUT", "PAUSED", "CANCELLED"]).optional(),
  publicVisible: z.boolean().optional(),
});

export const deleteDevelopmentSchema = z.object({
  developmentId: z.string().cuid(),
});

export const updateDevelopmentLotSchema = z.object({
  developmentId: z.string().cuid(),
  lotId: z.string().cuid(),
  priceCents: z.number().int().nonnegative().optional(),
  currency: z.string().max(10).optional(),
  status: z.enum(["AVAILABLE", "RESERVED_PENDING", "RESERVED", "SOLD", "BLOCKED"]).optional(),
  frontMeters: z.number().nonnegative().optional().nullable(),
  backMeters: z.number().nonnegative().optional().nullable(),
  manzana: z.string().optional().nullable().or(z.literal("")),
  destino: z.string().optional().nullable().or(z.literal("")),
});

export const createReservationSchema = z.object({
  developmentId: z.string().cuid(),
  lotId: z.string().cuid(),
  leadId: z.string().cuid().optional(),
  depositCents: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const reservationActionSchema = z.object({
  developmentId: z.string().cuid(),
  reservationId: z.string().cuid(),
  reason: z.string().max(500).optional(),
});

export const blueprintSyncSchema = z.object({
  developmentId: z.string().cuid(),
  svgContent: z.string().min(1),
  processingMode: z.enum(["detected-lots", "visual-only", "source-only"]),
  sourceKind: z.enum(["svg", "dxf", "dwg", "pdf", "image", "unknown"]),
  sourceUrl: z.string().url().optional(),
  paths: z.array(
    z.object({
      lotNumber: z.string().optional(),
      internalId: z.number().int().optional(),
      pathData: z.string(),
      center: z.object({ x: z.number(), y: z.number() }),
      areaSqm: z.number().optional(),
    })
  ),
});

export type CreateDevelopmentInput = z.infer<typeof createDevelopmentSchema>;
export type UpdateDevelopmentInput = z.infer<typeof updateDevelopmentSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type BlueprintSyncInput = z.infer<typeof blueprintSyncSchema>;
