"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";

export const BUSINESS_TYPES = ["INMOBILIARIA", "DESARROLLADORA", "AMBAS"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

/**
 * Guarda el tipo de negocio elegido en el onboarding. Reutiliza el campo
 * `marketFocus` de Organization para no agregar una columna nueva (la DB de
 * prod está desincronizada del schema; ver memoria prod-db-schema-drift).
 */
export async function setBusinessTypeAction(
  orgSlug: string,
  value: string,
): Promise<{ ok: true } | { ok: false; reason: "auth" | "invalid" }> {
  if (!BUSINESS_TYPES.includes(value as BusinessType)) {
    return { ok: false, reason: "invalid" };
  }

  // Guard: lanza notFound/redirect si el usuario no es miembro de la org.
  await requireOrganizationMembership(orgSlug);

  await prisma.organization.update({
    where: { slug: orgSlug },
    data: { marketFocus: value },
  });

  revalidatePath(`/${orgSlug}/onboarding`);
  return { ok: true };
}

/**
 * Estado de la prueba del agente para el polling de la pantalla "Probá tu agente".
 * Devuelve si ya entró la primera conversación (el momento WOW).
 */
export async function getOnboardingTestStatusAction(
  orgSlug: string,
): Promise<{ hasConversation: boolean }> {
  await requireOrganizationMembership(orgSlug);

  const count = await prisma.conversation.count({
    where: { organization: { slug: orgSlug } },
  });

  return { hasConversation: count > 0 };
}
