import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

export const ACTIVATION_EVENTS = {
  onboardingView: "activation.onboarding_viewed",
  firstLeadCreated: "activation.first_lead_created",
  firstHumanIntervention: "activation.first_human_intervention",
} as const;

export type ActivationEvent = (typeof ACTIVATION_EVENTS)[keyof typeof ACTIVATION_EVENTS];

type AuditClient = PrismaClient | Prisma.TransactionClient;

type TrackActivationEventOnceParams = {
  event: ActivationEvent;
  organizationId: string;
  organizationSlug?: string | null;
  organizationName?: string | null;
  actorId?: string;
  actorEmail?: string;
  metadata?: Record<string, unknown>;
};

export async function trackActivationEventOnce(
  client: AuditClient,
  params: TrackActivationEventOnceParams,
): Promise<boolean> {
  try {
    const existing = await client.auditLog.findFirst({
      where: {
        event: params.event,
        entityType: "Organization",
        entityId: params.organizationId,
      },
      select: { id: true },
    });

    if (existing) {
      return false;
    }

    await client.auditLog.create({
      data: {
        event: params.event,
        actorId: params.actorId ?? null,
        actorEmail: params.actorEmail ?? null,
        entityType: "Organization",
        entityId: params.organizationId,
        entityName: params.organizationName ?? params.organizationSlug ?? null,
        metadata: params.metadata
          ? JSON.parse(JSON.stringify(params.metadata))
          : params.organizationSlug
            ? { organizationSlug: params.organizationSlug }
            : undefined,
      },
    });

    return true;
  } catch {
    return false;
  }
}
