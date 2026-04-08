import "server-only";

import { BillingMode, SubscriptionStatus } from "@prisma/client";

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Trial",
  ACTIVE: "Activa",
  PAST_DUE: "Pago pendiente",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
  SUSPENDED: "Suspendida",
};

export const BILLING_MODE_LABELS: Record<BillingMode, string> = {
  ONLINE: "Online",
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  COURTESY: "Cortesía",
  MANUAL: "Manual",
};

type SubscriptionSnapshot = {
  status: SubscriptionStatus;
  billingMode: BillingMode;
  currentPeriodEnd: Date;
};

export type EffectiveCommercialState = {
  allowed: boolean;
  effectiveStatus: SubscriptionStatus | null;
  source: "subscription" | "legacy" | "organization";
  summary: string;
};

export function resolveEffectiveCommercialState(input: {
  isActive: boolean;
  subscription: SubscriptionSnapshot | null;
  now?: Date;
}): EffectiveCommercialState {
  if (!input.isActive) {
    return {
      allowed: false,
      effectiveStatus: SubscriptionStatus.SUSPENDED,
      source: "organization",
      summary: "Cuenta desactivada por administración.",
    };
  }

  if (!input.subscription) {
    return {
      allowed: true,
      effectiveStatus: null,
      source: "legacy",
      summary: "Acceso legado sin suscripción explícita.",
    };
  }

  const now = input.now ?? new Date();
  const expired =
    input.subscription.currentPeriodEnd.getTime() <= now.getTime() &&
    (input.subscription.status === SubscriptionStatus.ACTIVE ||
      input.subscription.status === SubscriptionStatus.TRIALING);

  const effectiveStatus = expired ? SubscriptionStatus.EXPIRED : input.subscription.status;
  const allowed =
    effectiveStatus === SubscriptionStatus.ACTIVE ||
    effectiveStatus === SubscriptionStatus.TRIALING;

  return {
    allowed,
    effectiveStatus,
    source: "subscription",
    summary: SUBSCRIPTION_STATUS_LABELS[effectiveStatus],
  };
}
