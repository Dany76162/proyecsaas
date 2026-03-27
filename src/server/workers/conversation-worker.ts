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
  getLeadTemperatureLabel,
} from "@/modules/leads/commercial-signals";

import { resolveConversationFollowUp } from "@/modules/conversations/follow-up";

import {
  createVisitForAutomation,
  VisitAutomationError,
} from "@/modules/visits/service";

import { getQueueConnection } from "@/server/queues/connection";
import { resolveInboundByPhoneNumberId } from "@/server/whatsapp/channel-resolver";


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
      await tx.conversation.update({
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

  // 3. Automation Decision
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
      propertyId: result.lead.propertyId,
    },
    property: null,
    availability: [],
    recentMessages: [],
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
      notes: encodeCommercialSignalsInNotes(result.lead.notes, decision),
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
  const worker = new Worker<WhatsAppInboundJobData>(
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
          const outcome = await processWhatsAppInboundJob(job.data);
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