import {
  ConversationStatus,
  DevelopmentLotStatus,
  FollowUpCategory,
  LeadStatus,
  MessageDeliveryStatus,
  MessageDirection,
  NotificationType,
  Prisma,
} from "@prisma/client";

import { createHash } from "node:crypto";
import { Job, Worker } from "bullmq";

// âš ï¸ IMPORTANTE: usar prisma-worker (NO prisma normal)
import { prismaWorker as prisma } from "@/server/db/prisma-worker";

import { generateAutomationDecision } from "@/modules/automations/decision-service";
import {
  attemptSimulatedWhatsAppOutboundDelivery,
  attemptWhatsAppOutboundDelivery,
  type DeliveryAttemptResult,
} from "@/modules/automations/delivery-service";

import type {
  AutomationDecision,
  AutomationHandoffOutcome,
  AutomationOperatorHandoff,
  AutomationVisitCreationResult,
  AutomationWorkerStatus,
  PreparedConversationContext,
} from "@/modules/automations/types";

import {
  encodeCommercialSignalsInNotes,
  readLeadCommercialSignals,
} from "@/modules/leads/commercial-signals";
import { matchLeadToProperty } from "@/modules/properties/matching";

import { resolveConversationFollowUp } from "@/modules/conversations/follow-up";

import {
  createVisitForAutomation,
  createAgentVisit,
  cancelAgentVisitsForLead,
  VisitAutomationError,
} from "@/modules/visits/service";
import { earliestSlotOccurrenceIso } from "@/modules/automations/decision-service";

import { notifyNewLead, notifyHotLead } from "@/server/push/notify";

import { getQueueConnection } from "@/server/queues/connection";
import {
  resolveInboundByPhoneNumberId,
  resolveDatabaseChannelByInstanceName,
  stripRoutingCodeFromMessage,
  type ResolvedWhatsAppChannel,
} from "@/server/whatsapp/channel-resolver";

import {
  processPostVisitFollowUp,
  type PostVisitJobData,
} from "@/server/workers/post-visit-worker";
import { ACTIVATION_EVENTS, trackActivationEventOnce } from "@/server/activation/events";


// =========================
// TYPES
// =========================

export type WhatsAppInboundJobData = {
  source: "whatsapp";
  provider?: "whatsapp" | "evolution";
  organizationId?: string;
  channel: {
    phoneNumberId?: string;
    instanceName?: string;
    accessToken?: string;
  };
  contact: {
    name?: string;
    phone?: string;
  };
  message: {
    externalId: string | null;
    from: string | null;
    timestamp: string | null;
    type: string;
    body: string;
  };
};

type ProcessWhatsAppInboundOptions = {
  deliveryMode?: "runtime" | "simulate";
  channelOverride?: ResolvedWhatsAppChannel;
};


// =========================
// ERROR CLASS
// =========================

export class ConversationWorkerError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ConversationWorkerError";
  }
}


// =========================
// HELPERS
// =========================

function normalizePhone(value?: string | null) {
  return value?.trim() || null;
}

function normalizeBody(value: string | null | undefined) {
  return value?.trim() || "";
}

function resolveSentAt(value: string | null) {
  if (!value) return new Date();

  const num = Number(value);
  if (!Number.isNaN(num)) return new Date(num * 1000);

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}


// =========================
// CORE PROCESS
// =========================

export async function processWhatsAppInboundJob(
  data: WhatsAppInboundJobData,
  options: ProcessWhatsAppInboundOptions = {},
) {
  const phoneNumberId = data.channel.phoneNumberId;
  const instanceName = data.channel.instanceName;

  // 1. Resolve Channel (Web o DB)
  let channel: ResolvedWhatsAppChannel | null | undefined = options.channelOverride;

  if (!channel) {
    if (instanceName) {
      channel = await resolveDatabaseChannelByInstanceName(prisma, instanceName);
    } else if (phoneNumberId) {
      channel = await resolveInboundByPhoneNumberId(prisma, phoneNumberId);
    }
  }

  if (!channel) {
    throw new ConversationWorkerError(
      "missing-channel",
      `No WhatsApp channel configured for ${instanceName ? `instance: ${instanceName}` : `phone number ID: ${phoneNumberId}`}`,
    );
  }

  const participantPhone = normalizePhone(data.contact.phone ?? data.message.from);

  // Strip the platform routing code ([ref:slug]) before processing so the AI
  // sees clean text. The routing already happened in the webhook.
  const rawMessageBody = normalizeBody(data.message.body);
  const messageBody = stripRoutingCodeFromMessage(rawMessageBody);

  if (!participantPhone) {
    throw new ConversationWorkerError("missing-phone", "Participant phone is missing.");
  }

  // Solo procesamos texto por ahora en automatización
  if (data.message.type !== "text") {
    return { status: "ignored", reason: "unsupported-message-type" } as const;
  }

  if (!messageBody) {
    return { status: "ignored", reason: "empty-message-body" } as const;
  }

  const sentAt = resolveSentAt(data.message.timestamp);
  const participantName = data.contact.name?.trim() || "Unknown contact";

  // Determine the target organization.
  // Priority: job-provided org (from routing code) > channel's org > existing conversation's org
  let targetOrgId = data.organizationId ?? channel.organizationId;

  if (!targetOrgId) {
    // Return message with no routing code: find existing conversation by phone
    const existingConv = await prisma.conversation.findFirst({
      where: {
        participantPhone,
        status: { not: ConversationStatus.CLOSED },
      },
      orderBy: { lastMessageAt: "desc" },
      select: { organizationId: true },
    });

    if (existingConv) {
      targetOrgId = existingConv.organizationId;
    } else {
      throw new ConversationWorkerError(
        "missing-org",
        `Cannot determine organization for phone ${participantPhone} â€” no routing code and no existing conversation.`,
      );
    }
  }

  // 2. Persistencia atómica (Conversation + Inbound Message)
  let createdFirstLead = false;
  let leadWasCreated = false;

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let conversation = await tx.conversation.findFirst({
      where: {
        organizationId: targetOrgId,
        participantPhone,
        status: { not: ConversationStatus.CLOSED },
      },
    });

    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          organizationId: targetOrgId,
          participantName,
          participantPhone,
          channel: "whatsapp",
          subject: "Chat de WhatsApp",
          status: ConversationStatus.OPEN,
          lastMessageAt: sentAt,
        },
      });
    } else {
      conversation = await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: sentAt,
          status: ConversationStatus.OPEN, // Reabrir si estaba en snooze/espera
        },
      });
    }

    let lead = await tx.lead.findFirst({
      where: {
        organizationId: targetOrgId,
        phone: participantPhone,
      },
    });

    if (!lead) {
      const leadCountBefore = await tx.lead.count({
        where: {
          organizationId: targetOrgId,
        },
      });

      lead = await tx.lead.create({
        data: {
          organizationId: targetOrgId,
          fullName: participantName,
          phone: participantPhone,
          status: LeadStatus.NEW,
          source: "WhatsApp",
        },
      });

      createdFirstLead = leadCountBefore === 0;
      leadWasCreated = true;
    }

    let message = data.message.externalId
      ? await tx.message.findUnique({ where: { externalId: data.message.externalId } })
      : null;

    if (!message) {
      message = await tx.message.create({
        data: {
          organizationId: targetOrgId,
          conversationId: conversation.id,
          externalId: data.message.externalId,
          direction: MessageDirection.INBOUND,
          body: messageBody,
          senderName: participantName,
          senderPhone: participantPhone,
          sentAt,
          deliveryStatus: MessageDeliveryStatus.RECEIVED,
        },
      });
    }

    return { conversation, lead, message };
  });

  if (leadWasCreated) {
    await notifyNewLead(targetOrgId, result.lead.fullName, result.conversation.id);
  }

  if (createdFirstLead) {
    await trackActivationEventOnce(prisma, {
      event: ACTIVATION_EVENTS.firstLeadCreated,
      organizationId: targetOrgId,
      metadata: {
        source: "whatsapp_worker",
        leadId: result.lead.id,
        conversationId: result.conversation.id,
      },
    });
  }

  // 2.3 — Check subscription, execute Lazy Reset and validate AI status (SaaS-to-Own isolation)
  let subscription = await prisma.subscription.findUnique({
    where: { organizationId: targetOrgId },
    select: { 
      status: true, 
      aiStatus: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      aiMonthlyConversationLimit: true,
      aiMonthlyConversationsUsed: true,
    },
  });

  if (subscription) {
    const now = new Date();
    if (now >= subscription.currentPeriodEnd) {
      // Executing Lazy Reset of the commercial cycle
      const nextStart = subscription.currentPeriodEnd;
      const nextEnd = new Date(nextStart);
      nextEnd.setMonth(nextEnd.getMonth() + 1);

      // Reactivate only if previously paused due to limit exhaustion
      const isLimitExceeded = subscription.aiMonthlyConversationsUsed >= subscription.aiMonthlyConversationLimit;
      const nextAiStatus = (subscription.aiStatus === "PAUSED" && isLimitExceeded) ? "ACTIVE" : subscription.aiStatus;

      subscription = await prisma.subscription.update({
        where: { organizationId: targetOrgId },
        data: {
          aiMonthlyConversationsUsed: 0,
          aiStatus: nextAiStatus,
          currentPeriodStart: nextStart,
          currentPeriodEnd: nextEnd,
        },
        select: {
          status: true,
          aiStatus: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          aiMonthlyConversationLimit: true,
          aiMonthlyConversationsUsed: true,
        },
      });

      console.log(
        JSON.stringify({
          scope: "commercial-audit",
          event: "ai-usage-reset",
          organizationId: targetOrgId,
          previousUsed: subscription.aiMonthlyConversationsUsed,
          limit: subscription.aiMonthlyConversationLimit,
          aiStatus: nextAiStatus,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  if (subscription?.status === "SUSPENDED") {
    return { status: "ignored" as const, reason: "subscription-suspended" };
  }

  if (subscription?.aiStatus === "PAUSED" || subscription?.aiStatus === "DISABLED") {
    return { status: "ignored" as const, reason: "ai-paused" };
  }

  // Pre-check limits: if already exceeded, pause immediately and ignore message
  if (
    subscription &&
    subscription.aiMonthlyConversationsUsed >= subscription.aiMonthlyConversationLimit
  ) {
    // Auto-pause AI status
    await prisma.subscription.update({
      where: { organizationId: targetOrgId },
      data: { aiStatus: "PAUSED" },
    });

    console.log(
      JSON.stringify({
        scope: "commercial-audit",
        event: "ai-auto-paused",
        organizationId: targetOrgId,
        used: subscription.aiMonthlyConversationsUsed,
        limit: subscription.aiMonthlyConversationLimit,
        reason: "monthly-limit-reached",
        timestamp: new Date().toISOString(),
      })
    );

    return { status: "ignored" as const, reason: "quota-limit-exceeded" };
  }

  // 2.5 — Early return if an agent has taken manual control of this conversation
  if (result.conversation.isHumanControlled) {
    return { status: "ignored" as const, reason: "human-controlled" };
  }

  // 3. Prepare context with real inventory matching before generating the decision
  const priorSignals = readLeadCommercialSignals({
    notes: result.lead.notes,
    interestLabel: result.lead.interestLabel,
    budgetLabel: result.lead.budgetLabel,
  });
  let propertyMatch = await matchLeadToProperty(prisma, {
    organizationId: targetOrgId,
    currentPropertyId: result.lead.propertyId,
    latestMessageBody: messageBody,
    extractedPreferences: priorSignals.extractedPreferences,
  });

  if (
    result.lead.propertyId &&
    priorSignals.propertyMatch?.propertyId === result.lead.propertyId &&
    (priorSignals.propertyMatch.status === "manual-confirmed" ||
      priorSignals.propertyMatch.status === "manual-overridden")
  ) {
    propertyMatch = {
      ...propertyMatch,
      trace: {
        ...priorSignals.propertyMatch,
        propertyId: propertyMatch.property?.id ?? priorSignals.propertyMatch.propertyId,
        propertyTitle: propertyMatch.property?.title ?? priorSignals.propertyMatch.propertyTitle,
        shortlist:
          priorSignals.propertyMatch.shortlist.length
            ? priorSignals.propertyMatch.shortlist
            : propertyMatch.trace.shortlist,
      },
    };
  }

  if (propertyMatch.trace.status !== "no-match") {
    console.log(
      JSON.stringify({
        scope: "worker",
        event: "lead-property-match",
        organizationId: targetOrgId,
        leadId: result.lead.id,
        conversationId: result.conversation.id,
        propertyId: propertyMatch.trace.propertyId,
        status: propertyMatch.trace.status,
        score: propertyMatch.trace.score,
        reasons: propertyMatch.trace.reasons,
      }),
    );
  } else {
    console.log(
      JSON.stringify({
        scope: "worker",
        event: "lead-property-no-match",
        organizationId: targetOrgId,
        leadId: result.lead.id,
        conversationId: result.conversation.id,
        reasons: propertyMatch.trace.reasons,
        consideredSignals: propertyMatch.trace.consideredSignals,
      }),
    );
  }

  if (
    propertyMatch.property &&
    (result.lead.propertyId !== propertyMatch.property.id ||
      result.conversation.propertyId !== propertyMatch.property.id)
  ) {
    await prisma.$transaction([
      ...(result.lead.propertyId !== propertyMatch.property.id
        ? [
            prisma.lead.update({
              where: { id: result.lead.id },
              data: { propertyId: propertyMatch.property.id },
            }),
          ]
        : []),
      prisma.conversation.update({
        where: { id: result.conversation.id },
        data: {
          propertyId: propertyMatch.property.id,
          propertyContextNote: propertyMatch.trace.reasons.join(" "),
        },
      }),
    ]);

    result.lead.propertyId = propertyMatch.property.id;
    result.conversation.propertyId = propertyMatch.property.id;
  }

  const [recentMessages, aiAgent, availableLots, orgRecord, propertyDetail] = await Promise.all([
    prisma.message.findMany({
      where: {
        organizationId: targetOrgId,
        conversationId: result.conversation.id,
      },
      select: {
        id: true,
        direction: true,
        body: true,
        sentAt: true,
        senderName: true,
        senderPhone: true,
      },
      orderBy: {
        sentAt: "desc",
      },
      take: 8,
    }),
    prisma.aiAgent.findUnique({
      where: { organizationId: targetOrgId },
      select: {
        name: true,
        tone: true,
        persona: true,
        zoneFilters: true,
        propertyTypes: true,
        minBudget: true,
        maxBudget: true,
        escalateOnKeywords: true,
        humanHandoffMessage: true,
      },
    }),
    prisma.developmentLot.findMany({
      where: {
        organizationId: targetOrgId,
        status: DevelopmentLotStatus.AVAILABLE,
      },
      select: {
        id: true,
        developmentId: true,
        lotNumber: true,
        areaSqm: true,
        priceCents: true,
        currency: true,
        manzana: true,
        etapaNombre: true,
        destino: true,
        frontMeters: true,
        backMeters: true,
        Development: {
          select: { name: true, city: true },
        },
      },
      orderBy: [{ Development: { name: "asc" } }, { lotNumber: "asc" }],
      take: 20,
    }),
    prisma.organization.findUnique({
      where: { id: targetOrgId },
      select: { slug: true },
    }),
    // Detalle completo de la propiedad matcheada para que la IA pueda responder
    // ambientes/baños/superficie/amenities/descripción sin tener que derivar.
    // Best-effort (.catch) por si faltan columnas en una DB legacy.
    propertyMatch.property
      ? prisma.property
          .findUnique({
            where: { id: propertyMatch.property.id },
            select: {
              rooms: true,
              bedrooms: true,
              bathrooms: true,
              surfaceM2: true,
              parkingSpots: true,
              amenities: true,
              description: true,
              operationType: true,
              services: true,
            },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  // Horarios para proponer visitas. Se traen: (a) los GENERALES de la org
  // (propertyId y developmentId null) — sirven para todo; (b) los de la
  // PROPIEDAD matcheada; (c) los del/los DESARROLLO(S) de los lotes ofrecidos.
  // Así un desarrollo/urbanización puede tener agenda propia (ej. Valles del Pino
  // los sáb/dom) sin que aplique a otras zonas.
  const lotDevelopmentIds = [
    ...new Set(availableLots.map((l) => l.developmentId).filter((id): id is string => Boolean(id))),
  ];
  const availability = await prisma.availabilitySlot
    .findMany({
      where: {
        organizationId: targetOrgId,
        isActive: true,
        OR: [
          { propertyId: null, developmentId: null },
          ...(propertyMatch.property ? [{ propertyId: propertyMatch.property.id }] : []),
          ...(lotDevelopmentIds.length ? [{ developmentId: { in: lotDevelopmentIds } }] : []),
        ],
      },
      select: {
        id: true,
        label: true,
        weekday: true,
        startMinute: true,
        endMinute: true,
        timezone: true,
        user: { select: { fullName: true } },
      },
      orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
      take: 6,
    })
    .catch(() => []);

  // ── AG-4C: escalateOnKeywords early-return ───────────────────────────────
  // If the latest inbound message matches any keyword configured in the agent,
  // short-circuit to a deterministic handoff without calling OpenAI.
  const latestInboundBody = [...recentMessages]
    .reverse()
    .find((m) => m.direction === "INBOUND")?.body ?? "";

  function normalizeForKeyword(s: string) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // Match por PALABRA COMPLETA (no subcadena) y con keywords de >=3 chars, para
  // evitar derivaciones erróneas: antes "ola" matcheaba "hola", "lote" matcheaba
  // "lotes", etc., y el agente derivaba con casi cualquier mensaje.
  const normalizedBody = normalizeForKeyword(latestInboundBody);
  const triggeredKeyword =
    aiAgent?.escalateOnKeywords && aiAgent.escalateOnKeywords.length > 0
      ? aiAgent.escalateOnKeywords
          .map((kw) => normalizeForKeyword(kw.trim()))
          .filter((kw) => kw.length >= 3)
          .find((kw) => {
            const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return new RegExp(`(^|\\W)${escaped}(\\W|$)`).test(normalizedBody);
          })
      : undefined;

  // Base pública para links absolutos (WhatsApp necesita la URL completa) y
  // helpers para redondear medidas (evitar decimales largos tipo 550.00000005).
  const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const absUrl = (path: string | null) => (path ? `${appBase}${path}` : null);
  const roundM2 = (v: number | null) => (v != null ? Math.round(v) : null);
  const roundM = (v: number | null) => (v != null ? Math.round(v * 10) / 10 : null);
  // Precio ya formateado (priceCents está en CENTAVOS): así la IA no tiene que
  // dividir por 100 (lo hacía mal y mostraba 1.870.000 en vez de 18.700).
  const fmtPrice = (cents: number | null, currency: string | null) =>
    cents != null ? `${currency || "USD"} ${Math.round(cents / 100).toLocaleString("es-AR")}` : null;

  let decision: AutomationDecision;

  if (triggeredKeyword) {
    const handoffText =
      aiAgent?.humanHandoffMessage?.trim() ||
      "Te comunico con un asesor para que pueda ayudarte mejor.";

    decision = {
      responseText: handoffText,
      qualificationDecision: null,
      visitIntent: null,
      leadTemperature: "unclear",
      extractedPreferences: { budget: null, zones: [], rooms: null, purpose: null },
      nextBestAction: "derivar-a-asesor",
      requiresFollowUp: true,
      followUpReason: "Keyword de derivación configurada por el agente.",
      visitProposal: null,
      internalNotes: `Escalation keyword matched: "${triggeredKeyword}". Handoff issued without calling OpenAI.`,
    };
  } else {
    decision = await generateAutomationDecision({
    conversation: {
      id: result.conversation.id,
      channel: "whatsapp",
      status: result.conversation.status,
      participantName: result.conversation.participantName || "Unknown",
      participantPhone: result.conversation.participantPhone || "",
      lastMessageAt: (result.conversation.lastMessageAt || new Date()).toISOString(),
    },
    lead: {
      id: result.lead.id,
      fullName: result.lead.fullName,
      status: result.lead.status,
      phone: result.lead.phone ?? "",
      email: result.lead.email,
      propertyId: propertyMatch.property?.id ?? result.lead.propertyId,
    },
    property: propertyMatch.property
      ? {
          id: propertyMatch.property.id,
          title: propertyMatch.property.title,
          address: propertyMatch.property.address,
          city: propertyMatch.property.city,
          neighborhood: propertyMatch.property.neighborhood,
          propertyType: propertyMatch.property.propertyType,
          status: propertyMatch.property.status,
          priceCents: propertyMatch.property.priceCents,
          currency: propertyMatch.property.currency,
          priceLabel: fmtPrice(propertyMatch.property.priceCents, propertyMatch.property.currency),
          operationType: propertyDetail?.operationType ?? null,
          rooms: propertyDetail?.rooms ?? null,
          bedrooms: propertyDetail?.bedrooms ?? propertyMatch.property.bedrooms ?? null,
          bathrooms: propertyDetail?.bathrooms ?? null,
          surfaceM2: roundM2(propertyDetail?.surfaceM2 ?? null),
          parkingSpots: propertyDetail?.parkingSpots ?? null,
          amenities: propertyDetail?.amenities ?? null,
          description: propertyDetail?.description ?? null,
          services: propertyDetail?.services ?? null,
          publicUrl: absUrl(orgRecord?.slug ? `/cat/${orgRecord.slug}/${propertyMatch.property.id}` : null),
        }
      : null,
    catalogUrl: absUrl(orgRecord?.slug ? `/cat/${orgRecord.slug}` : null),
    propertyMatch: {
      status: propertyMatch.trace.status,
      score: propertyMatch.trace.score,
      reasons: propertyMatch.trace.reasons,
      consideredSignals: propertyMatch.trace.consideredSignals,
    },
    availability: availability.map((slot) => ({
      id: slot.id,
      label: slot.label,
      weekday: slot.weekday,
      startMinute: slot.startMinute,
      endMinute: slot.endMinute,
      timezone: slot.timezone,
      userName: slot.user?.fullName ?? null,
    })),
    recentMessages: [...recentMessages]
      .reverse()
      .map((message) => ({
        id: message.id,
        direction: message.direction,
        body: message.body,
        sentAt: message.sentAt.toISOString(),
        senderName: message.senderName,
        senderPhone: message.senderPhone,
      })),
    aiAgent: aiAgent
      ? {
          name: aiAgent.name,
          tone: aiAgent.tone as "FORMAL" | "FRIENDLY" | "NEUTRAL",
          persona: aiAgent.persona,
          zoneFilters: aiAgent.zoneFilters,
          propertyTypes: aiAgent.propertyTypes,
          minBudget: aiAgent.minBudget,
          maxBudget: aiAgent.maxBudget,
        }
      : null,
    lots: availableLots.map((lot) => ({
      id: lot.id,
      developmentId: lot.developmentId,
      lotNumber: lot.lotNumber,
      developmentName: lot.Development.name,
      developmentCity: lot.Development.city,
      areaSqm: roundM2(lot.areaSqm),
      priceCents: lot.priceCents,
      currency: lot.currency,
      priceLabel: fmtPrice(lot.priceCents, lot.currency),
      manzana: lot.manzana,
      etapaNombre: lot.etapaNombre,
      destino: lot.destino,
      frontMeters: roundM(lot.frontMeters),
      backMeters: roundM(lot.backMeters),
      publicUrl: absUrl(orgRecord?.slug ? `/cat/${orgRecord.slug}/developments/${lot.developmentId}/lots/${lot.id}` : null),
    })),
  }, { organizationId: targetOrgId, db: prisma });
  } // end else (no escalation keyword)

  // Persist commercial signals into the Lead record (notes + conservative stage mapping)
  const nextLeadStatus =
    decision.qualificationDecision === "DISQUALIFIED"
      ? LeadStatus.CLOSED
      : decision.qualificationDecision === "QUALIFIED" &&
          (result.lead.status === LeadStatus.NEW || result.lead.status === LeadStatus.CONTACTED)
        ? LeadStatus.INTERESTED
        : null;

  // Vincular el lead a un DESARROLLO (paridad CRM con propiedades): si hay un
  // único loteo con lotes disponibles y el lead muestra interés real, queda
  // asociado a ese desarrollo (así deja de figurar "sin propiedad vinculada").
  const singleDevToLink =
    lotDevelopmentIds.length === 1 &&
    (decision.qualificationDecision === "QUALIFIED" ||
      Boolean(decision.visitIntent?.requested) ||
      decision.leadTemperature === "hot" ||
      decision.leadTemperature === "warm")
      ? lotDevelopmentIds[0]
      : null;

  await prisma.lead.update({
    where: { id: result.lead.id },
    data: {
      notes: encodeCommercialSignalsInNotes(
        result.lead.notes,
        decision,
        propertyMatch.trace,
        decision.internalNotes ?? null,
      ),
      ...(singleDevToLink ? { developmentId: singleDevToLink } : {}),
      ...(nextLeadStatus ? { status: nextLeadStatus, lastContactAt: new Date() } : {}),
    },
  });

  // 4. Visit Creation (if proposed and concrete)
  let visitResult: AutomationVisitCreationResult = {
    proposalPresent: false,
    concrete: false,
    created: false,
    reason: "no-proposal",
  };

  if (decision.visitProposal?.proposed) {
    visitResult.proposalPresent = true;
    const scheduledAt = decision.visitProposal.scheduledAt ? new Date(decision.visitProposal.scheduledAt) : null;

    if (scheduledAt && !Number.isNaN(scheduledAt.getTime())) {
      visitResult.concrete = true;
      try {
        const outcome = await createVisitForAutomation(prisma, {
          organizationId: targetOrgId,
          leadId: result.lead.id,
          scheduledAt,
          notes: decision.internalNotes || "Auto-scheduled from WhatsApp",
        });

        visitResult.created = true;
        visitResult.reason = "created";
        visitResult.visitId = outcome.visit.id;
      } catch (error) {
        visitResult.created = false;
        visitResult.reason = "creation-failed-safe";
        visitResult.errorCode = error instanceof VisitAutomationError ? error.code : "unknown";
      }
    } else {
      visitResult.reason = "proposal-not-concrete";
    }
  }

  // 5. Delivery if applicable
  let deliveryResult: DeliveryAttemptResult | undefined;

  if (decision.responseText) {
    const deterministicOutboundId = `rep_${result.message.id}`;

    let persistence = await prisma.message.findUnique({
      where: {
        id: deterministicOutboundId,
      },
    });

    if (!persistence) {
      persistence = await prisma.$transaction(async (tx) => {
        const msg = await tx.message.create({
          data: {
            id: deterministicOutboundId,
            organizationId: targetOrgId,
            conversationId: result.conversation.id,
            direction: MessageDirection.OUTBOUND,
            body: decision.responseText!,
            sentAt: new Date(),
            deliveryStatus: MessageDeliveryStatus.PENDING,
          },
        });

        // Query existing AI responses in this conversation during the current active cycle
        const outboundCount = await tx.message.count({
          where: {
            conversationId: result.conversation.id,
            id: {
              startsWith: "rep_",
              not: deterministicOutboundId, // exclude current message
            },
            sentAt: {
              gte: subscription!.currentPeriodStart,
            },
          },
        });

        if (outboundCount === 0) {
          // Increment the monthly used conversations atomically
          const updatedSub = await tx.subscription.update({
            where: { organizationId: targetOrgId },
            data: {
              aiMonthlyConversationsUsed: {
                increment: 1,
              },
            },
            select: {
              aiMonthlyConversationsUsed: true,
              aiMonthlyConversationLimit: true,
            },
          });

          console.log(
            JSON.stringify({
              scope: "commercial-audit",
              event: "ai-conversation-counted",
              organizationId: targetOrgId,
              conversationId: result.conversation.id,
              messageId: deterministicOutboundId,
              used: updatedSub.aiMonthlyConversationsUsed,
              limit: updatedSub.aiMonthlyConversationLimit,
              timestamp: new Date().toISOString(),
            })
          );

          // If the limit has been reached, auto-pause AI immediately
          if (updatedSub.aiMonthlyConversationsUsed >= updatedSub.aiMonthlyConversationLimit) {
            await tx.subscription.update({
              where: { organizationId: targetOrgId },
              data: { aiStatus: "PAUSED" },
            });

            console.log(
              JSON.stringify({
                scope: "commercial-audit",
                event: "ai-auto-paused",
                organizationId: targetOrgId,
                used: updatedSub.aiMonthlyConversationsUsed,
                limit: updatedSub.aiMonthlyConversationLimit,
                reason: "monthly-limit-reached",
                timestamp: new Date().toISOString(),
              })
            );
          }
        }

        return msg;
      });
    }

    if (
      persistence.deliveryStatus === MessageDeliveryStatus.SENT ||
      persistence.deliveryStatus === MessageDeliveryStatus.SKIPPED ||
      persistence.deliveryStatus === MessageDeliveryStatus.RECEIVED
    ) {
      deliveryResult = {
        deliveryStatus:
          persistence.deliveryStatus === MessageDeliveryStatus.SKIPPED ? "skipped" : "delivered",
        providerMessageId: persistence.externalId ?? undefined,
        sendAttempted: false,
        reason: "already-processed",
        awaitingRealDelivery: false,
        attemptedAt: null,
        channel: { provider: "whatsapp", phoneNumberId: channel.phoneNumberId },
      };
    } else {
      const deliveryInput = {
        organizationId: targetOrgId,
        conversationId: result.conversation.id,
        outboundMessageId: persistence.id,
        responseText: decision.responseText,
        recipientPhone: participantPhone,
        senderKind: "automation" as const,
        channel: {
          provider: channel.provider,
          phoneNumberId: channel.phoneNumberId,
          instanceName: channel.instanceName,
          accessToken: channel.accessToken,
        },
      };

      deliveryResult =
        options.deliveryMode === "simulate"
          ? await attemptSimulatedWhatsAppOutboundDelivery({
              phoneNumberId: channel.phoneNumberId ?? "",
              responseText: decision.responseText,
            })
          : await attemptWhatsAppOutboundDelivery(prisma, deliveryInput);

      await prisma.message.update({
        where: { id: persistence.id },
        data: {
          deliveryStatus:
            deliveryResult.deliveryStatus === "delivered"
              ? MessageDeliveryStatus.SENT
              : deliveryResult.deliveryStatus === "skipped"
                ? MessageDeliveryStatus.SKIPPED
                : MessageDeliveryStatus.FAILED,
          externalId: deliveryResult.providerMessageId,
          deliveryError:
            deliveryResult.deliveryStatus !== "delivered" ? deliveryResult.reason : null,
        },
      });
    }

    if (deliveryResult && deliveryResult.deliveryStatus !== "delivered") {
      console.warn(
        JSON.stringify({
          scope: "worker",
          event: "outbound-delivery-failed",
          organizationId: targetOrgId,
          conversationId: result.conversation.id,
          leadId: result.lead.id,
          outboundMessageId: persistence.id,
          providerMessageId: deliveryResult.providerMessageId ?? null,
          deliveryStatus: deliveryResult.deliveryStatus,
          sendAttempted: deliveryResult.sendAttempted,
          awaitingRealDelivery: deliveryResult.awaitingRealDelivery,
          attemptedAt: deliveryResult.attemptedAt,
          reason: deliveryResult.reason,
          deliveryMode: options.deliveryMode ?? "runtime",
          phoneNumberId: channel.phoneNumberId,
          instanceName: channel.instanceName,
        }),
      );
    }
  }

  if (decision.requiresFollowUp) {
    const followUpReason =
      decision.followUpReason ?? "Automation flagged this conversation for follow-up.";

    // Pausan la IA: (a) handoff EXPLÍCITO ("derivar-a-asesor": el cliente pidió una
    // persona o matcheó una palabra clave de derivación) y (b) confirmación de
    // visita ("confirmar-visita-con-humano": el cliente aceptó un horario y el OK
    // final lo da el humano). Los demás follow-ups (lead caliente, falta de info)
    // NO la callan: la IA sigue respondiendo y calificando, y la alerta se manda igual.
    const isExplicitHandoff = decision.nextBestAction === "derivar-a-asesor";
    const isVisitConfirm = decision.nextBestAction === "confirmar-visita-con-humano";
    const isVisitCancel = decision.nextBestAction === "cancelar-visita-con-humano";
    const pausesAi = isExplicitHandoff || isVisitConfirm;

    const [org] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: targetOrgId },
        select: { slug: true },
      }),
      prisma.conversation.update({
        where: { id: result.conversation.id },
        data: {
          followUpActive: true,
          followUpCategory: FollowUpCategory.COMMERCIAL,
          followUpReason,
          followUpActiveAt: new Date(),
          nextBestAction: decision.nextBestAction,
          nextBestActionAt: new Date(),
          isHumanControlled: pausesAi,
        },
      }),
    ]);

    await prisma.notification.create({
      data: {
        organizationId: targetOrgId,
        type: NotificationType.OPERATOR_ACTION_REQUIRED,
        title: `Seguimiento requerido: ${result.conversation.participantName || participantPhone}`,
        body: followUpReason,
        link: org ? `/${org.slug}/conversations` : undefined,
        entityType: "conversation",
        entityId: result.conversation.id,
      },
    });

    // Push de "prospecto caliente" a la app móvil. Se dispara: (a) la primera vez
    // que la conversación se flaguea para follow-up, o (b) en el momento del
    // handoff (derivación) aunque ya estuviera flagueada. Deduplicado por la
    // transición de estado para no spamear.
    const isHandoffTransition = pausesAi && !result.conversation.isHumanControlled;
    // La cancelación es un evento puntual accionable: avisá aunque la
    // conversación ya estuviera flagueada para follow-up.
    if (
      (!result.conversation.followUpActive || isHandoffTransition || isVisitCancel) &&
      org?.slug
    ) {
      const prefs = decision.extractedPreferences;
      const isHot = decision.leadTemperature === "hot";
      // Para confirmación de visita, el resumen es el día/horario pedido
      // (followUpReason). Para los demás, zona/presupuesto/interés.
      const summary =
        isVisitConfirm || isVisitCancel
          ? followUpReason
          : [
              prefs?.zones?.[0] || null,
              prefs?.budget ? `presup. ${prefs.budget}` : null,
              isHot ? "muy interesado" : null,
            ]
              .filter(Boolean)
              .join(" · ") || followUpReason;
      // Motivos para que la app avise: el cliente aceptó un horario y tenés que
      // confirmar la visita; el cliente canceló una visita y hay que sacarla del
      // CRM; prospecto caliente; o el cliente pregunta algo que la IA no puede
      // responder y necesita un humano.
      const pushTitle = isVisitConfirm
        ? "📅 Confirmá la visita"
        : isVisitCancel
          ? "❌ Visita cancelada — sacala del CRM"
          : isHot
            ? "🔥 Prospecto caliente"
            : "❓ Un prospecto necesita tu respuesta";
      await notifyHotLead(
        targetOrgId,
        org.slug,
        result.conversation.participantName || participantPhone,
        summary,
        result.conversation.id,
        pushTitle,
      ).catch(() => {});
    }

    // Agenda/CRM: el cliente aceptó un horario → creamos la visita como PENDING
    // (aparece en /visits y en "En Visita" para que vos la confirmes). El cliente
    // canceló → marcamos sus visitas activas como CANCELED (no se borran).
    if (isVisitConfirm) {
      const proposedIso =
        decision.visitProposal?.scheduledAt &&
        !Number.isNaN(new Date(decision.visitProposal.scheduledAt).getTime())
          ? decision.visitProposal.scheduledAt
          : null;
      const scheduledIso = proposedIso ?? earliestSlotOccurrenceIso(availability);

      if (scheduledIso) {
        const targetDevelopmentId = lotDevelopmentIds[0] ?? null;
        const targetLabel =
          propertyMatch.property?.title ??
          availableLots.find((l) => l.developmentId === targetDevelopmentId)?.Development.name ??
          availableLots[0]?.Development.name ??
          "Visita";

        await createAgentVisit(prisma, {
          organizationId: targetOrgId,
          leadId: result.lead.id,
          scheduledAt: new Date(scheduledIso),
          propertyId: propertyMatch.property?.id ?? null,
          developmentId: targetDevelopmentId,
          targetLabel,
          notes: followUpReason,
        }).catch((err) => {
          console.error(
            JSON.stringify({
              scope: "conversation-worker",
              event: "agent-visit-create-failed",
              conversationId: result.conversation.id,
              error: err instanceof Error ? err.message : "unknown",
            }),
          );
        });
      }
    } else if (isVisitCancel) {
      await cancelAgentVisitsForLead(prisma, targetOrgId, result.lead.id).catch(() => 0);
    }
  }

  return {
    status: "processed" as AutomationWorkerStatus,
    conversationId: result.conversation.id,
    leadId: result.lead.id,
    decision,
    delivery: deliveryResult,
    visit: visitResult,
  };
}


// =========================
// WORKER SETUP
// =========================

export function createConversationWorker() {
  const worker = new Worker<WhatsAppInboundJobData | PostVisitJobData>(
    "automation-jobs",
    async (job) => {
      console.log(
        JSON.stringify({
          scope: "worker",
          event: "job-start",
          jobId: job.id,
          name: job.name,
        }),
      );

      try {
        if (job.name === "whatsapp-inbound") {
          const outcome = await processWhatsAppInboundJob(job.data as WhatsAppInboundJobData);
          return outcome;
        }

        if (job.name === "post-visit-follow-up") {
          const outcome = await processPostVisitFollowUp(job.data as PostVisitJobData);
          return outcome;
        }

        return { status: "ignored", reason: "unknown-job-name" };
      } catch (error) {
        console.error(
          JSON.stringify({
            scope: "worker",
            event: "job-failed",
            jobId: job.id,
            error: error instanceof Error ? error.message : "unknown",
            stack: error instanceof Error ? error.stack : undefined,
          }),
        );
        throw error;
      }
    },
    {
      connection: getQueueConnection(),
      concurrency: 5,
    },
  );

  worker.on("ready", () => {
    console.log(JSON.stringify({ scope: "worker", event: "ready" }));
  });

  return worker;
}
