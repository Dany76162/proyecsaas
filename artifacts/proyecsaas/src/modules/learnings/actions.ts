"use server";

import { AgentLearningType, MembershipRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { MAX_ACTIVE_LEARNINGS } from "./service";

const MAX_CONTENT_LENGTH = 500;
const MAX_TITLE_LENGTH = 100;

const createSchema = z.object({
  type: z.nativeEnum(AgentLearningType),
  title: z.string().min(1, "El título es obligatorio").max(MAX_TITLE_LENGTH),
  content: z.string().min(1, "El contenido es obligatorio").max(MAX_CONTENT_LENGTH),
  priority: z.coerce.number().int().min(0).max(99).default(0),
  sourceConversationId: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  type: z.nativeEnum(AgentLearningType),
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
  priority: z.coerce.number().int().min(0).max(99).default(0),
});

export async function createLearningAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const { membership, user } = await requireOrganizationMembership(orgSlug);
  const organization = membership.organization;
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = createSchema.safeParse({
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    priority: String(formData.get("priority") ?? "0"),
    sourceConversationId: formData.get("sourceConversationId") ? String(formData.get("sourceConversationId")) : undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }

  const activeCount = await prisma.agentLearning.count({
    where: { organizationId: organization.id, isActive: true },
  });

  if (activeCount >= MAX_ACTIVE_LEARNINGS) {
    return { success: false, error: `Máximo ${MAX_ACTIVE_LEARNINGS} aprendizajes activos. Desactivá alguno antes de crear uno nuevo.` };
  }

  await prisma.agentLearning.create({
    data: {
      organizationId: organization.id,
      type: parsed.data.type,
      title: parsed.data.title,
      content: parsed.data.content,
      priority: parsed.data.priority,
      sourceConversationId: parsed.data.sourceConversationId ?? null,
      createdById: user.id,
    },
  });

  revalidatePath(`/${orgSlug}/agents/learnings`);
  return { success: true, error: null };
}

export async function updateLearningAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const { membership } = await requireOrganizationMembership(orgSlug);
  const organization = membership.organization;
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const parsed = updateSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    priority: String(formData.get("priority") ?? "0"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }

  await prisma.agentLearning.updateMany({
    where: { id: parsed.data.id, organizationId: organization.id },
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      content: parsed.data.content,
      priority: parsed.data.priority,
    },
  });

  revalidatePath(`/${orgSlug}/agents/learnings`);
  return { success: true, error: null };
}

export async function toggleLearningAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const id = String(formData.get("id") ?? "");
  const { membership } = await requireOrganizationMembership(orgSlug);
  const organization = membership.organization;
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  const learning = await prisma.agentLearning.findFirst({
    where: { id, organizationId: organization.id },
    select: { isActive: true },
  });

  if (!learning) {
    return { success: false, error: "Aprendizaje no encontrado" };
  }

  if (!learning.isActive) {
    const activeCount = await prisma.agentLearning.count({
      where: { organizationId: organization.id, isActive: true },
    });
    if (activeCount >= MAX_ACTIVE_LEARNINGS) {
      return { success: false, error: `Máximo ${MAX_ACTIVE_LEARNINGS} aprendizajes activos.` };
    }
  }

  await prisma.agentLearning.updateMany({
    where: { id, organizationId: organization.id },
    data: { isActive: !learning.isActive },
  });

  revalidatePath(`/${orgSlug}/agents/learnings`);
  return { success: true, error: null };
}

export async function deleteLearningAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const id = String(formData.get("id") ?? "");
  const { membership } = await requireOrganizationMembership(orgSlug);
  const organization = membership.organization;
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  await prisma.agentLearning.deleteMany({
    where: { id, organizationId: organization.id },
  });

  revalidatePath(`/${orgSlug}/agents/learnings`);
  return { success: true, error: null };
}
