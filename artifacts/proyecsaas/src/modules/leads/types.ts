import type { FollowUpCategory, VisitStatus } from "@prisma/client";
import type { LeadExtractedPreferences, LeadTemperature } from "@/modules/leads/commercial-signals";
import type { MessageDeliveryStatus, MessageDirection, ConversationStatus } from "@prisma/client";
import type { LeadPropertyMatchTrace } from "@/modules/properties/matching";

export type LeadStage =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "VISIT"
  | "CLOSED";

export type LeadListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: LeadStage;
  source: string;
  notes: string;
  interestLabel: string;
  budgetLabel: string;
  ownerName: string;
  propertyId?: string;
  propertyTitle: string;
  developmentId?: string;
  developmentName?: string;
  lastContactAt: string;
  leadTemperature: LeadTemperature;
};

export type LeadSummary = {
  total: number;
  newCount: number;
  contactedCount: number;
  interestedCount: number;
  visitCount: number;
  closedCount: number;
};

export type LeadActivityItem = {
  id: string;
  title: string;
  description: string;
  happenedAt: string;
};

export type LeadVisitItem = {
  id: string;
  scheduledAt: string;
  status: VisitStatus;
  notes: string;
  propertyTitle: string;
};

export type LeadConversationMessageItem = {
  id: string;
  direction: MessageDirection;
  body: string;
  senderName: string;
  sentAt: string;
  deliveryStatus: MessageDeliveryStatus;
  deliveryError: string | null;
};

export type LeadConversationContext = {
  id: string;
  status: ConversationStatus;
  subject: string;
  participantName: string;
  participantPhone: string;
  followUpActive: boolean;
  followUpCategory: FollowUpCategory | null;
  followUpReason: string | null;
  lastMessageAt: string;
  messages: LeadConversationMessageItem[];
};

export type LeadDetail = LeadListItem & {
  assignedUserEmail: string;
  extractedPreferences: LeadExtractedPreferences;
  propertyMatch: LeadPropertyMatchTrace | null;
  nextBestAction: string | null;
  automationSummary: string | null;
  requiresFollowUp: boolean;
  followUpCategory: FollowUpCategory | null;
  followUpReason: string | null;
  activity: LeadActivityItem[];
  visits: LeadVisitItem[];
  conversationContext: LeadConversationContext | null;
};
