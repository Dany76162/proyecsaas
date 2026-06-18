import type { VisitStatus } from "@prisma/client";

export type VisitListItem = {
  id: string;
  scheduledAt: string;
  status: VisitStatus;
  notes: string;
  propertyId: string | null;
  propertyTitle: string;
  leadId: string;
  leadName: string;
  ownerName: string;
};

export type VisitSummary = {
  total: number;
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
};
