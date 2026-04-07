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

// ⚠️ IMPORTANTE: usar prisma-worker (NO prisma normal)
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
import { getCatalogUrl, getPropertyPublicUrl } from "@/lib/catalog-urls";

import { resolveConversationFollowUp } from "@/modules/conversations/follow-up";

import {
  createVisitForAutomation,
  VisitAutomationError,
} from "@/modules/visits/service";

import { getQueueConnection } from "@/server/queues/connection";
import { resolveInboundByPhoneNumberId } from "@/server/whatsapp/channel-resolver";
import { isOrgSubscriptionActiveForWorker } from "@/server/billing/subscription-guard-worker";
import { notifyHumanInterventionRequired } from "@/server/notifications/email-service";

import {
  processPostVisitFollowUp,
  type PostVisitJobData,
} from "@/server/workers/post-visit-worker";


// =========================
// TYPES
// =========================

export type WhatsAppInboundJobData = {
  source: "whatsapp";
  organizationId?: string;
  channel: {
    phoneNumberId: string;
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

type AutomationChannelContext = {
  organizationId: string;
  phoneNumberId: string;
  accessToken?: string;
};

type ProcessWhatsAppInboundOptions = {
  deliveryMode?: "runtime" | "simulate";
  channelOverride?: AutomationChannelContext;
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

  // 1. Resolve Channel (Web o DB)
  const channel =
    options.channelOverride && options.channelOverride.phoneNumberId === phoneNumberId
      ? options.channelOverride
      : await resolveInboundByPhoneNumberId(prisma, phoneNumberId);

  if (!channel) {
    throw new ConversationWorkerError(
      "missing-channel",
      `No WhatsApp channel configured for phone number ID: ${phoneNumberId}`,
    );
  }

  const participantPhone = normalizePhone(data.contact.phone ?? data.message.from);
  const messageBody = normalizeBody(data.message.body);

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

  // 2. Persistencia atómica (Conversation + Inbound Message)
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let conversation = await tx.conversation.findFirst({
      where: {
        organizationId: channel.organizationId,
        participantPhone,
        status: { not: ConversationStatus.CLOSED },
      },
    });

    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          organizationId: channel.organizationId,
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
        organizationId: channel.organizationId,
        phone: participantPhone,
      },
    });

    if (!lead) {
      lead = await tx.lead.create({
        data: {
          organizationId: channel.organizationId,
          fullName: participantName,
          phone: participantPhone,
          status: LeadStatus.NEW,
          source: "WhatsApp",
        },
      });
    }

    let message = data.message.externalId
      ? await tx.message.findUnique({ where: { externalId: data.message.externalId } })
      : null;

    if (!message) {
      message = await tx.message.create({
        data: {
          organizationId: channel.organizationId,
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

  // 2.5 — Early return if an agent has taken manual control of this conversation
  if (result.conversation.isHumanControlled) {
    return { status: "ignored" as const, reason: "human-controlled" };
  }

  // 2.6 — Subscription enforcement: skip AI processing if subscription is not active
  //        (message is already stored in DB above, so no data is lost)
  const isSubscriptionActive = await isOrgSubscriptionActiveForWorker(channel.organizationId);
  if (!isSubscriptionActive) {
    console.log(
      JSON.stringify({
        scope: "worker",
        event: "subscription-inactive",
        organizationId: channel.organizationId,
        conversationId: result.conversation.id,
        message: "AI processing skipped — subscription not active. Inbound message was stored.",
      }),
    );
    return { status: "ignored" as const, reason: "subscription-inactive" };
  }

  // 3. Prepare context with real inventory matching before generating the decision
  const priorSignals = readLeadCommercialSignals({
    notes: result.lead.notes,
    interestLabel: result.lead.interestLabel,
    budgetLabel: result.lead.budgetLabel,
  });
  let propertyMatch = await matchLeadToProperty(prisma, {
    organizationId: channel.organizationId,
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
        organizationId: channel.organizationId,
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
        organizationId: channel.organizationId,
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

  const [availability, recentMessages, orgSlugResult, propertyImages, aiAgent] = await Promise.all([
    propertyMatch.property
      ? prisma.availabilitySlot.findMany({
          where: {
            organizationId: channel.organizationId,
            OR: [
              { propertyId: propertyMatch.property.id },
              { propertyId: null },
            ],
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
        organizationId: channel.organizationId,
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
    prisma.organization.findUnique({
      where: { id: channel.organizationId },
      select: { slug: true },
    }),
    propertyMatch.property
      ? prisma.propertyImage.findMany({
          where: { propertyId: propertyMatch.property.id },
          select: { url: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 6,
        })
      : Promise.resolve([]),
    prisma.aiAgent.findUnique({
      where: { organizationId: channel.organizationId },
      select: { name: true, tone: true, persona: true, isActive: true },
    }),
  ]);

  // If the agent is explicitly paused, skip AI response
  if (aiAgent && !aiAgent.isActive) {
    return { status: "ignored" as const, reason: "agent-paused" };
  }

  const decision: AutomationDecision = await generateAutomationDecision({
    agentConfig: aiAgent
      ? {
          name: aiAgent.name,
          tone: aiAgent.tone as "FORMAL" | "FRIENDLY" | "NEUTRAL",
          persona: aiAgent.persona,
          isActive: aiAgent.isActive,
        }
      : undefined,
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
    catalogUrl: orgSlugResult?.slug ? getCatalogUrl(orgSlugResult.slug) : null,
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
          publicUrl: orgSlugResult?.slug && propertyMatch.property.publicVisible
            ? getPropertyPublicUrl(orgSlugResult.slug, propertyMatch.property.id)
            : null,
          imageCount: propertyImages.length,
          imageUrls: propertyImages.map((img) => img.url),
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
          organizationId: channel.organizationId,
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
          organizationId: channel.organizationId,
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
        organizationId: channel.organizationId,
        conversationId: result.conversation.id,
        outboundMessageId: persistence.id,
        responseText: decision.responseText,
        recipientPhone: participantPhone,
        senderKind: "automation" as const,
        channel: {
          provider: "whatsapp" as const,
          phoneNumberId: channel.phoneNumberId,
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
          organizationId: channel.organizationId,
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
        }),
      );
    }
  }

  if (decision.requiresFollowUp) {
    const followUpReason =
      decision.followUpReason ?? "Automation flagged this conversation for follow-up.";

    const [org] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: channel.organizationId },
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
        organizationId: channel.organizationId,
        type: NotificationType.OPERATOR_ACTION_REQUIRED,
        title: `Follow-up needed: ${result.conversation.participantName || participantPhone}`,
        body: followUpReason,
        link: org ? `/${org.slug}/conversations` : undefined,
        entityType: "conversation",
        entityId: result.conversation.id,
      },
    });

    // ── External email notification for human intervention ──────────────────────
    // Deduplication: check if we already sent an external notification for this
    // conversation in the last hour (same entityId + type + recent createdAt).
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentExternalNotification = await prisma.notification.findFirst({
      where: {
        organizationId: channel.organizationId,
        type: NotificationType.OPERATOR_ACTION_REQUIRED,
        entityType: "conversation",
        entityId: result.conversation.id,
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: "desc" },
      skip: 1, // skip the one we just created above
    });

    if (!recentExternalNotification) {
      try {
        const admins = await prisma.membership.findMany({
          where: {
            organizationId: channel.organizationId,
            role: { in: ["OWNER", "ADMIN"] },
          },
          select: { user: { select: { email: true, fullName: true } } },
        });

        const adminEmails = admins
          .map((m) => m.user.email)
          .filter((e): e is string => !!e);

        if (adminEmails.length > 0) {
          const orgRecord = await prisma.organization.findUnique({
            where: { id: channel.organizationId },
            select: { name: true },
          });

          await notifyHumanInterventionRequired({
            orgName: orgRecord?.name ?? "Organización",
            leadName: result.conversation.participantName || participantPhone,
            conversationId: result.conversation.id,
            adminEmails,
          });
        }
      } catch (emailError) {
        // Don't let email failures break the worker pipeline
        console.error(
          JSON.stringify({
            scope: "worker",
            event: "external-notification-error",
            conversationId: result.conversation.id,
            error: emailError instanceof Error ? emailError.message : "unknown",
          }),
        );
      }
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
