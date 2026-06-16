import "server-only";

import { prisma } from "@/server/db/prisma";

export const DEFAULT_AI_MONTHLY_COST_LIMIT_USD =
  Number(process.env.AI_DEFAULT_MONTHLY_COST_LIMIT_USD) || 25;

export type AiCostStatus = "ok" | "warning" | "over";

export type AiCostRow = {
  organizationId: string | null;
  organizationName: string;
  calls: number;
  totalTokens: number;
  costUsd: number;
  limitUsd: number | null; // límite efectivo (override o default); null para plataforma
  hasCustomLimit: boolean;
  pctUsed: number | null;
  status: AiCostStatus;
};

export type AiCostSummary = {
  monthLabel: string;
  defaultLimitUsd: number;
  totalCostUsd: number;
  totalTokens: number;
  totalCalls: number;
  warningCount: number;
  overCount: number;
  rows: AiCostRow[];
};

function statusFor(pct: number | null): AiCostStatus {
  if (pct === null) return "ok";
  if (pct >= 1) return "over";
  if (pct >= 0.8) return "warning";
  return "ok";
}

/** Resumen de consumo/costo de IA por organización en el mes calendario actual. */
export async function getAiUsageSummary(): Promise<AiCostSummary> {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const grouped = await prisma.aiUsageEvent.groupBy({
    by: ["organizationId"],
    where: { createdAt: { gte: since } },
    _sum: { totalTokens: true, costUsd: true },
    _count: { _all: true },
  });

  const orgIds = grouped
    .map((g) => g.organizationId)
    .filter((id): id is string => Boolean(id));

  const orgs = orgIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true, aiMonthlyCostLimitUsd: true },
      })
    : [];
  const orgById = new Map(orgs.map((o) => [o.id, o]));

  const rows: AiCostRow[] = grouped
    .map((g) => {
      const org = g.organizationId ? orgById.get(g.organizationId) : undefined;
      const costUsd = g._sum.costUsd ?? 0;
      const isPlatform = !g.organizationId;

      const limitUsd = isPlatform
        ? null
        : org?.aiMonthlyCostLimitUsd ?? DEFAULT_AI_MONTHLY_COST_LIMIT_USD;
      const pctUsed = limitUsd && limitUsd > 0 ? costUsd / limitUsd : null;

      return {
        organizationId: g.organizationId,
        organizationName: g.organizationId
          ? org?.name ?? "(organización eliminada)"
          : "Plataforma / Superadmin",
        calls: g._count._all,
        totalTokens: g._sum.totalTokens ?? 0,
        costUsd,
        limitUsd,
        hasCustomLimit: Boolean(org?.aiMonthlyCostLimitUsd),
        pctUsed,
        status: statusFor(pctUsed),
      };
    })
    .sort((a, b) => b.costUsd - a.costUsd);

  return {
    monthLabel,
    defaultLimitUsd: DEFAULT_AI_MONTHLY_COST_LIMIT_USD,
    totalCostUsd: rows.reduce((acc, r) => acc + r.costUsd, 0),
    totalTokens: rows.reduce((acc, r) => acc + r.totalTokens, 0),
    totalCalls: rows.reduce((acc, r) => acc + r.calls, 0),
    warningCount: rows.filter((r) => r.status === "warning").length,
    overCount: rows.filter((r) => r.status === "over").length,
    rows,
  };
}
