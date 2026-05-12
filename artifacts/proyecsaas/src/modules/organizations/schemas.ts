import { z } from "zod";

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().max(120),
  marketFocus: z.string().trim().max(160),
  description: z.string().trim().max(500).optional(),
  contactEmail: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(50).optional(),
  contactWhatsapp: z.string().trim().max(50).optional(),
  website: z.string().trim().max(300).optional(),
  businessHours: z.string().trim().max(200).optional(),
});

export const updatePropertySourceSchema = z.object({
  propertySourceUrl: z.string().trim().max(500).optional(),
  propertySourceType: z.string().trim().max(50).optional(),
});
