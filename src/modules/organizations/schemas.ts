import { z } from "zod";

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().min(2).max(120),
  marketFocus: z.string().min(2).max(160),
});
