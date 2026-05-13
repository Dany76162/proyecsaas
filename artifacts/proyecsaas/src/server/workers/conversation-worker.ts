import {
  ConversationStatus,
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
  VisitAutomationError,
} from "@/modules/visits/service";

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
          subject: "WhatsApp chat",
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

  // 2.5 â€” Early return if an agent has taken manual control of this conversation
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

  const [availability, recentMessages] = await Promise.all([
    propertyMatch.property
      ? prisma.availabilitySlot.findMany({
          where: {
            organizationId: targetOrgId,
            propertyId: propertyMatch.property.id,
            isActive: true,
          },
          select: {
            id: true,
            label: true,
            weekday: true,
            startMinute: true,
            endMinute: true,
            timezone: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
          take: 6,
        })
      : Promise.resolve([]),
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
  ]);

  const decision: AutomationDecision = await generateAutomationDecision({
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
        }
      : null,
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
  });

  // Persist commercial signals into the Lead record (notes + conservative stage mapping)
  const nextLeadStatus =
    decision.qualificationDecision === "DISQUALIFIED"
      ? LeadStatus.CLOSED
      : decision.qualificationDecision === "QUALIFIED" &&
          (result.lead.status === LeadStatus.NEW || result.lead.status === LeadStatus.CONTACTED)
        ? LeadStatus.INTERESTED
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
      persistence = await prisma.message.create({
        data: {
          id: deterministicOutboundId,
          organizationId: targetOrgId,
          conversationId: result.conversation.id,
          direction: MessageDirection.OUTBOUND,
          body: decision.responseText,
          sentAt: new Date(),
          deliveryStatus: MessageDeliveryStatus.PENDING,
        },
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
              phoneNumberId: channel.phoneNumberId,
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
        },
      }),
    ]);

    await prisma.notification.create({
      data: {
        organizationId: targetOrgId,
        type: NotificationType.OPERATOR_ACTION_REQUIRED,
        title: `Follow-up needed: ${result.conversation.participantName || participantPhone}`,
        body: followUpReason,
        link: org ? `/${org.slug}/conversations` : undefined,
        entityType: "conversation",
        entityId: result.conversation.id,
      },
    });
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
