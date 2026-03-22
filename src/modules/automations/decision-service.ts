import type { AutomationDecision, PreparedConversationContext } from "@/modules/automations/types";

const VISIT_KEYWORDS = [
  "visit",
  "visitar",
  "ver",
  "verlo",
  "tour",
  "recorrido",
  "agendar",
  "agenda",
  "schedule",
  "showing",
];

function hasVisitIntent(input: string) {
  const normalized = input.toLowerCase();
  return VISIT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function getLatestInboundMessage(context: PreparedConversationContext) {
  return [...context.recentMessages]
    .reverse()
    .find((message) => message.direction === "INBOUND");
}

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatMinute(minute: number) {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getAvailabilitySummary(context: PreparedConversationContext) {
  if (!context.availability.length) {
    return null;
  }

  return context.availability
    .slice(0, 2)
    .map(
      (slot) =>
        `${WEEKDAY_LABELS[slot.weekday] ?? "Weekday"} ${formatMinute(slot.startMinute)}-${formatMinute(slot.endMinute)}`,
    )
    .join(" or ");
}

function getTimezoneOffsetMinutes(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(date);

  const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offset.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? "0");
  const minutes = Number(match[3] ?? "0");

  return sign * (hours * 60 + minutes);
}

function getConcreteScheduledAt(context: PreparedConversationContext) {
  if (context.availability.length !== 1) {
    return null;
  }

  const slot = context.availability[0];
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: slot.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentWeekday = weekdayMap[map.weekday ?? ""] ?? 0;
  const currentMinute = Number(map.hour ?? "0") * 60 + Number(map.minute ?? "0");
  let daysUntil = (slot.weekday - currentWeekday + 7) % 7;

  if (daysUntil === 0 && currentMinute >= slot.startMinute) {
    daysUntil = 7;
  }

  const localDateBase = new Date(
    Date.UTC(
      Number(map.year ?? "1970"),
      Number(map.month ?? "1") - 1,
      Number(map.day ?? "1") + daysUntil,
    ),
  );
  const startHour = Math.floor(slot.startMinute / 60);
  const startMinute = slot.startMinute % 60;
  const localAsUtc = new Date(
    Date.UTC(
      localDateBase.getUTCFullYear(),
      localDateBase.getUTCMonth(),
      localDateBase.getUTCDate(),
      startHour,
      startMinute,
      0,
      0,
    ),
  );
  const offsetMinutes = getTimezoneOffsetMinutes(slot.timezone, localAsUtc);

  return new Date(localAsUtc.getTime() - offsetMinutes * 60_000).toISOString();
}

export async function generateAutomationDecision(
  context: PreparedConversationContext,
): Promise<AutomationDecision> {
  const latestInbound = getLatestInboundMessage(context);
  const latestBody = latestInbound?.body.trim() ?? "";
  const visitRequested = latestBody ? hasVisitIntent(latestBody) : false;
  const availabilitySummary = getAvailabilitySummary(context);
  const concreteScheduledAt = getConcreteScheduledAt(context);

  if (!context.property) {
    return {
      responseText:
        "Thanks for reaching out. Could you tell us which property you are asking about so we can help you faster?",
      qualificationDecision: null,
      visitIntent: visitRequested ? { requested: true } : null,
      visitProposal: null,
      internalNotes: "Missing property context. Automation should clarify the requested property.",
    };
  }

  if (visitRequested) {
    if (availabilitySummary) {
      return {
        responseText: `Thanks for your interest in ${context.property.title}. We can coordinate a visit. We currently have availability around ${availabilitySummary}. Does one of those options work for you?`,
        qualificationDecision: "QUALIFIED",
        visitIntent: { requested: true },
        visitProposal: {
          proposed: true,
          slotSummary: availabilitySummary,
          scheduledAt: concreteScheduledAt,
        },
        internalNotes:
          concreteScheduledAt
            ? "Visit intent detected with one deterministic availability slot ready for safe scheduling."
            : "Visit intent detected and active availability slots were found.",
      };
    }

    return {
      responseText: `Thanks for your interest in ${context.property.title}. We can help coordinate a visit, but the current availability is still being confirmed. What day and time would you prefer?`,
      qualificationDecision: "QUALIFIED",
      visitIntent: { requested: true },
      visitProposal: {
        proposed: false,
        slotSummary: "No active availability slots found yet.",
        scheduledAt: null,
      },
      internalNotes: "Visit intent detected but no active availability slots were found.",
    };
  }

  if (context.lead.status === "NEW") {
    return {
      responseText: `Thanks for your interest in ${context.property.title}. To help you better, are you looking to move soon or just exploring options right now?`,
      qualificationDecision: null,
      visitIntent: null,
      visitProposal: null,
      internalNotes: "Lead is still new. Automation is asking a first qualification follow-up.",
    };
  }

  return {
    responseText: `Thanks for the message about ${context.property.title}. We have your details and will keep helping from here. If you want, share your preferred schedule or any questions about the property.`,
    qualificationDecision: null,
    visitIntent: null,
    visitProposal: null,
    internalNotes: "Safe default follow-up generated from existing property context.",
  };
}
