import { z } from "zod";

export const createLeadSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(32).optional(),
  source: z.string().min(2).max(80),
});
