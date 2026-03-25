import type { FollowUpCategory, VisitStatus } from "@prisma/client";
import type { LeadExtractedPreferences, LeadTemperature } from "@/modules/leads/commercial-signals";

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

export type LeadDetail = LeadListItem & {
  assignedUserEmail: string;
  extractedPreferences: LeadExtractedPreferences;
  requiresFollowUp: boolean;
  followUpCategory: FollowUpCategory | null;
  followUpReason: string | null;
  activity: LeadActivityItem[];
  visits: LeadVisitItem[];
};
