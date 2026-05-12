import "server-only";

import { LeadStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { readLeadCommercialSignals } from "@/modules/leads/commercial-signals";

import type {
  AvailabilitySlotItem,
  ConversationListItem,
  InternalNotificationItem,
} from "@/modules/conversations/types";

const CONVERSATION_PAGE_SIZE = 50;

export type ConversationPage = {
  items: ConversationListItem[];
  /** ID of the last item in this page. Pass as `?cursor=` to fetch the next page. Null when there are no more pages. */
  nextCursor: string | null;
};

export async function listOrganizationConversations(
  orgSlug: string,
  cursor?: string,
): Promise<ConversationPage> {
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
    // id as tiebreaker instead of updatedAt: updatedAt is mutable and would shift
    // a record's position in the ordered set mid-navigation, breaking cursor stability.
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: CONVERSATION_PAGE_SIZE,
  });

  const nextCursor =
    conversations.length === CONVERSATION_PAGE_SIZE
      ? (conversations[CONVERSATION_PAGE_SIZE - 1]?.id ?? null)
      : null;

  const items = conversations.map((conversation) => {
    const sortedMessages = [...conversation.messages].sort(
      (left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime(),
    );
    const latestMessage = conversation.messages[0];
    const latestInboundMessage = conversation.messages.find(
      (message) => message.direction === "INBOUND",
    );
    const leadSignals = readLeadCommercialSignals({
      notes: conversation.lead?.notes,
      interestLabel: conversation.lead?.interestLabel,
      budgetLabel: conversation.lead?.budgetLabel,
    });
    const nextBestActionIsFresh =
      conversation.followUpActive &&
      Boolean(conversation.nextBestAction?.trim()) &&
      Boolean(conversation.nextBestActionAt) &&
      (!conversation.followUpResolvedAt ||
        (conversation.nextBestActionAt &&
          conversation.nextBestActionAt.getTime() > conversation.followUpResolvedAt.getTime())) &&
      (!latestInboundMessage ||
        !conversation.nextBestActionAt ||
        latestInboundMessage.sentAt.getTime() <= conversation.nextBestActionAt.getTime());

    return {
      id: conversation.id,
      channel: conversation.channel,
      status: conversation.status,
      subject: conversation.subject ?? "ConversaciÃ³n sobre propiedad",
      participantName: conversation.participantName ?? "Participante desconocido",
      participantPhone: conversation.participantPhone ?? "TelÃ©fono pendiente",
      propertyId: conversation.propertyId ?? undefined,
      propertyTitle: conversation.property?.title ?? "Propiedad no vinculada",
      propertyContextNote:
        conversation.propertyContextNote ?? "Contexto de propiedad pendiente.",
      leadId: conversation.leadId ?? undefined,
      leadName: conversation.lead?.fullName ?? "Lead no vinculado",
      leadStatus: conversation.lead?.status ?? LeadStatus.NEW,
      leadTemperature: leadSignals.leadTemperature,
      propertyMatch: leadSignals.propertyMatch,
      automationSummary: leadSignals.automationSummary,
      requiresFollowUp: conversation.followUpActive,
      followUpCategory: conversation.followUpCategory,
      followUpReason: conversation.followUpReason,
      followUpActiveAt: conversation.followUpActiveAt?.toISOString() ?? null,
      followUpResolvedAt: conversation.followUpResolvedAt?.toISOString() ?? null,
      nextBestAction: nextBestActionIsFresh ? conversation.nextBestAction ?? null : null,
      isHumanControlled: conversation.isHumanControlled,
      lastMessageAt: (conversation.lastMessageAt ?? conversation.updatedAt).toISOString(),
      latestMessagePreview: latestMessage?.body ?? "Sin mensajes registrados.",
      messages: sortedMessages.map((message) => ({
        id: message.id,
        direction: message.direction,
        body: message.body,
        senderName: message.senderName ?? "Remitente desconocido",
        senderPhone: message.senderPhone ?? "TelÃ©fono pendiente",
        sentAt: message.sentAt.toISOString(),
        deliveryStatus: message.deliveryStatus,
        providerMessageId: message.providerMessageId ?? null,
        deliveryError: message.deliveryError ?? null,
      })),
    } satisfies ConversationListItem;
  });

  return { items, nextCursor };
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
    propertyTitle: slot.property?.title ?? "Disponibilidad general",
    userName: slot.user?.fullName ?? "Sin asignar",
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
