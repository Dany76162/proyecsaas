import type { VisitStatus } from "@prisma/client";

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
  activity: LeadActivityItem[];
  visits: LeadVisitItem[];
};
