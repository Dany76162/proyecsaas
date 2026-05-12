import { z } from "zod";

const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email();

export const inviteUserSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: normalizedEmailSchema,
  role: z.enum(["OWNER", "ADMIN", "AGENT", "ASSISTANT"]),
});

export const updateMemberProfileSchema = z.object({
  userId: z.string().min(1),
  fullName: z.string().min(2).max(120),
  email: normalizedEmailSchema,
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  zone: z.string().max(100).optional(),
  agentNotes: z.string().max(500).optional(),
  isActive: z.boolean(),
});
