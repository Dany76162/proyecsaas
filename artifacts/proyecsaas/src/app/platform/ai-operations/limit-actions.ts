"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";
import { requirePlatformAdmin } from "@/server/auth/access";

/**
 * Configura el límite mensual de costo de IA (USD) para una organización.
 * `limitUsd` null o <= 0 vuelve al límite por defecto de la plataforma.
 */
export async function setOrgAiCostLimitAction(
  organizationId: string,
  limitUsd: number | null,
): Promise<{ ok: boolean }> {
  await requirePlatformAdmin();

  const normalized =
    limitUsd != null && Number.isFinite(limitUsd) && limitUsd > 0 ? limitUsd : null;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { aiMonthlyCostLimitUsd: normalized },
  });

  revalidatePath("/platform/ai-operations");
  return { ok: true };
}
