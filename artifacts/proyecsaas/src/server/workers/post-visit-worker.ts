import {
  ConversationStatus,
  FollowUpCategory,
  MessageDeliveryStatus,
  MessageDirection,
  NotificationType,
} from "@prisma/client";

// âš ï¸ IMPORTANTE: usar prisma-worker (NO prisma normal)
import { prismaWorker as prisma } from "@/server/db/prisma-worker";
import { attemptWhatsAppOutboundDelivery } from "@/modules/automations/delivery-service";
import { readLeadCommercialSignals } from "@/modules/leads/commercial-signals";
import { decryptToken } from "@/server/security/token-encryption";

// =========================
// TYPES
// =========================

export type PostVisitJobData = {
  source: "post-visit";
  organizationId: string;
  visitId: string;
  leadId: string;
  propertyId: string;
};

// =========================
// MESSAGE GENERATION
// =========================

function buildPostVisitMessage(params: {
  leadName: string;
  propertyTitle: string | null;
  temperature: "hot" | "warm" | "cold" | "unclear";
}): string {
  const firstName = params.leadName.split(" ")[0] ?? params.leadName;
  const propertyRef = params.propertyTitle
    ? `la propiedad ${params.propertyTitle}`
    : "la propiedad visitada";

  if (params.temperature === "hot") {
    return `Hola ${firstName}! Â¿CÃ³mo te fue en la visita a ${propertyRef}? Si querÃ©s avanzar con los prÃ³ximos pasos, avisame cuando quieras.`;
  }

  if (params.temperature === "warm") {
    return `Hola ${firstName}! QuerÃ­a saber cÃ³mo te fue en la visita a ${propertyRef}. Â¿QuedÃ³ alguna duda o te interesarÃ­a ver otras opciones?`;
  }

  return `Hola ${firstName}! Â¿QuÃ© te pareciÃ³ ${propertyRef}? Estamos disponibles para cualquier consulta o si querÃ©s explorar otras alternativas.`;
}

// =========================
// CORE PROCESS
// =========================

export async function processPostVisitFollowUp(data: PostVisitJobData) {
  // 1. Safety check: visit must still be COMPLETED
  const visit = await prisma.visit.findFirst({
    where: {
      id: data.visitId,
      organizationId: data.organizationId,
      status: "COMPLETED",
    },
    select: {
      id: true,
      notes: true,
      scheduledAt: true,
      property: {
        select: { id: true, title: true },
      },
    },
  });

  if (!visit) {
    return { status: "ignored" as const, reason: "visit-not-found-or-not-completed" };
  }

  // 2. Load lead with commercial signals
  const lead = await prisma.lead.findFirst({
    where: { id: data.leadId, organizationId: data.organizationId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      notes: true,
      interestLabel: true,
      budgetLabel: true,
    },
  });

  if (!lead || !lead.phone) {
    return { status: "ignored" as const, reason: "lead-not-found-or-no-phone" };
  }

  // 3. Resolve primary active WhatsApp channel for this org
  const channelRecord = await prisma.whatsAppChannel.findFirst({
    where: {
      organizationId: data.organizationId,
      status: "ACTIVE",
      isPrimary: true,
    },
    select: {
      phoneNumberId: true,
      accessTokenEncrypted: true,
    },
  });

  if (!channelRecord) {
    return { status: "ignored" as const, reason: "no-active-whatsapp-channel" };
  }

  // 4. Find the most recent open conversation for this lead (by phone or leadId link)
  const conversation = await prisma.conversation.findFirst({
    where: {
      organizationId: data.organizationId,
      status: { not: ConversationStatus.CLOSED },
      OR: [
        { participantPhone: lead.phone },
        { leadId: data.leadId },
      ],
    },
    orderBy: { lastMessageAt: "desc" },
    select: {
      id: true,
      isHumanControlled: true,
      participantPhone: true,
    },
  });

  if (!conversation) {
    return { status: "ignored" as const, reason: "no-open-conversation" };
  }

  // 2.5-equivalent: respect agent's manual control
  if (conversation.isHumanControlled) {
    return { status: "ignored" as const, reason: "human-controlled" };
  }

  // 5. Deduplication via deterministic message ID â€” safe for worker retries
  const deterministicId = `pv_${data.visitId}`;

  const existingMessage = await prisma.message.findUnique({
    where: { id: deterministicId },
    select: { id: true, deliveryStatus: true },
  });

  if (
    existingMessage &&
    (existingMessage.deliveryStatus === MessageDeliveryStatus.SENT ||
      existingMessage.deliveryStatus === MessageDeliveryStatus.SKIPPED)
  ) {
    return { status: "ignored" as const, reason: "already-processed" };
  }

  // 6. Build post-visit message based on lead's commercial temperature
  const signals = readLeadCommercialSignals({
    notes: lead.notes,
    interestLabel: lead.interestLabel,
    budgetLabel: lead.budgetLabel,
  });

  const messageText = buildPostVisitMessage({
    leadName: lead.fullName,
    propertyTitle: visit.property?.title ?? null,
    temperature: signals.leadTemperature,
  });

  // 7. Persist outbound message with deterministic ID
  const outboundMessage = existingMessage
    ? existingMessage
    : await prisma.message.create({
        data: {
          id: deterministicId,
          organizationId: data.organizationId,
          conversationId: conversation.id,
          direction: MessageDirection.OUTBOUND,
          body: messageText,
          sentAt: new Date(),
          deliveryStatus: MessageDeliveryStatus.PENDING,
        },
        select: { id: true, deliveryStatus: true },
      });

  // 8. Touch conversation lastMessageAt
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  // 9. Attempt WhatsApp delivery via shared pipeline
  const deliveryResult = await attemptWhatsAppOutboundDelivery(prisma, {
    organizationId: data.organizationId,
    conversationId: conversation.id,
    outboundMessageId: outboundMessage.id,
    responseText: messageText,
    recipientPhone: conversation.participantPhone ?? lead.phone,
    senderKind: "automation",
    channel: {
      provider: "whatsapp",
      phoneNumberId: channelRecord.phoneNumberId,
      accessToken: channelRecord.accessTokenEncrypted
        ? decryptToken(channelRecord.accessTokenEncrypted)
        : undefined,
    },
  });

  // 10. Persist delivery result
  await prisma.message.update({
    where: { id: deterministicId },
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

  // 11. Set follow-up on conversation â€” agent must track the feedback regardless of delivery
  const followUpReason = visit.property?.title
    ? `Seguimiento post-visita: ${visit.property.title}. Esperando respuesta del lead.`
    : "Seguimiento post-visita enviado. Esperando respuesta del lead.";

  const [org] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: data.organizationId },
      select: { slug: true },
    }),
    prisma.conversation.updateMany({
      where: { id: conversation.id, organizationId: data.organizationId },
      data: {
        followUpActive: true,
        followUpCategory: FollowUpCategory.COMMERCIAL,
        followUpReason,
        followUpActiveAt: new Date(),
        nextBestAction: "evaluar-feedback-post-visita",
        nextBestActionAt: new Date(),
      },
    }),
  ]);

  // 12. Create notification for the org team
  await prisma.notification.create({
    data: {
      organizationId: data.organizationId,
      type: NotificationType.OPERATOR_ACTION_REQUIRED,
      title: `Post-visita: ${lead.fullName}`,
      body: followUpReason,
      link: org ? `/${org.slug}/conversations` : undefined,
      entityType: "conversation",
      entityId: conversation.id,
    },
  });

  console.log(
    JSON.stringify({
      scope: "post-visit-worker",
      event: "follow-up-processed",
      organizationId: data.organizationId,
      visitId: data.visitId,
      leadId: lead.id,
      conversationId: conversation.id,
      deliveryStatus: deliveryResult.deliveryStatus,
      messageId: deterministicId,
    }),
  );

  return {
    status: "processed" as const,
    conversationId: conversation.id,
    leadId: lead.id,
    deliveryStatus: deliveryResult.deliveryStatus,
    messageId: deterministicId,
  };
}
