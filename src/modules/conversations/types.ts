import type {
  ConversationStatus,
  FollowUpCategory,
  LeadStatus,
  MessageDeliveryStatus,
  MessageDirection,
  NotificationType,
} from "@prisma/client";
import type { LeadTemperature } from "@/modules/leads/commercial-signals";
import type { LeadPropertyMatchTrace } from "@/modules/properties/matching";

export type ConversationMessageItem = {
  id: string;
  direction: MessageDirection;
  body: string;
  senderName: string;
  senderPhone: string;
  sentAt: string;
  deliveryStatus: MessageDeliveryStatus;
  providerMessageId: string | null;
  deliveryError: string | null;
};

export type ConversationListItem = {
  id: string;
  channel: string;
  status: ConversationStatus;
  subject: string;
  participantName: string;
  participantPhone: string;
  propertyId?: string;
  propertyTitle: string;
  propertyContextNote: string;
  leadId?: string;
  leadName: string;
  leadStatus: LeadStatus;
  leadTemperature: LeadTemperature;
  propertyMatch: LeadPropertyMatchTrace | null;
  automationSummary: string | null;
  requiresFollowUp: boolean;
  followUpCategory: FollowUpCategory | null;
  followUpReason: string | null;
  followUpActiveAt: string | null;
  followUpResolvedAt: string | null;
  nextBestAction: string | null;
  lastMessageAt: string;
  latestMessagePreview: string;
  messages: ConversationMessageItem[];
};

export type AvailabilitySlotItem = {
  id: string;
  label: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  timezone: string;
  propertyTitle: string;
  userName: string;
};

export type InternalNotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  createdAt: string;
};
