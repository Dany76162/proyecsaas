import { prismaWorker as prisma } from "@/server/db/prisma-worker";

/**
 * Worker-specific subscription check (uses prismaWorker, no "server-only" import).
 * Returns true if the org can process AI automation.
 */
export async function isOrgSubscriptionActiveForWorker(organizationId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { status: true, currentPeriodEnd: true },
  });

  if (!subscription) {
    return false;
  }

  const now = new Date();
  return (
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING") &&
    subscription.currentPeriodEnd > now
  );
}
