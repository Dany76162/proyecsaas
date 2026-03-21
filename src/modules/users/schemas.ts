import { z } from "zod";

export const inviteUserSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "AGENT", "ASSISTANT"]),
});
