import { z } from "zod";

export const createLeadSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().min(7).max(32),
});

export const updateLeadSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().min(7).max(32),
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "VISIT", "CLOSED"]),
  propertyId: z.string().optional(),
});
