"use server";

import { prisma } from "@/server/db/prisma";
import { requirePlatformAdmin } from "@/server/auth/access";
import { MessageDirection, MessageDeliveryStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { updateGlobalSetting, getGlobalSettings } from "@/app/platform/settings/actions/settings-actions";

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

  // In a real scenario, this would trigger an outbound WhatsApp message via a dedicated service.
  // For now, we persist it so it shows in the UI immediately.
  await prisma.message.create({
    data: {
      organizationId: conversation.organizationId,
      conversationId,
      direction: MessageDirection.OUTBOUND,
      body: text,
      senderName: sessionUser.fullName,
      sentAt: new Date(),
      deliveryStatus: MessageDeliveryStatus.SENT,
    },
  });

  revalidatePath("/platform/support");
  return { success: true };
}
