import "server-only";

import { prisma } from "@/server/db/prisma";

export type AiCostRow = {
  organizationId: string | null;
  organizationName: string;
  calls: number;
  totalTokens: number;
  costUsd: number;
};

export type AiCostSummary = {
  windowDays: number;
  totalCostUsd: number;
  totalTokens: number;
  totalCalls: number;
  rows: AiCostRow[];
};

/** Resumen de consumo/costo de IA por organización en los últimos N días. */
export async function getAiUsageSummary(windowDays = 30): Promise<AiCostSummary> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

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
        select: { id: true, name: true },
      })
    : [];
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));

  const rows: AiCostRow[] = grouped
    .map((g) => ({
      organizationId: g.organizationId,
      organizationName: g.organizationId
        ? orgName.get(g.organizationId) ?? "(organización eliminada)"
        : "Plataforma / Superadmin",
      calls: g._count._all,
      totalTokens: g._sum.totalTokens ?? 0,
      costUsd: g._sum.costUsd ?? 0,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  return {
    windowDays,
    totalCostUsd: rows.reduce((acc, r) => acc + r.costUsd, 0),
    totalTokens: rows.reduce((acc, r) => acc + r.totalTokens, 0),
    totalCalls: rows.reduce((acc, r) => acc + r.calls, 0),
    rows,
  };
}
