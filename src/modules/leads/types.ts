import type { LeadStatus } from "@prisma/client";

export type LeadListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  notes: string;
  interestLabel: string;
  budgetLabel: string;
  ownerName: string;
  lastContactAt: string;
};

export type LeadSummary = {
  total: number;
  newCount: number;
  qualifiedCount: number;
  ownerCoverage: number;
};
