"use server";

import { z } from "zod";
import { MembershipRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";

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

const expressPropertySchema = z.object({
  title: z.string().trim().min(2).max(120),
  operationType: z.string().trim().min(1).max(40),
  propertyType: z.string().trim().min(1).max(80),
  city: z.string().trim().min(2).max(120),
  priceUsd: z.number().nonnegative(),
});

/**
 * Modo Express del onboarding: crea la primera propiedad ya **publicada y
 * disponible** (AVAILABLE + pública) con los datos mínimos, para que la IA
 * pueda ofrecerla de inmediato en las conversaciones. A diferencia del alta
 * normal (que crea un borrador y manda al editor completo), acá el objetivo
 * es llegar al WOW en <1 min.
 */
export async function createExpressPropertyAction(
  orgSlug: string,
  input: unknown,
): Promise<{ ok: true; propertyId: string } | { ok: false; message: string }> {
  try {
    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, MembershipRole.AGENT);

    const parsed = expressPropertySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Completá título, operación, tipo, ciudad y precio." };
    }

    const property = await prisma.property.create({
      data: {
        organizationId: membership.organization.id,
        title: parsed.data.title,
        operationType: parsed.data.operationType,
        propertyType: parsed.data.propertyType,
        city: parsed.data.city,
        priceCents: Math.round(parsed.data.priceUsd * 100),
        currency: "USD",
        status: "AVAILABLE",
        publicVisible: true,
      },
      select: { id: true },
    });

    revalidatePath(`/${orgSlug}/onboarding`);
    revalidatePath(`/${orgSlug}/properties`);
    return { ok: true, propertyId: property.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al crear la propiedad.";
    return { ok: false, message };
  }
}
