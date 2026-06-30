import type { ConversationStatus, LeadStatus, MessageDirection } from "@prisma/client";

export type PreparedConversationContext = {
  conversation: {
    id: string;
    channel: string;
    status: ConversationStatus;
    participantName: string;
    participantPhone: string;
    lastMessageAt: string;
  };
  lead: {
    id: string;
    fullName: string;
    status: LeadStatus;
    phone: string;
    email: string | null;
    propertyId: string | null;
  };
  property:
    | {
        id: string;
        title: string;
        address: string | null;
        city: string | null;
        neighborhood: string | null;
        propertyType: string | null;
        status: string;
        priceCents: number | null;
        currency: string | null;
        priceLabel?: string | null;
        operationType?: string | null;
        rooms?: number | null;
        bedrooms?: number | null;
        bathrooms?: number | null;
        surfaceM2?: number | null;
        parkingSpots?: number | null;
        amenities?: string | null;
        description?: string | null;
        services?: string | null;
        publicUrl?: string | null;
      }
    | null;
  catalogUrl?: string | null;
  propertyMatch:
    | {
        status:
          | "matched"
          | "existing-link"
          | "manual-confirmed"
          | "manual-overridden"
          | "no-match";
        score: number | null;
        reasons: string[];
        consideredSignals: string[];
      }
    | null;
  availability: Array<{
    id: string;
    label: string;
    weekday: number;
    startMinute: number;
    endMinute: number;
    timezone: string;
    userName: string | null;
  }>;
  recentMessages: Array<{
    id: string;
    direction: MessageDirection;
    body: string;
    sentAt: string;
    senderName: string | null;
    senderPhone: string | null;
  }>;
  aiAgent?: {
    name: string;
    tone: "FORMAL" | "FRIENDLY" | "NEUTRAL";
    mode?: "REAL_ESTATE" | "RECEPTION";
    persona: string | null;
    zoneFilters: string[];
    propertyTypes: string[];
    minBudget: number | null;
    maxBudget: number | null;
  } | null;
  lots?: Array<{
    id: string;
    developmentId: string;
    lotNumber: string;
    developmentName: string;
    developmentCity: string | null;
    developmentServices?: string[] | null;
    developmentDescription?: string | null;
    areaSqm: number | null;
    priceCents: number | null;
    currency: string | null;
    priceLabel?: string | null;
    manzana: string | null;
    etapaNombre: string | null;
    destino: string | null;
    frontMeters: number | null;
    backMeters?: number | null;
    publicUrl?: string | null;
  }> | null;
  learnings?: Array<{
    type: string;
    title: string;
    content: string;
  }> | null;
};

export type AutomationDecision = {
  responseText: string;
  qualificationDecision: null | "QUALIFIED" | "DISQUALIFIED";
  visitIntent: null | { requested: boolean };
  leadTemperature: "hot" | "warm" | "cold" | "unclear";
  extractedPreferences: {
    budget: string | null;
    zones: string[];
    rooms: number | null;
    purpose: "living" | "investment" | null;
  };
  nextBestAction: string;
  requiresFollowUp: boolean;
  followUpReason: string | null;
  visitProposal:
    | null
    | {
        proposed: boolean;
        slotSummary?: string;
        scheduledAt?: string | null;
      };
  internalNotes?: string;
};

export type AutomationVisitCreationResult = {
  proposalPresent: boolean;
  concrete: boolean;
  created: boolean;
  reason:
    | "no-proposal"
    | "proposal-not-concrete"
    | "delivery-not-accepted"
    | "already-exists"
    | "created"
    | "creation-failed-safe";
  visitId?: string;
  errorCode?: string;
};

export type AutomationOperatorHandoff = {
  required: boolean;
  reason:
    | "none"
    | "property-context-unresolved"
    | "delivery-skipped"
    | "delivery-failed"
    | "visit-proposal-not-concrete"
    | "visit-creation-failed";
  summary: string;
  notificationCreated: boolean;
  notificationId?: string;
};

export type AutomationHandoffOutcome =
  | "response-persisted"
  | "response-persisted-and-qualified"
  | "response-persisted-awaiting-property"
  | "response-persisted-visit-intent";

export type AutomationWorkerStatus =
  | "duplicate"
  | "ignored"
  | "delivery-provider-accepted"
  | "delivery-skipped"
  | "delivery-failed-safe";
