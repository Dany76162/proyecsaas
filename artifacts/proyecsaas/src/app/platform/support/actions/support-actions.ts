"use server";

import { prisma } from "@/server/db/prisma";
import { requirePlatformAdmin } from "@/server/auth/access";
import { MessageDirection, MessageDeliveryStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { updateGlobalSetting, getGlobalSettings } from "@/app/platform/settings/actions/settings-actions";
import { resolveActiveChannelByOrgId } from "@/server/whatsapp/channel-resolver";
import { attemptWhatsAppOutboundDelivery } from "@/modules/automations/delivery-service";

/**
 * Fetches all support conversations (those routed to the platform org).
 */
export async function getSupportConversations() {
  await requirePlatformAdmin();
  
  const settings = await getGlobalSettings();
  const platformOrgId = process.env.WHATSAPP_ORGANIZATION_ID;

  if (!platformOrgId) {
    return [];
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      organizationId: platformOrgId,
    },
    orderBy: {
      lastMessageAt: "desc",
    },
    include: {
      messages: {
        orderBy: {
          sentAt: "desc",
        },
        take: 1,
      },
    },
  });

  return conversations.map(c => ({
    id: c.id,
    participantName: c.participantName || "Visitante",
    participantPhone: c.participantPhone,
    lastMessage: c.messages[0]?.body || "",
    lastMessageAt: c.lastMessageAt?.toISOString() || new Date().toISOString(),
    status: c.status,
  }));
}

/**
 * Fetches full message history for a support conversation.
 */
export async function getSupportMessages(conversationId: string) {
  await requirePlatformAdmin();

  return await prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      sentAt: "asc",
    },
    select: {
      id: true,
      direction: true,
      body: true,
      sentAt: true,
      senderName: true,
    },
  });
}

/**
 * Sends a manual support response from the Superadmin.
 */
export async function sendSupportResponse(conversationId: string, text: string) {
  const sessionUser = await requirePlatformAdmin();
  
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { organizationId: true, participantPhone: true },
  });

  if (!conversation) throw new Error("Conversation not found");
  if (!conversation.participantPhone) throw new Error("Conversation has no participant phone");

  // Persist the outbound message first so it appears in the UI immediately.
  const newMessage = await prisma.message.create({
    data: {
      organizationId: conversation.organizationId,
      conversationId,
      direction: MessageDirection.OUTBOUND,
      body: text,
      senderName: sessionUser.fullName,
      sentAt: new Date(),
      deliveryStatus: MessageDeliveryStatus.PENDING,
    },
  });

  // Attempt WhatsApp delivery via the active channel for this org.
  const channel = await resolveActiveChannelByOrgId(prisma, conversation.organizationId);

  if (channel) {
    const deliveryResult = await attemptWhatsAppOutboundDelivery(prisma, {
      organizationId: conversation.organizationId,
      conversationId,
      outboundMessageId: newMessage.id,
      responseText: text,
      recipientPhone: conversation.participantPhone,
      senderKind: "human",
      channel: {
        provider: channel.provider,
        phoneNumberId: channel.phoneNumberId,
        instanceName: channel.instanceName,
        accessToken: channel.accessToken,
      },
    });

    await prisma.message.update({
      where: { id: newMessage.id },
      data: {
        deliveryStatus:
          deliveryResult.deliveryStatus === "delivered"
            ? MessageDeliveryStatus.SENT
            : deliveryResult.deliveryStatus === "skipped"
              ? MessageDeliveryStatus.SKIPPED
              : MessageDeliveryStatus.FAILED,
        providerMessageId: deliveryResult.providerMessageId ?? null,
        deliveryError: deliveryResult.deliveryStatus !== "delivered" ? deliveryResult.reason : null,
        deliveryAttemptedAt: deliveryResult.attemptedAt ? new Date(deliveryResult.attemptedAt) : new Date(),
      },
    });
  } else {
    // No active WA channel — mark as SKIPPED so the operator knows delivery was not attempted.
    await prisma.message.update({
      where: { id: newMessage.id },
      data: {
        deliveryStatus: MessageDeliveryStatus.SKIPPED,
        deliveryError: "no-active-channel",
        deliveryAttemptedAt: new Date(),
      },
    });
  }

  revalidatePath("/platform/support");
  return { success: true };
}
