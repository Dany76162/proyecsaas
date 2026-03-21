import "server-only";

import { prisma } from "@/server/db/prisma";

export async function getOrganizationBySlug(orgSlug: string) {
  return prisma.organization.findUnique({
    where: { slug: orgSlug },
  });
}
