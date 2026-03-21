import { z } from "zod";

export const createPropertySchema = z.object({
  title: z.string().min(2).max(120),
  address: z.string().min(4).max(160),
  city: z.string().min(2).max(120),
  priceCents: z.number().int().nonnegative(),
});
