import { prisma } from "@/server/db/prisma";

export class SubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionError";
  }
}

/**
 * Central helper to check an organization's subscription status.
 * An org is considered "active" if:
 *  - A Subscription record exists for the organizationId
 *  - status is ACTIVE or TRIALING
 *  - currentPeriodEnd has not passed
 */
export async function getOrgSubscriptionStatus(organizationId: string): Promise<{
  isActive: boolean;
  status: string | null;
  planLabel: string | null;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: { select: { name: true } } },
  });

  if (!subscription) {
    return { isActive: false, status: null, planLabel: null };
  }

  const now = new Date();
  const isActive =
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING") &&
    subscription.currentPeriodEnd > now;

  return {
    isActive,
    status: subscription.status,
    planLabel: subscription.plan.name,
  };
}

/**
 * Throws SubscriptionError if the org does not have an active subscription.
 * Use in API routes and server actions to gate premium features.
 */
export async function requireActiveSubscription(organizationId: string): Promise<void> {
  const { isActive } = await getOrgSubscriptionStatus(organizationId);

  if (!isActive) {
    throw new SubscriptionError(
      "La suscripción de esta organización no está activa. Renovála para continuar usando las funciones premium.",
    );
  }
}
