import type { AutomationDecision } from "@/modules/automations/types";

const COMMERCIAL_MARKER_START = "[AI_COMMERCIAL]";
const COMMERCIAL_MARKER_END = "[/AI_COMMERCIAL]";

export type LeadTemperature = AutomationDecision["leadTemperature"];
export type LeadExtractedPreferences = AutomationDecision["extractedPreferences"];

export type LeadCommercialSignals = {
  notes: string;
  leadTemperature: LeadTemperature;
  extractedPreferences: LeadExtractedPreferences;
  nextBestAction: string | null;
  requiresFollowUp: boolean;
  followUpReason: string | null;
};

function getDefaultPreferences(): LeadExtractedPreferences {
  return {
    budget: null,
    zones: [],
    rooms: null,
    purpose: null,
  };
}

function getTemperatureLabel(temperature: LeadTemperature) {
  switch (temperature) {
    case "hot":
      return "Hot lead";
    case "warm":
      return "Warm lead";
    case "cold":
      return "Cold lead";
    default:
      return "Lead unclear";
  }
}

export function stripCommercialSignals(notes: string | null | undefined) {
  if (!notes) {
    return "";
  }

  const start = notes.indexOf(COMMERCIAL_MARKER_START);
  const end = notes.indexOf(COMMERCIAL_MARKER_END);

  if (start === -1 || end === -1 || end < start) {
    return notes.trim();
  }

  return `${notes.slice(0, start)}${notes.slice(end + COMMERCIAL_MARKER_END.length)}`
    .trim();
}

export function encodeCommercialSignalsInNotes(
  notes: string | null | undefined,
  decision: AutomationDecision,
) {
  const cleanNotes = stripCommercialSignals(notes);
  const metadata = JSON.stringify({
    leadTemperature: decision.leadTemperature,
    extractedPreferences: decision.extractedPreferences,
    nextBestAction: decision.nextBestAction,
    requiresFollowUp: decision.requiresFollowUp,
    followUpReason: decision.followUpReason,
  });

  return [cleanNotes, `${COMMERCIAL_MARKER_START}${metadata}${COMMERCIAL_MARKER_END}`]
    .filter(Boolean)
    .join("\n\n");
}

export function readLeadCommercialSignals(input: {
  notes?: string | null;
  interestLabel?: string | null;
  budgetLabel?: string | null;
}): LeadCommercialSignals {
  const cleanNotes = stripCommercialSignals(input.notes);
  const start = input.notes?.indexOf(COMMERCIAL_MARKER_START) ?? -1;
  const end = input.notes?.indexOf(COMMERCIAL_MARKER_END) ?? -1;

  if (start !== -1 && end !== -1 && end > start) {
    const rawJson = input.notes?.slice(start + COMMERCIAL_MARKER_START.length, end);

    try {
      const parsed = JSON.parse(rawJson ?? "{}") as Partial<LeadCommercialSignals>;

      return {
        notes: cleanNotes,
        leadTemperature: parsed.leadTemperature ?? "unclear",
        extractedPreferences: {
          ...getDefaultPreferences(),
          ...(parsed.extractedPreferences ?? {}),
          zones: parsed.extractedPreferences?.zones ?? [],
        },
        nextBestAction: parsed.nextBestAction ?? null,
        requiresFollowUp: parsed.requiresFollowUp ?? false,
        followUpReason: parsed.followUpReason ?? null,
      };
    } catch {
      return {
        notes: cleanNotes,
        leadTemperature:
          input.interestLabel === "Hot lead"
            ? "hot"
            : input.interestLabel === "Warm lead"
              ? "warm"
              : input.interestLabel === "Cold lead"
                ? "cold"
                : "unclear",
        extractedPreferences: {
          ...getDefaultPreferences(),
          budget: input.budgetLabel && input.budgetLabel !== "Pending qualification"
            ? input.budgetLabel
            : null,
        },
        nextBestAction: null,
        requiresFollowUp: false,
        followUpReason: null,
      };
    }
  }

  return {
    notes: cleanNotes,
    leadTemperature:
      input.interestLabel === "Hot lead"
        ? "hot"
        : input.interestLabel === "Warm lead"
          ? "warm"
          : input.interestLabel === "Cold lead"
            ? "cold"
            : "unclear",
    extractedPreferences: {
      ...getDefaultPreferences(),
      budget:
        input.budgetLabel && input.budgetLabel !== "Pending qualification"
          ? input.budgetLabel
          : null,
    },
    nextBestAction: null,
    requiresFollowUp: false,
    followUpReason: null,
  };
}

export function getLeadTemperatureLabel(temperature: LeadTemperature) {
  return getTemperatureLabel(temperature);
}
