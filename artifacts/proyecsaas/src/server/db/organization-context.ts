import { Prisma, PrismaClient } from "@prisma/client";

/**
 * RAW UNAUTHENTICATED LOOKUP — for internal automation/worker use only.
 *
 * This function does NOT verify session, membership, or any form of access control.
 * It must NEVER be used as a substitute for requireOrganizationMembership() in
 * server actions, route handlers, or page components that serve user requests.
 *
 * Safe callers: background workers, internal automation pipelines.
 * If you are writing a user-facing action or route, use requireOrganizationMembership() instead.
 */
export async function getOrganizationBySlugUnauthenticated(
  prisma: PrismaClient | Prisma.TransactionClient,
  orgSlug: string,
) {
  return prisma.organization.findUnique({
    where: { slug: orgSlug },
  });
}
