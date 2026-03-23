import "server-only";

import { LeadStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { readLeadCommercialSignals } from "@/modules/leads/commercial-signals";

import type {
  AvailabilitySlotItem,
  ConversationListItem,
  InternalNotificationItem,
} from "@/modules/conversations/types";

export async function listOrganizationConversations(
  orgSlug: string,
): Promise<ConversationListItem[]> {
  const conversations = await prisma.conversation.findMany({
    where: {
      organization: {
        slug: orgSlug,
      },
    },
    include: {
      lead: true,
      property: true,
      messages: {
        orderBy: {
          sentAt: "desc",
        },
        take: 3,
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
  });

  return conversations.map((conversation) => {
    const sortedMessages = [...conversation.messages].sort(
      (left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime(),
    );
    const latestMessage = conversation.messages[0];
    const leadSignals = readLeadCommercialSignals({
      notes: conversation.lead?.notes,
      interestLabel: conversation.lead?.interestLabel,
      budgetLabel: conversation.lead?.budgetLabel,
    });

    return {
      id: conversation.id,
      channel: conversation.channel,
      status: conversation.status,
      subject: conversation.subject ?? "Property conversation",
      participantName: conversation.participantName ?? "Unknown participant",
      participantPhone: conversation.participantPhone ?? "Phone pending",
      propertyId: conversation.propertyId ?? undefined,
      propertyTitle: conversation.property?.title ?? "Property not linked yet",
      propertyContextNote:
        conversation.propertyContextNote ?? "Property context pending resolution.",
      leadId: conversation.leadId ?? undefined,
      leadName: conversation.lead?.fullName ?? "Lead not linked yet",
      leadStatus: conversation.lead?.status ?? LeadStatus.NEW,
      leadTemperature: leadSignals.leadTemperature,
      requiresFollowUp: conversation.followUpActive,
      followUpReason: conversation.followUpReason,
      followUpActiveAt: conversation.followUpActiveAt?.toISOString() ?? null,
      followUpResolvedAt: conversation.followUpResolvedAt?.toISOString() ?? null,
      lastMessageAt: (conversation.lastMessageAt ?? conversation.updatedAt).toISOString(),
      latestMessagePreview: latestMessage?.body ?? "No messages recorded yet.",
      messages: sortedMessages.map((message) => ({
        id: message.id,
        direction: message.direction,
        body: message.body,
        senderName: message.senderName ?? "Unknown sender",
        senderPhone: message.senderPhone ?? "Phone pending",
        sentAt: message.sentAt.toISOString(),
      })),
    } satisfies ConversationListItem;
  });
}

export async function listOrganizationAvailability(
  orgSlug: string,
): Promise<AvailabilitySlotItem[]> {
  const slots = await prisma.availabilitySlot.findMany({
    where: {
      organization: {
        slug: orgSlug,
      },
      isActive: true,
    },
    include: {
      property: true,
      user: true,
    },
    orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
  });

  return slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    weekday: slot.weekday,
    startMinute: slot.startMinute,
    endMinute: slot.endMinute,
    timezone: slot.timezone,
    propertyTitle: slot.property?.title ?? "General availability",
    userName: slot.user?.fullName ?? "Unassigned",
  }));
}

export async function listConversationNotifications(
  orgSlug: string,
): Promise<InternalNotificationItem[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      organization: {
        slug: orgSlug,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link ?? undefined,
    createdAt: notification.createdAt.toISOString(),
  }));
}
