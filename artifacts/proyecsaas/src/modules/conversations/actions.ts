"use server";

import { revalidatePath } from "next/cache";

import { MembershipRole } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { ACTIVATION_EVENTS, trackActivationEventOnce } from "@/server/activation/events";
import { resolveConversationFollowUp } from "@/modules/conversations/follow-up";
import { attemptWhatsAppOutboundDelivery } from "@/modules/automations/delivery-service";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { decryptToken } from "@/server/security/token-encryption";

export async function resolveConversationFollowUpAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const conversationId = String(formData.get("conversationId") ?? "");
  const leadId = String(formData.get("leadId") ?? "");

  if (!orgSlug || !conversationId) {
    return;
  }

  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);
  const organization = membership.organization;

  await resolveConversationFollowUp(prisma, {
    organizationId: organization.id,
    conversationId,
    resolutionMethod: "MANUAL",
    link: `/${orgSlug}/conversations`,
  });

  await trackActivationEventOnce(prisma, {
    event: ACTIVATION_EVENTS.firstHumanIntervention,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    organizationName: organization.name,
    actorId: user.id,
    actorEmail: user.email,
    metadata: {
      source: "follow_up_resolution",
      conversationId,
      leadId: leadId || null,
    },
  });

  revalidatePath(`/${orgSlug}/conversations`);
  revalidatePath(`/${orgSlug}`);

  if (leadId) {
    revalidatePath(`/${orgSlug}/leads/${leadId}`);
  }
}

export async function sendManualMessageAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const conversationId = String(formData.get("conversationId") ?? "");
  const messageBody = String(formData.get("messageBody") ?? "").trim();

  if (!orgSlug || !conversationId || !messageBody) {
    return;
  }

  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);
  const organization = membership.organization;

  const [conversation, whatsappChannel] = await Promise.all([
    prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: organization.id },
      select: { id: true, participantPhone: true, leadId: true },
    }),
    prisma.whatsAppChannel.findFirst({
      where: { organizationId: organization.id, status: "ACTIVE", provider: "WHATSAPP_CLOUD" },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { phoneNumberId: true, accessTokenEncrypted: true },
    }),
  ]);

  if (!conversation) {
    return;
  }

  const outboundMessage = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        organizationId: organization.id,
        conversationId,
        direction: "OUTBOUND",
        body: messageBody,
        senderName: user.fullName,
        deliveryStatus: "PENDING",
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { isHumanControlled: true, lastMessageAt: new Date() },
    });
    return message;
  });

  await trackActivationEventOnce(prisma, {
    event: ACTIVATION_EVENTS.firstHumanIntervention,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    organizationName: organization.name,
    actorId: user.id,
    actorEmail: user.email,
    metadata: {
      source: "manual_message",
      conversationId,
      leadId: conversation.leadId ?? null,
      messageId: outboundMessage.id,
    },
  });

  const deliveryResult = await attemptWhatsAppOutboundDelivery(prisma, {
    organizationId: organization.id,
    conversationId,
    outboundMessageId: outboundMessage.id,
    responseText: messageBody,
    recipientPhone: conversation.participantPhone ?? "",
    senderKind: "human",
    deliveryLink: `/${orgSlug}/conversations`,
    channel: {
      provider: "whatsapp",
      phoneNumberId: whatsappChannel?.phoneNumberId ?? "",
      accessToken: whatsappChannel?.accessTokenEncrypted
        ? decryptToken(whatsappChannel.accessTokenEncrypted)
        : undefined,
    },
  });

  await prisma.message.update({
    where: { id: outboundMessage.id },
    data: {
      deliveryStatus:
        deliveryResult.deliveryStatus === "delivered"
          ? "SENT"
          : deliveryResult.deliveryStatus === "skipped"
            ? "SKIPPED"
            : "FAILED",
      deliveryError:
        deliveryResult.deliveryStatus !== "delivered" ? deliveryResult.reason : null,
      deliveryAttemptedAt: deliveryResult.attemptedAt ? new Date(deliveryResult.attemptedAt) : null,
      providerMessageId: deliveryResult.providerMessageId ?? null,
    },
  });

  revalidatePath(`/${orgSlug}/conversations`);
  revalidatePath(`/${orgSlug}`);

  if (conversation.leadId) {
    revalidatePath(`/${orgSlug}/leads/${conversation.leadId}`);
  }
}

export async function takeConversationAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const conversationId = String(formData.get("conversationId") ?? "");

  if (!orgSlug || !conversationId) return;

  const { user, membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);
  const organization = membership.organization;

  await prisma.conversation.updateMany({
    where: { id: conversationId, organizationId: organization.id },
    data: { isHumanControlled: true },
  });

  await trackActivationEventOnce(prisma, {
    event: ACTIVATION_EVENTS.firstHumanIntervention,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    organizationName: organization.name,
    actorId: user.id,
    actorEmail: user.email,
    metadata: {
      source: "take_conversation",
      conversationId,
    },
  });

  revalidatePath(`/${orgSlug}/conversations`);
}

export async function releaseConversationAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const conversationId = String(formData.get("conversationId") ?? "");

  if (!orgSlug || !conversationId) return;

  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);
  const organization = membership.organization;

  await prisma.conversation.updateMany({
    where: { id: conversationId, organizationId: organization.id },
    data: { isHumanControlled: false },
  });

  revalidatePath(`/${orgSlug}/conversations`);
}
