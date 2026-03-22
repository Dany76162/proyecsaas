import type {
  ConversationStatus,
  LeadStatus,
  MessageDirection,
  NotificationType,
} from "@prisma/client";
import type { LeadTemperature } from "@/modules/leads/commercial-signals";

export type ConversationMessageItem = {
  id: string;
  direction: MessageDirection;
  body: string;
  senderName: string;
  senderPhone: string;
  sentAt: string;
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
