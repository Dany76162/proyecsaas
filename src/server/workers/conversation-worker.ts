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
import { prisma } from "@/server/db/prisma";
import { getQueueConnection } from "@/server/queues/connection";
import { resolveInboundByPhoneNumberId } from "@/server/whatsapp/channel-resolver";

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

export type WhatsAppInboundProcessResult =
  | {
      status: Extract<AutomationWorkerStatus, "duplicate">;
      messageId: string;
      conversationId: string;
    }
  | {
      status: Extract<AutomationWorkerStatus, "ignored">;
      reason: "unsupported-message-type" | "empty-message-body";
    }
  | {
      status: Exclude<AutomationWorkerStatus, "duplicate" | "ignored">;
      handoff: AutomationHandoffOutcome;
      organizationId: string;
      conversationId: string;
      leadId: string;
      inboundMessageId: string;
      outboundMessageId: string;
      context: PreparedConversationContext;
      decision: AutomationDecision;
      delivery: DeliveryAttemptResult;
      qualificationApplied: boolean;
      visitCreation: AutomationVisitCreationResult;
      operatorHandoff: AutomationOperatorHandoff;
    };

type PreparedInboundAutomationContext = {
  organizationId: string;
  conversationId: string;
  leadId: string;
  inboundMessageId: string;
  conversationStatus: ConversationStatus;
  continuityAction: "reused-open" | "reopened-qualified" | "created-new";
  context: PreparedConversationContext;
};

export class ConversationWorkerError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ConversationWorkerError";
  }
}

function logAutomationEvent(
  event: string,
  payload: Record<string, boolean | number | string | null | undefined>,
) {
  console.info(
    JSON.stringify({
      scope: "automation-worker",
      event,
      ...payload,
    }),
  );
}

function normalizePhone(value?: string | null) {
  return value?.trim() || null;
}

function resolveSentAt(value: string | null) {
  if (!value) {
    return new Date();
  }

  const asNumber = Number(value);

  if (!Number.isNaN(asNumber)) {
    return new Date(asNumber * 1000);
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeBody(value: string | null | undefined) {
  return value?.trim() || "";
}

function buildSyntheticInboundExternalId(data: {
  phoneNumberId: string;
  participantPhone: string;
  timestamp: string | null;
  type: string;
  body: string;
}) {
  const hash = createHash("sha256")
    .update(
      [
        data.phoneNumberId,
        data.participantPhone,
        data.timestamp ?? "missing-timestamp",
        data.type,
        data.body,
      ].join("|"),
    )
    .digest("hex");

  return `synthetic-wa:${hash}`;
}

async function acquireConversationLock(
  tx: Prisma.TransactionClient,
  organizationId: string,
  participantPhone: string,
) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${participantPhone}))
  `;
}

function isDeliverablePhone(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return false;
  }

  return normalized !== "Unknown phone";
}

async function buildConversationPreparationContext(
  tx: Prisma.TransactionClient,
  organizationId: string,
  conversationId: string,
): Promise<PreparedConversationContext> {
  const conversation = await tx.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId,
    },
    include: {
      lead: true,
      property: true,
      messages: {
        orderBy: {
          sentAt: "desc",
        },
        take: 8,
      },
    },
  });

  if (!conversation || !conversation.lead) {
    throw new ConversationWorkerError(
      "context-unavailable",
      "Conversation context could not be prepared after inbound persistence.",
    );
  }

  const availability = conversation.propertyId
    ? await tx.availabilitySlot.findMany({
        where: {
          organizationId,
          isActive: true,
          OR: [
            {
              propertyId: conversation.propertyId,
            },
            {
              propertyId: null,
            },
          ],
        },
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
        take: 4,
      })
    : [];

  const recentMessages = [...conversation.messages]
    .sort((left, right) => left.sentAt.getTime() - right.sentAt.getTime())
    .map((message) => ({
      id: message.id,
      direction: message.direction,
      body: message.body,
      sentAt: message.sentAt.toISOString(),
      senderName: message.senderName ?? null,
      senderPhone: message.senderPhone ?? null,
    }));

  return {
    conversation: {
      id: conversation.id,
      channel: conversation.channel,
      status: conversation.status,
      participantName: conversation.participantName ?? "Unknown contact",
      participantPhone: conversation.participantPhone ?? "Unknown phone",
      lastMessageAt: (conversation.lastMessageAt ?? conversation.updatedAt).toISOString(),
    },
    lead: {
      id: conversation.lead.id,
      fullName: conversation.lead.fullName,
      status: conversation.lead.status,
      phone: conversation.lead.phone ?? "",
      email: conversation.lead.email ?? null,
      propertyId: conversation.lead.propertyId ?? null,
    },
    property: conversation.property
      ? {
          id: conversation.property.id,
          title: conversation.property.title,
          address: conversation.property.address ?? null,
          city: conversation.property.city ?? null,
          neighborhood: conversation.property.neighborhood ?? null,
          propertyType: conversation.property.propertyType ?? null,
          status: conversation.property.status,
          priceCents: conversation.property.priceCents ?? null,
          currency: conversation.property.currency ?? null,
        }
      : null,
    availability: availability.map((slot) => ({
      id: slot.id,
      label: slot.label,
      weekday: slot.weekday,
      startMinute: slot.startMinute,
      endMinute: slot.endMinute,
      timezone: slot.timezone,
      userName: slot.user?.fullName ?? null,
    })),
    recentMessages,
  };
}

function getAutomationHandoff(
  context: PreparedConversationContext,
  decision: AutomationDecision,
): AutomationHandoffOutcome {
  if (decision.qualificationDecision === "QUALIFIED") {
    return "response-persisted-and-qualified";
  }

  if (!context.property) {
    return "response-persisted-awaiting-property";
  }

  if (decision.visitIntent?.requested) {
    return "response-persisted-visit-intent";
  }

  return "response-persisted";
}

function getConversationStatusPatch(
  currentStatus: ConversationStatus,
  decision: AutomationDecision,
) {
  if (decision.qualificationDecision === "QUALIFIED" && currentStatus === ConversationStatus.OPEN) {
    return ConversationStatus.QUALIFIED;
  }

  return null;
}

async function persistAutomationResponse(input: {
  organizationId: string;
  conversationId: string;
  decision: AutomationDecision;
  sentAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const outboundMessage = await tx.message.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        direction: MessageDirection.OUTBOUND,
        deliveryStatus: MessageDeliveryStatus.PENDING,
        body: input.decision.responseText,
        senderName: "Automation assistant",
        senderPhone: null,
        sentAt: input.sentAt,
      },
      select: {
        id: true,
      },
    });

    await tx.conversation.update({
      where: {
        id: input.conversationId,
      },
      data: {
        lastMessageAt: input.sentAt,
      },
    });

    return {
      outboundMessageId: outboundMessage.id,
    };
  });
}

async function applyOutboundDeliveryTruth(input: {
  organizationId: string;
  outboundMessageId: string;
  delivery: DeliveryAttemptResult;
}) {
  const deliveryStatusMap = {
    delivered: MessageDeliveryStatus.SENT,
    failed: MessageDeliveryStatus.FAILED,
    skipped: MessageDeliveryStatus.SKIPPED,
  } satisfies Record<DeliveryAttemptResult["deliveryStatus"], MessageDeliveryStatus>;

  const attemptedAt = input.delivery.attemptedAt ? new Date(input.delivery.attemptedAt) : null;
  const deliveredAt =
    input.delivery.deliveryStatus === "delivered" && input.delivery.attemptedAt
      ? new Date(input.delivery.attemptedAt)
      : null;

  await prisma.message.updateMany({
    where: {
      id: input.outboundMessageId,
      organizationId: input.organizationId,
      direction: MessageDirection.OUTBOUND,
    },
    data: {
      deliveryStatus: deliveryStatusMap[input.delivery.deliveryStatus],
      providerMessageId: input.delivery.providerMessageId ?? null,
      deliveryError: input.delivery.deliveryStatus === "failed" ? input.delivery.reason : null,
      deliveryAttemptedAt: input.delivery.sendAttempted ? attemptedAt : null,
      deliveredAt,
    },
  });
}

async function persistLeadCommercialSignals(input: {
  organizationId: string;
  leadId: string;
  decision: AutomationDecision;
}) {
  const lead = await prisma.lead.findFirst({
    where: {
      id: input.leadId,
      organizationId: input.organizationId,
    },
    select: {
      notes: true,
      budgetLabel: true,
    },
  });

  if (!lead) {
    return;
  }

  await prisma.lead.update({
    where: {
      id: input.leadId,
    },
    data: {
      interestLabel: getLeadTemperatureLabel(input.decision.leadTemperature),
      budgetLabel: input.decision.extractedPreferences.budget ?? lead.budgetLabel,
      notes: encodeCommercialSignalsInNotes(lead.notes, input.decision),
    },
  });
}

async function applyConversationStatusAfterDelivery(input: {
  conversationId: string;
  currentConversationStatus: ConversationStatus;
  decision: AutomationDecision;
  delivery: DeliveryAttemptResult;
}) {
  const nextStatus = getConversationStatusPatch(
    input.currentConversationStatus,
    input.decision,
  );

  if (!nextStatus || input.delivery.deliveryStatus !== "delivered") {
    return null;
  }

  await prisma.conversation.update({
    where: {
      id: input.conversationId,
    },
    data: {
      status: nextStatus,
    },
  });

  return nextStatus;
}

function getFinalWorkerStatus(
  delivery: DeliveryAttemptResult,
): Exclude<AutomationWorkerStatus, "duplicate" | "ignored"> {
  if (delivery.deliveryStatus === "delivered") {
    return "delivery-provider-accepted";
  }

  if (delivery.deliveryStatus === "skipped") {
    return "delivery-skipped";
  }

  return "delivery-failed-safe";
}

async function maybeCreateVisitFromAutomation(input: {
  organizationId: string;
  leadId: string;
  decision: AutomationDecision;
  delivery: DeliveryAttemptResult;
}): Promise<AutomationVisitCreationResult> {
  const proposal = input.decision.visitProposal;

  if (!proposal) {
    return {
      proposalPresent: false,
      concrete: false,
      created: false,
      reason: "no-proposal",
    };
  }

  if (input.delivery.deliveryStatus !== "delivered") {
    return {
      proposalPresent: true,
      concrete: Boolean(proposal.proposed && proposal.scheduledAt),
      created: false,
      reason: "delivery-not-accepted",
    };
  }

  if (!proposal.proposed || !proposal.scheduledAt) {
    return {
      proposalPresent: true,
      concrete: false,
      created: false,
      reason: "proposal-not-concrete",
    };
  }

  try {
    const visit = await createVisitForAutomation({
      organizationId: input.organizationId,
      leadId: input.leadId,
      scheduledAt: new Date(proposal.scheduledAt),
      notes: "Visit created from automation after a concrete scheduling proposal.",
    });

    return {
      proposalPresent: true,
      concrete: true,
      created: !visit.reusedExisting,
      reason: visit.reusedExisting ? "already-exists" : "created",
      visitId: visit.visit.id,
    };
  } catch (error) {
    if (error instanceof VisitAutomationError) {
      return {
        proposalPresent: true,
        concrete: true,
        created: false,
        reason: "creation-failed-safe",
        errorCode: error.code,
      };
    }

    throw error;
  }
}

function getOperatorHandoffDecision(input: {
  decision: AutomationDecision;
  delivery: DeliveryAttemptResult;
  visitCreation: AutomationVisitCreationResult;
  context: PreparedConversationContext;
}) {
  if (input.delivery.deliveryStatus === "skipped") {
    return {
      required: true,
      reason: "delivery-skipped" as const,
      summary:
        "Outbound response was persisted, but delivery was skipped because WhatsApp sending is not fully configured.",
    };
  }

  if (input.delivery.deliveryStatus === "failed") {
    return {
      required: true,
      reason: "delivery-failed" as const,
      summary: "Outbound response was persisted, but WhatsApp delivery failed and needs review.",
    };
  }

  if (input.delivery.deliveryStatus === "delivered" && !input.context.property) {
    return {
      required: true,
      reason: "property-context-unresolved" as const,
      summary:
        "Automation replied successfully, but the property context is still unresolved and needs operator review.",
    };
  }

  if (input.visitCreation.reason === "creation-failed-safe") {
    return {
      required: true,
      reason: "visit-creation-failed" as const,
      summary: "Automation had a concrete scheduling outcome, but visit creation failed safely.",
    };
  }

  if (
    input.delivery.deliveryStatus === "delivered" &&
    input.visitCreation.reason === "proposal-not-concrete"
  ) {
    return {
      required: true,
      reason: "visit-proposal-not-concrete" as const,
      summary: "Lead received the response, but the visit proposal still needs a human to confirm a concrete time.",
    };
  }

  return {
    required: false,
    reason: "none" as const,
    summary: "Automation completed without operator follow-up.",
  };
}

function getFollowUpCategory(
  reason: Exclude<AutomationOperatorHandoff["reason"], "none">,
): FollowUpCategory {
  switch (reason) {
    case "delivery-skipped":
    case "delivery-failed":
    case "visit-creation-failed":
      return FollowUpCategory.TECHNICAL;
    case "property-context-unresolved":
    case "visit-proposal-not-concrete":
      return FollowUpCategory.COMMERCIAL;
  }
}

async function maybeCreateOperatorNotification(input: {
  organizationId: string;
  conversationId: string;
  leadId: string;
  reason: Exclude<AutomationOperatorHandoff["reason"], "none">;
  summary: string;
}) {
  const [organization, conversation, lead] = await Promise.all([
    prisma.organization.findUnique({
      where: {
        id: input.organizationId,
      },
      select: {
        slug: true,
      },
    }),
    prisma.conversation.findUnique({
      where: {
        id: input.conversationId,
      },
      select: {
        participantName: true,
      },
    }),
    prisma.lead.findUnique({
      where: {
        id: input.leadId,
      },
      select: {
        fullName: true,
      },
    }),
  ]);

  const titleByReason = {
    "property-context-unresolved": "Property context needs operator review",
    "delivery-skipped": "WhatsApp delivery skipped",
    "delivery-failed": "WhatsApp delivery failed",
    "visit-proposal-not-concrete": "Visit proposal needs confirmation",
    "visit-creation-failed": "Visit creation needs recovery",
  } satisfies Record<Exclude<AutomationOperatorHandoff["reason"], "none">, string>;

  const subjectLabel = lead?.fullName ?? conversation?.participantName ?? "this contact";
  const notificationBody = `${subjectLabel}: ${input.summary}`;

  const existingNotification = await prisma.notification.findFirst({
    where: {
      organizationId: input.organizationId,
      type: NotificationType.OPERATOR_ACTION_REQUIRED,
      entityType: "conversation",
      entityId: input.conversationId,
      title: titleByReason[input.reason],
      readAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
    },
  });

  if (
    existingNotification &&
    existingNotification.body === notificationBody &&
    existingNotification.createdAt.getTime() > Date.now() - 1000 * 60 * 60 * 6
  ) {
    return existingNotification.id;
  }

  const notification = await prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      type: NotificationType.OPERATOR_ACTION_REQUIRED,
      title: titleByReason[input.reason],
      body: notificationBody,
      link: organization ? `/${organization.slug}/conversations` : undefined,
      entityType: "conversation",
      entityId: input.conversationId,
    },
    select: {
      id: true,
    },
  });

  return notification.id;
}

async function syncConversationFollowUpState(input: {
  organizationId: string;
  conversationId: string;
  required: boolean;
  reason: AutomationOperatorHandoff["reason"];
  category: FollowUpCategory | null;
  summary: string;
  nextBestAction: string;
}) {
  const existingConversation = await prisma.conversation.findUnique({
    where: {
      id: input.conversationId,
    },
    select: {
      followUpActive: true,
      followUpActiveAt: true,
      followUpCategory: true,
      followUpReason: true,
      followUpResolvedAt: true,
    },
  });

  if (!input.required) {
    if (!existingConversation?.followUpActive) {
      return;
    }

    await resolveConversationFollowUp({
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      resolutionMethod: "AUTO_SYSTEM",
    });

    logAutomationEvent("follow-up-auto-resolved", {
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      previousCategory: existingConversation.followUpCategory,
      previousReason: existingConversation.followUpReason,
    });

    return;
  }

  if (
    existingConversation?.followUpResolvedAt &&
    Date.now() - existingConversation.followUpResolvedAt.getTime() < 1000
  ) {
    return;
  }

  await prisma.conversation.update({
    where: {
      id: input.conversationId,
    },
    data: {
      followUpActive: true,
      followUpCategory: input.category,
      followUpReason: input.summary,
      followUpActiveAt: existingConversation?.followUpActiveAt ?? new Date(),
      followUpResolvedAt: null,
      nextBestAction: input.nextBestAction,
      nextBestActionAt: new Date(),
    },
  });
}

async function prepareInboundAutomationContext(input: {
  organizationId: string;
  participantPhone: string;
  participantName: string;
  messageBody: string;
  sentAt: Date;
  externalId: string;
}): Promise<PreparedInboundAutomationContext> {
  return prisma.$transaction(async (tx) => {
    await acquireConversationLock(tx, input.organizationId, input.participantPhone);

    let continuityAction: PreparedInboundAutomationContext["continuityAction"] = "created-new";
    let conversation = await tx.conversation.findFirst({
      where: {
        organizationId: input.organizationId,
        channel: "whatsapp",
        status: ConversationStatus.OPEN,
        participantPhone: input.participantPhone,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        leadId: true,
      },
    });

    if (!conversation) {
      const qualifiedConversation = await tx.conversation.findFirst({
        where: {
          organizationId: input.organizationId,
          channel: "whatsapp",
          status: ConversationStatus.QUALIFIED,
          participantPhone: input.participantPhone,
        },
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          leadId: true,
        },
      });

      if (qualifiedConversation) {
        continuityAction = "reopened-qualified";
        conversation = qualifiedConversation;

        await tx.conversation.update({
          where: {
            id: qualifiedConversation.id,
          },
          data: {
            status: ConversationStatus.OPEN,
            lastMessageAt: input.sentAt,
          },
        });
      }
    } else {
      continuityAction = "reused-open";
    }

    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          organizationId: input.organizationId,
          channel: "whatsapp",
          status: ConversationStatus.OPEN,
          participantName: input.participantName,
          participantPhone: input.participantPhone,
          subject: `WhatsApp conversation with ${input.participantName}`,
          lastMessageAt: input.sentAt,
        },
        select: {
          id: true,
          leadId: true,
        },
      });
    }

    let lead = await tx.lead.findFirst({
      where: {
        organizationId: input.organizationId,
        phone: input.participantPhone,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (!lead) {
      lead = await tx.lead.create({
        data: {
          organizationId: input.organizationId,
          fullName: input.participantName,
          phone: input.participantPhone,
          status: LeadStatus.NEW,
          source: "WhatsApp",
        },
        select: {
          id: true,
        },
      });
    }

    const message = await tx.message.create({
      data: {
        organizationId: input.organizationId,
        conversationId: conversation.id,
        externalId: input.externalId,
        direction: MessageDirection.INBOUND,
        deliveryStatus: MessageDeliveryStatus.RECEIVED,
        body: input.messageBody,
        senderName: input.participantName,
        senderPhone: input.participantPhone,
        sentAt: input.sentAt,
      },
      select: {
        id: true,
      },
    });

    if (continuityAction !== "created-new" || conversation.leadId !== lead.id) {
      await tx.conversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          status: ConversationStatus.OPEN,
          leadId: lead.id,
          participantName: input.participantName,
          participantPhone: input.participantPhone,
          lastMessageAt: input.sentAt,
          nextBestAction: null,
          nextBestActionAt: null,
        },
      });
    }

    const context = await buildConversationPreparationContext(
      tx,
      input.organizationId,
      conversation.id,
    );

    return {
      organizationId: input.organizationId,
      conversationId: conversation.id,
      leadId: lead.id,
      inboundMessageId: message.id,
      conversationStatus: context.conversation.status,
      continuityAction,
      context,
    };
  });
}

async function runAutomationPipeline(input: {
  prepared: PreparedInboundAutomationContext;
  phoneNumberId: string;
  deliveryMode?: "runtime" | "simulate";
  accessToken?: string;
}): Promise<Extract<WhatsAppInboundProcessResult, { operatorHandoff: AutomationOperatorHandoff }>> {
  const decision = await generateAutomationDecision(input.prepared.context);
  const handoff = getAutomationHandoff(input.prepared.context, decision);
  await persistLeadCommercialSignals({
    organizationId: input.prepared.organizationId,
    leadId: input.prepared.leadId,
    decision,
  });
  const outboundSentAt = new Date();
  const persisted = await persistAutomationResponse({
    organizationId: input.prepared.organizationId,
    conversationId: input.prepared.conversationId,
    decision,
    sentAt: outboundSentAt,
  });
  const delivery =
    input.deliveryMode === "simulate"
      ? await attemptSimulatedWhatsAppOutboundDelivery({
          phoneNumberId: input.phoneNumberId,
          responseText: decision.responseText,
        })
      : await attemptWhatsAppOutboundDelivery({
          organizationId: input.prepared.organizationId,
          conversationId: input.prepared.conversationId,
          outboundMessageId: persisted.outboundMessageId,
          responseText: decision.responseText,
          recipientPhone: isDeliverablePhone(input.prepared.context.conversation.participantPhone)
            ? input.prepared.context.conversation.participantPhone
            : "",
          channel: {
            provider: "whatsapp",
            phoneNumberId: input.phoneNumberId,
            accessToken: input.accessToken,
          },
        });
  await applyOutboundDeliveryTruth({
    organizationId: input.prepared.organizationId,
    outboundMessageId: persisted.outboundMessageId,
    delivery,
  });
  const qualificationApplied = Boolean(
    await applyConversationStatusAfterDelivery({
      conversationId: input.prepared.conversationId,
      currentConversationStatus: input.prepared.conversationStatus,
      decision,
      delivery,
    }),
  );
  const visitCreation = await maybeCreateVisitFromAutomation({
    organizationId: input.prepared.organizationId,
    leadId: input.prepared.leadId,
    decision,
    delivery,
  });
  const handoffDecision = getOperatorHandoffDecision({
    decision,
    delivery,
    visitCreation,
    context: input.prepared.context,
  });
  let operatorNotificationId: string | undefined;

  if (handoffDecision.required && handoffDecision.reason !== "none") {
    operatorNotificationId = await maybeCreateOperatorNotification({
      organizationId: input.prepared.organizationId,
      conversationId: input.prepared.conversationId,
      leadId: input.prepared.leadId,
      reason: handoffDecision.reason,
      summary: handoffDecision.summary,
    });
  }

  await syncConversationFollowUpState({
    organizationId: input.prepared.organizationId,
    conversationId: input.prepared.conversationId,
    required: handoffDecision.required,
    reason: handoffDecision.reason,
    category:
      handoffDecision.reason === "none" ? null : getFollowUpCategory(handoffDecision.reason),
    summary: handoffDecision.summary,
    nextBestAction: decision.nextBestAction,
  });

  const operatorHandoff: AutomationOperatorHandoff = {
    required: handoffDecision.required,
    reason: handoffDecision.reason,
    summary: handoffDecision.summary,
    notificationCreated: Boolean(operatorNotificationId),
    notificationId: operatorNotificationId,
  };

  const result = {
    status: getFinalWorkerStatus(delivery),
    handoff,
    organizationId: input.prepared.organizationId,
    conversationId: input.prepared.conversationId,
    leadId: input.prepared.leadId,
    inboundMessageId: input.prepared.inboundMessageId,
    outboundMessageId: persisted.outboundMessageId,
    context: input.prepared.context,
    decision,
    delivery,
    qualificationApplied,
    visitCreation,
    operatorHandoff,
  } satisfies Extract<WhatsAppInboundProcessResult, { operatorHandoff: AutomationOperatorHandoff }>;

  logAutomationEvent("pipeline-completed", {
    status: result.status,
    handoff: result.handoff,
    organizationId: result.organizationId,
    conversationId: result.conversationId,
    leadId: result.leadId,
    deliveryStatus: result.delivery.deliveryStatus,
    deliveryReason: result.delivery.reason,
    qualificationApplied: result.qualificationApplied,
    visitReason: result.visitCreation.reason,
    visitCreated: result.visitCreation.created,
    operatorFollowUpRequired: result.operatorHandoff.required,
    operatorReason: result.operatorHandoff.reason,
    notificationCreated: result.operatorHandoff.notificationCreated,
  });

  return result;
}

export async function processWhatsAppInboundJob(
  data: WhatsAppInboundJobData,
  options: ProcessWhatsAppInboundOptions = {},
): Promise<WhatsAppInboundProcessResult> {
  const phoneNumberId = data.channel.phoneNumberId;
  const channel =
    options.channelOverride && options.channelOverride.phoneNumberId === phoneNumberId
      ? options.channelOverride
      : await resolveInboundByPhoneNumberId(phoneNumberId);

  if (!channel) {
    throw new ConversationWorkerError(
      "missing-channel",
      `No WhatsApp channel is configured for phoneNumberId ${phoneNumberId}.`,
    );
  }

  const participantPhone = normalizePhone(data.contact.phone ?? data.message.from);
  const messageBody = normalizeBody(data.message.body);

  if (!participantPhone) {
    throw new ConversationWorkerError("missing-phone", "Inbound message has no participant phone.");
  }

  if (data.message.type !== "text") {
    return {
      status: "ignored",
      reason: "unsupported-message-type",
    };
  }

  if (!messageBody) {
    return {
      status: "ignored",
      reason: "empty-message-body",
    };
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: channel.organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!organization) {
    throw new ConversationWorkerError(
      "missing-organization",
      "Configured WhatsApp channel points to a missing organization.",
    );
  }

  if (data.message.externalId) {
    const existingMessage = await prisma.message.findUnique({
      where: {
        externalId: data.message.externalId,
      },
      select: {
        id: true,
        conversationId: true,
      },
    });

    if (existingMessage) {
      logAutomationEvent("duplicate-inbound", {
        organizationId: organization.id,
        conversationId: existingMessage.conversationId,
        messageId: existingMessage.id,
        externalId: data.message.externalId,
      });

      return {
        status: "duplicate" as const,
        messageId: existingMessage.id,
        conversationId: existingMessage.conversationId,
      };
    }
  }

  const sentAt = resolveSentAt(data.message.timestamp);
  const participantName = data.contact.name?.trim() || "Unknown contact";
  const effectiveExternalId =
    data.message.externalId ??
    buildSyntheticInboundExternalId({
      phoneNumberId,
      participantPhone,
      timestamp: data.message.timestamp,
      type: data.message.type,
      body: messageBody,
    });

  try {
    const prepared = await prepareInboundAutomationContext({
      organizationId: organization.id,
      participantPhone,
      participantName,
      messageBody,
      sentAt,
      externalId: effectiveExternalId,
    });

    if (prepared.continuityAction !== "created-new") {
      logAutomationEvent("conversation-continuity-reused", {
        organizationId: prepared.organizationId,
        conversationId: prepared.conversationId,
        leadId: prepared.leadId,
        continuityAction: prepared.continuityAction,
        previousStatus:
          prepared.continuityAction === "reopened-qualified"
            ? ConversationStatus.QUALIFIED
            : ConversationStatus.OPEN,
      });
    }

    return runAutomationPipeline({
      prepared,
      phoneNumberId,
      deliveryMode: options.deliveryMode,
      accessToken: data.channel.accessToken ?? channel.accessToken,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      effectiveExternalId
    ) {
      const existingMessage = await prisma.message.findUnique({
        where: {
          externalId: effectiveExternalId,
        },
        select: {
          id: true,
          conversationId: true,
        },
      });

      if (existingMessage) {
        logAutomationEvent("duplicate-inbound-race", {
          organizationId: organization.id,
          conversationId: existingMessage.conversationId,
          messageId: existingMessage.id,
          externalId: effectiveExternalId,
        });

        return {
          status: "duplicate" as const,
          messageId: existingMessage.id,
          conversationId: existingMessage.conversationId,
        };
      }
    }

    if (error instanceof Error) {
      console.error(
        JSON.stringify({
          scope: "automation-worker",
          event: "pipeline-failed",
          code: error instanceof ConversationWorkerError ? error.code : "unhandled-error",
          message: error.message,
          phoneNumberId,
          organizationId: organization.id,
          externalId: effectiveExternalId,
        }),
      );
    }

    throw error;
  }
}

export function createConversationWorker() {
  return new Worker(
    "automation-jobs",
    async (job: Job<WhatsAppInboundJobData>) => {
      if (job.name !== "whatsapp-inbound") {
        return { status: "ignored" as const, jobName: job.name };
      }

      return processWhatsAppInboundJob(job.data);
    },
    {
      connection: getQueueConnection(),
    },
  );
}
