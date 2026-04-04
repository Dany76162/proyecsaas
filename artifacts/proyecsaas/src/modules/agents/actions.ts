"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";

const createSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(80),
  description: z.string().max(300).optional(),
  tone: z.enum(["FORMAL", "FRIENDLY", "NEUTRAL"]).default("FRIENDLY"),
  language: z.string().default("es-AR"),
  persona: z.string().max(2000).optional(),
  is24x7: z.boolean().default(true),
  whatsappChannelId: z.string().optional().nullable(),
  zoneFilters: z.array(z.string()).default([]),
  propertyTypes: z.array(z.string()).default([]),
  minBudget: z.number().int().positive().optional().nullable(),
  maxBudget: z.number().int().positive().optional().nullable(),
  escalateAfterMessages: z.number().int().min(1).max(20).default(5),
  escalateOnKeywords: z.array(z.string()).default([]),
  humanHandoffMessage: z.string().max(500).optional(),
});

export type CreateAgentInput = z.infer<typeof createSchema>;

type ActionResult = { success: true } | { success: false; error: string };

function isManagerRole(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export async function createAgent(
  orgSlug: string,
  input: CreateAgentInput,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  if (!isManagerRole(membership.role)) {
    return { success: false, error: "Sin permisos para crear agentes." };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const data = parsed.data;
  const orgId = membership.organization.id;

  // Enforce per-org agent quota (controlled by superadmin)
  const [org, existingCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { maxAiAgents: true } }),
    prisma.aiAgent.count({ where: { organizationId: orgId } }),
  ]);
  const quota = org?.maxAiAgents ?? 1;
  if (existingCount >= quota) {
    return {
      success: false,
      error: `Límite de agentes alcanzado (${quota}). Para habilitar más agentes contactá al soporte de la plataforma.`,
    };
  }

  if (data.whatsappChannelId) {
    const alreadyAssigned = await prisma.aiAgent.findFirst({
      where: { whatsappChannelId: data.whatsappChannelId },
    });
    if (alreadyAssigned) {
      return { success: false, error: "Ese canal de WhatsApp ya está asignado a otro agente." };
    }
  }

  await prisma.aiAgent.create({
    data: {
      organizationId: orgId,
      name: data.name,
      description: data.description,
      tone: data.tone,
      language: data.language,
      persona: data.persona,
      is24x7: data.is24x7,
      whatsappChannelId: data.whatsappChannelId ?? null,
      zoneFilters: data.zoneFilters,
      propertyTypes: data.propertyTypes,
      minBudget: data.minBudget ?? null,
      maxBudget: data.maxBudget ?? null,
      escalateAfterMessages: data.escalateAfterMessages,
      escalateOnKeywords: data.escalateOnKeywords,
      humanHandoffMessage: data.humanHandoffMessage,
      status: "DRAFT",
    },
  });

  revalidatePath(`/${orgSlug}/agents`);
  return { success: true };
}

export async function updateAgent(
  orgSlug: string,
  agentId: string,
  input: Partial<CreateAgentInput> & { status?: "DRAFT" | "ACTIVE" | "PAUSED" },
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  if (!isManagerRole(membership.role)) {
    return { success: false, error: "Sin permisos para editar agentes." };
  }

  const orgId = membership.organization.id;

  const agent = await prisma.aiAgent.findFirst({
    where: { id: agentId, organizationId: orgId },
  });
  if (!agent) return { success: false, error: "Agente no encontrado." };

  if (input.whatsappChannelId && input.whatsappChannelId !== agent.whatsappChannelId) {
    const alreadyAssigned = await prisma.aiAgent.findFirst({
      where: {
        whatsappChannelId: input.whatsappChannelId,
        id: { not: agentId },
      },
    });
    if (alreadyAssigned) {
      return { success: false, error: "Ese canal de WhatsApp ya está asignado a otro agente." };
    }
  }

  await prisma.aiAgent.update({
    where: { id: agentId },
    data: {
      name: input.name,
      description: input.description,
      tone: input.tone,
      language: input.language,
      persona: input.persona,
      is24x7: input.is24x7,
      status: input.status,
      whatsappChannelId: input.whatsappChannelId ?? null,
      zoneFilters: input.zoneFilters,
      propertyTypes: input.propertyTypes,
      minBudget: input.minBudget ?? null,
      maxBudget: input.maxBudget ?? null,
      escalateAfterMessages: input.escalateAfterMessages,
      escalateOnKeywords: input.escalateOnKeywords,
      humanHandoffMessage: input.humanHandoffMessage,
    },
  });

  revalidatePath(`/${orgSlug}/agents`);
  revalidatePath(`/${orgSlug}/agents/${agentId}`);
  return { success: true };
}

export async function toggleAgentStatus(
  orgSlug: string,
  agentId: string,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  if (!isManagerRole(membership.role)) {
    return { success: false, error: "Sin permisos." };
  }

  const agent = await prisma.aiAgent.findFirst({
    where: { id: agentId, organizationId: membership.organization.id },
  });
  if (!agent) return { success: false, error: "Agente no encontrado." };

  const nextStatus = agent.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

  await prisma.aiAgent.update({
    where: { id: agentId },
    data: { status: nextStatus },
  });

  revalidatePath(`/${orgSlug}/agents`);
  revalidatePath(`/${orgSlug}/agents/${agentId}`);
  return { success: true };
}

export async function deleteAgent(
  orgSlug: string,
  agentId: string,
): Promise<ActionResult> {
  const { membership } = await requireOrganizationMembership(orgSlug);
  if (!isManagerRole(membership.role)) {
    return { success: false, error: "Sin permisos para eliminar agentes." };
  }

  const agent = await prisma.aiAgent.findFirst({
    where: { id: agentId, organizationId: membership.organization.id },
  });
  if (!agent) return { success: false, error: "Agente no encontrado." };

  await prisma.aiAgent.delete({ where: { id: agentId } });

  revalidatePath(`/${orgSlug}/agents`);
  return { success: true };
}
