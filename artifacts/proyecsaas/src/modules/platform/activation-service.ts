import "server-only";

import { prisma } from "@/server/db/prisma";
import { ACTIVATION_EVENTS, type ActivationEvent } from "@/server/activation/events";

export type ActivationStage =
  | "SETUP"
  | "SETUP_READY"
  | "ONBOARDING_VIEWED"
  | "FIRST_LEAD"
  | "ACTIVATED";

export type ActivationOrgItem = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  setupReady: boolean;
  activationStage: ActivationStage;
  activationLabel: string;
  onboardingViewed: boolean;
  onboardingViewedAt: string | null;
  firstLead: boolean;
  firstLeadAt: string | null;
  firstHumanIntervention: boolean;
  firstHumanInterventionAt: string | null;
  activated: boolean;
  timeToActivationHours: number | null;
  /** Minutos entre "onboarding visto" y el primer lead (el momento WOW). */
  timeToWowMinutes: number | null;
  lastActivityAt: string | null;
  actionLabel: string;
  actionHref: string;
};

export type PlatformActivationSnapshot = {
  summary: {
    totalOrganizations: number;
    onboardingViewedCount: number;
    firstLeadCount: number;
    firstHumanInterventionCount: number;
    activatedCount: number;
    /** Orgs que llegaron al WOW (primer lead luego de ver el onboarding). */
    wowReachedCount: number;
    /** De esas, cuántas en menos de 10 minutos. */
    wowUnder10MinCount: number;
    /** Mediana del time-to-WOW en minutos (null si nadie llegó). */
    medianTimeToWowMinutes: number | null;
  };
  funnel: Array<{
    key: "onboarding" | "lead" | "human";
    label: string;
    count: number;
    percent: number;
  }>;
  organizations: ActivationOrgItem[];
};

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function hoursBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) {
    return null;
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    return null;
  }

  return Math.round((diffMs / 36e5) * 10) / 10;
}

function minutesBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) {
    return null;
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    return null;
  }

  return Math.round((diffMs / 6e4) * 10) / 10;
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(value * 10) / 10;
}

function getActivationStage(input: {
  setupReady: boolean;
  onboardingViewedAt: Date | null;
  firstLeadAt: Date | null;
  firstHumanInterventionAt: Date | null;
}): { stage: ActivationStage; label: string } {
  if (input.firstHumanInterventionAt) {
    return { stage: "ACTIVATED", label: "Activada" };
  }

  if (input.firstLeadAt) {
    return { stage: "FIRST_LEAD", label: "Con primer lead" };
  }

  if (input.onboardingViewedAt) {
    return { stage: "ONBOARDING_VIEWED", label: "Onboarding visto" };
  }

  if (input.setupReady) {
    return { stage: "SETUP_READY", label: "Setup listo" };
  }

  return { stage: "SETUP", label: "En setup" };
}

function getSuggestedAction(input: {
  orgId: string;
  setupReady: boolean;
  onboardingViewedAt: Date | null;
  firstLeadAt: Date | null;
  firstHumanInterventionAt: Date | null;
}): { actionLabel: string; actionHref: string } {
  const detailHref = `/platform/organizations/${input.orgId}`;

  if (!input.setupReady) {
    return {
      actionLabel: "Revisar setup base",
      actionHref: detailHref,
    };
  }

  if (!input.onboardingViewedAt) {
    return {
      actionLabel: "Acompanar onboarding",
      actionHref: detailHref,
    };
  }

  if (!input.firstLeadAt) {
    return {
      actionLabel: "Validar canal y catalogo",
      actionHref: detailHref,
    };
  }

  if (!input.firstHumanInterventionAt) {
    return {
      actionLabel: "Guiar primera intervencion",
      actionHref: detailHref,
    };
  }

  return {
    actionLabel: "Ver detalle operativo",
    actionHref: detailHref,
  };
}

function getPriorityScore(item: ActivationOrgItem): number {
  if (!item.setupReady) return 0;
  if (!item.onboardingViewed) return 1;
  if (!item.firstLead) return 2;
  if (!item.firstHumanIntervention) return 3;
  return 4;
}

export async function getPlatformActivationSnapshot(): Promise<PlatformActivationSnapshot> {
  const activationEvents = Object.values(ACTIVATION_EVENTS) as ActivationEvent[];

  const [organizations, auditLogs, leadTimeline, humanTimeline, conversationTimeline] =
    await Promise.all([
      prisma.organization.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          _count: {
            select: {
              properties: true,
            },
          },
          aiAgents: {
            select: { id: true },
          },
          whatsappChannels: {
            where: { status: "ACTIVE" },
            select: { id: true },
            take: 1,
          },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          entityType: "Organization",
          event: { in: activationEvents },
        },
        orderBy: { createdAt: "asc" },
        select: {
          entityId: true,
          event: true,
          createdAt: true,
        },
      }),
      prisma.lead.groupBy({
        by: ["organizationId"],
        _min: {
          createdAt: true,
        },
      }),
      prisma.conversation.groupBy({
        by: ["organizationId"],
        where: { isHumanControlled: true },
        _min: {
          updatedAt: true,
        },
      }),
      prisma.conversation.groupBy({
        by: ["organizationId"],
        _max: {
          lastMessageAt: true,
          updatedAt: true,
        },
      }),
    ]);

  const eventMap = new Map<string, Partial<Record<ActivationEvent, Date>>>();

  for (const log of auditLogs) {
    if (!log.entityId) {
      continue;
    }

    const current = eventMap.get(log.entityId) ?? {};
    if (!current[log.event as ActivationEvent]) {
      current[log.event as ActivationEvent] = log.createdAt;
      eventMap.set(log.entityId, current);
    }
  }

  const leadTimelineMap = new Map(
    leadTimeline.map((row) => [row.organizationId, row._min.createdAt ?? null]),
  );
  const humanTimelineMap = new Map(
    humanTimeline.map((row) => [row.organizationId, row._min.updatedAt ?? null]),
  );
  const conversationTimelineMap = new Map(
    conversationTimeline.map((row) => [
      row.organizationId,
      row._max.lastMessageAt ?? row._max.updatedAt ?? null,
    ]),
  );

  const organizationItems = organizations
    .map((org) => {
      const orgEvents = eventMap.get(org.id);
      const onboardingViewedAt = orgEvents?.[ACTIVATION_EVENTS.onboardingView] ?? null;
      const firstLeadAt =
        orgEvents?.[ACTIVATION_EVENTS.firstLeadCreated] ??
        leadTimelineMap.get(org.id) ??
        null;
      const firstHumanInterventionAt =
        orgEvents?.[ACTIVATION_EVENTS.firstHumanIntervention] ??
        humanTimelineMap.get(org.id) ??
        null;
      const lastActivityAt =
        conversationTimelineMap.get(org.id) ?? firstHumanInterventionAt ?? firstLeadAt ?? onboardingViewedAt;

      const setupReady =
        Boolean(org.name.trim() && org.city?.trim()) &&
        org._count.properties > 0 &&
        Boolean(org.aiAgents) &&
        org.whatsappChannels.length > 0;

      const activation = getActivationStage({
        setupReady,
        onboardingViewedAt,
        firstLeadAt,
        firstHumanInterventionAt,
      });

      const action = getSuggestedAction({
        orgId: org.id,
        setupReady,
        onboardingViewedAt,
        firstLeadAt,
        firstHumanInterventionAt,
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        city: org.city ?? null,
        setupReady,
        activationStage: activation.stage,
        activationLabel: activation.label,
        onboardingViewed: Boolean(onboardingViewedAt),
        onboardingViewedAt: toIsoString(onboardingViewedAt),
        firstLead: Boolean(firstLeadAt),
        firstLeadAt: toIsoString(firstLeadAt),
        firstHumanIntervention: Boolean(firstHumanInterventionAt),
        firstHumanInterventionAt: toIsoString(firstHumanInterventionAt),
        activated: Boolean(firstHumanInterventionAt),
        timeToActivationHours: hoursBetween(onboardingViewedAt, firstHumanInterventionAt),
        timeToWowMinutes: minutesBetween(onboardingViewedAt, firstLeadAt),
        lastActivityAt: toIsoString(lastActivityAt),
        actionLabel: action.actionLabel,
        actionHref: action.actionHref,
      } satisfies ActivationOrgItem;
    })
    .sort((a, b) => {
      const priorityDiff = getPriorityScore(a) - getPriorityScore(b);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const activityA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const activityB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return activityB - activityA;
    });

  const totalOrganizations = organizationItems.length;
  const onboardingViewedCount = organizationItems.filter((item) => item.onboardingViewed).length;
  const firstLeadCount = organizationItems.filter((item) => item.firstLead).length;
  const firstHumanInterventionCount = organizationItems.filter(
    (item) => item.firstHumanIntervention,
  ).length;
  const activatedCount = organizationItems.filter((item) => item.activated).length;

  const wowTimes = organizationItems
    .map((item) => item.timeToWowMinutes)
    .filter((value): value is number => value !== null);
  const wowReachedCount = wowTimes.length;
  const wowUnder10MinCount = wowTimes.filter((value) => value <= 10).length;
  const medianTimeToWowMinutes = median(wowTimes);

  const toPercent = (count: number) =>
    totalOrganizations > 0 ? Math.round((count / totalOrganizations) * 100) : 0;

  return {
    summary: {
      totalOrganizations,
      onboardingViewedCount,
      firstLeadCount,
      firstHumanInterventionCount,
      activatedCount,
      wowReachedCount,
      wowUnder10MinCount,
      medianTimeToWowMinutes,
    },
    funnel: [
      {
        key: "onboarding",
        label: "Onboarding visto",
        count: onboardingViewedCount,
        percent: toPercent(onboardingViewedCount),
      },
      {
        key: "lead",
        label: "Primer lead",
        count: firstLeadCount,
        percent: toPercent(firstLeadCount),
      },
      {
        key: "human",
        label: "Primera intervencion",
        count: firstHumanInterventionCount,
        percent: toPercent(firstHumanInterventionCount),
      },
    ],
    organizations: organizationItems,
  };
}
