import "server-only";

import { prisma } from "@/server/db/prisma";

export const MAX_ACTIVE_LEARNINGS = 10;

export async function getActiveLearningsForOrg(organizationId: string) {
  return prisma.agentLearning.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: MAX_ACTIVE_LEARNINGS,
    select: { id: true, type: true, title: true, content: true, priority: true },
  });
}

export async function getAllLearningsForOrg(organizationId: string) {
  return prisma.agentLearning.findMany({
    where: { organizationId },
    orderBy: [{ isActive: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { fullName: true } } },
  });
}

export async function countActiveLearnings(organizationId: string) {
  return prisma.agentLearning.count({
    where: { organizationId, isActive: true },
  });
}
