import OpenAI from "openai";
import { z } from "zod";
import { getOpenAIClient as getSharedOpenAIClient } from "@/lib/ai/openai";

import type { AutomationDecision, PreparedConversationContext } from "@/modules/automations/types";

const AI_REQUEST_TIMEOUT_MS = 15_000;
const FALLBACK_VISIT_KEYWORDS = [
  "visita",
  "visitar",
  "ver",
  "verlo",
  "recorrido",
  "agenda",
  "agendar",
  "turno",
  "mostrar",
];
const FALLBACK_BUDGET_HINTS = ["usd", "ars", "$", "dolar", "presupuesto", "millon"];
const FALLBACK_INVESTMENT_HINTS = ["inversion", "renta", "rentabilidad", "airbnb"];
const WEEKDAY_LABELS = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

const aiDecisionSchema = z.object({
  message: z.string().min(1),
  intent: z.string().min(1),
  shouldScheduleVisit: z.boolean(),
  proposedVisitDate: z
    .union([z.string().datetime({ offset: true }), z.string().datetime(), z.null()])
    .nullable(),
  needsHumanHandoff: z.boolean(),
  confidence: z.number().min(0).max(1),
  leadTemperature: z.enum(["hot", "warm", "cold", "unclear"]),
  extractedPreferences: z.object({
    budget: z.string().nullable(),
    zones: z.array(z.string()),
    rooms: z.number().int().positive().nullable(),
    purpose: z.enum(["living", "investment"]).nullable(),
  }),
  nextBestAction: z.string().min(1),
  requiresFollowUp: z.boolean(),
  followUpReason: z.string().nullable(),
});

type AiDecisionPayload = z.infer<typeof aiDecisionSchema>;

let openAiClient: OpenAI | null | undefined;

function getLatestInboundMessage(context: PreparedConversationContext) {
  return [...context.recentMessages]
    .reverse()
    .find((message) => message.direction === "INBOUND");
}

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
    .slice(0, 3)
    .map((slot) => {
      const weekday = WEEKDAY_LABELS[slot.weekday] ?? "dia";
      const range = `${formatMinute(slot.startMinute)}-${formatMinute(slot.endMinute)}`;
      const advisor = slot.userName ? ` con ${slot.userName}` : "";

      return `${weekday} ${range}${advisor}`;
    })
    .join(", ");
}

function getDoubleOptionVisitSummary(context: PreparedConversationContext) {
  if (context.availability.length < 2) {
    return getAvailabilitySummary(context);
  }

  return context.availability
    .slice(0, 2)
    .map((slot) => {
      const weekday = WEEKDAY_LABELS[slot.weekday] ?? "dia";
      const range = `${formatMinute(slot.startMinute)}-${formatMinute(slot.endMinute)}`;
      return `${weekday} ${range}`;
    })
    .join(" o ");
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

function hasVisitIntentFallback(input: string) {
  const normalized = input.toLowerCase();
  return FALLBACK_VISIT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function extractRoomsFallback(input: string) {
  const match = input.match(/(\d+)\s*(ambientes|ambiente|dormitorios|dormitorio|cuartos|cuarto)/i);
  return match ? Number(match[1]) : null;
}

function extractPreferencesFallback(context: PreparedConversationContext) {
  const latestBody = getLatestInboundMessage(context)?.body ?? "";
  const normalized = latestBody.toLowerCase();

  return {
    budget: FALLBACK_BUDGET_HINTS.some((hint) => normalized.includes(hint)) ? latestBody : null,
    zones: [],
    rooms: extractRoomsFallback(latestBody),
    purpose: FALLBACK_INVESTMENT_HINTS.some((hint) => normalized.includes(hint))
      ? "investment"
      : null,
  } satisfies AutomationDecision["extractedPreferences"];
}

function hasMatchedPropertyContext(context: PreparedConversationContext) {
  return Boolean(context.property && context.propertyMatch?.status !== "no-match");
}

function hasAvailability(context: PreparedConversationContext) {
  return context.availability.length > 0;
}

function getMissingDemandSignals(
  preferences: AutomationDecision["extractedPreferences"],
  context: PreparedConversationContext,
) {
  const missingSignals: string[] = [];
  const latestBody = getLatestInboundMessage(context)?.body ?? "";

  if (!preferences.zones.length) {
    missingSignals.push("zona");
  }

  if (!preferences.budget && !FALLBACK_BUDGET_HINTS.some((hint) => latestBody.toLowerCase().includes(hint))) {
    missingSignals.push("presupuesto");
  }

  if (!preferences.rooms) {
    missingSignals.push("cantidad de ambientes");
  }

  if (!context.property && !context.propertyMatch?.consideredSignals.includes("property type")) {
    missingSignals.push("tipo de propiedad");
  }

  return missingSignals;
}

function applyToneToFallbackResponse(text: string, context: PreparedConversationContext): string {
  const tone = context.aiAgent?.tone;
  if (tone !== "FORMAL") {
    return text;
  }
  return text
    .replace(/\btu interes\b/gi, "su interés")
    .replace(/\btu mensaje\b/gi, "su mensaje")
    .replace(/\bte sirve\b/gi, "le sirve")
    .replace(/\bTe sirve\b/gi, "Le sirve")
    .replace(/\bte quedan\b/gi, "le quedan")
    .replace(/\bte quedan\b/gi, "le quedan")
    .replace(/\bEstas buscando\b/gi, "Está buscando")
    .replace(/\bestas buscando\b/gi, "está buscando")
    .replace(/\bte gustaria\b/gi, "le gustaría")
    .replace(/\bcontame\b/gi, "coménteme")
    .replace(/\bContame\b/gi, "Coménteme")
    .replace(/\bdecime\b/gi, "indíqueme")
    .replace(/\bDecime\b/gi, "Indíqueme")
    .replace(/\bSi queres\b/gi, "Si desea")
    .replace(/\bsi queres\b/gi, "si desea")
    .replace(/\bte interesa\b/gi, "le interesa")
    .replace(/\bte interesa\b/gi, "le interesa")
    .replace(/\bte ayudo\b/gi, "le ayudo")
    .replace(/\bte acerco\b/gi, "le acerco");
}

function buildClarifyingQuestion(
  preferences: AutomationDecision["extractedPreferences"],
  context: PreparedConversationContext,
) {
  const missingSignals = getMissingDemandSignals(preferences, context);

  if (!missingSignals.length) {
    return applyToneToFallbackResponse("Contame un poco mas sobre la propiedad que te interesa y te acerco una opcion concreta.", context);
  }

  if (missingSignals.length === 1) {
    return applyToneToFallbackResponse(`Para acercarte una propiedad mejor, decime ${missingSignals[0]}.`, context);
  }

  if (missingSignals.length === 2) {
    return applyToneToFallbackResponse(`Para acercarte una opcion mejor, decime ${missingSignals[0]} y ${missingSignals[1]}.`, context);
  }

  return applyToneToFallbackResponse(`Para acercarte una propiedad mejor, decime ${missingSignals.slice(0, 2).join(", ")} y ${missingSignals[2]}.`, context);
}

function appendInternalNotes(
  decision: AutomationDecision,
  notes: Array<string | null | undefined>,
) {
  return {
    ...decision,
    internalNotes: [decision.internalNotes, ...notes].filter(Boolean).join(" ").trim() || undefined,
  };
}

function enrichDecisionWithContext(
  decision: AutomationDecision,
  context: PreparedConversationContext,
) {
  const latestInbound = getLatestInboundMessage(context);
  const latestBody = latestInbound?.body.trim() ?? "";
  const visitRequested = latestBody ? hasVisitIntentFallback(latestBody) : false;
  const availabilitySummary = getAvailabilitySummary(context);
  const doubleOptionSummary = getDoubleOptionVisitSummary(context);
  const concreteScheduledAt = getConcreteScheduledAt(context);
  const hasMatchedProperty = hasMatchedPropertyContext(context);
  const availableSlots = hasAvailability(context);
  const missingSignals = getMissingDemandSignals(decision.extractedPreferences, context);

  if (!hasMatchedProperty) {
    return appendInternalNotes(
      {
        ...decision,
        nextBestAction:
          missingSignals.length >= 2 ? "pedir-zona-y-presupuesto" : "clarificar-propiedad-objetivo",
        visitIntent: visitRequested ? { requested: true } : decision.visitIntent,
        visitProposal: null,
        followUpReason:
          decision.followUpReason ??
          "No se encontro una propiedad suficientemente clara en el inventario para proponer visita todavia.",
      },
      [
        "No inventory match was available, so the next step stays in clarification mode.",
        context.propertyMatch?.reasons[0] ?? null,
      ],
    );
  }

  if (
    availableSlots &&
    (visitRequested || decision.visitIntent?.requested || decision.qualificationDecision === "QUALIFIED")
  ) {
    return appendInternalNotes(
      {
        ...decision,
        qualificationDecision: decision.qualificationDecision ?? "QUALIFIED",
        leadTemperature:
          decision.leadTemperature === "unclear" ? "warm" : decision.leadTemperature,
        nextBestAction: "proponer-visita-propiedad-vinculada",
        visitIntent: { requested: true },
        visitProposal: {
          proposed: Boolean(concreteScheduledAt),
          slotSummary: doubleOptionSummary ?? availabilitySummary ?? undefined,
          scheduledAt: concreteScheduledAt,
        },
        requiresFollowUp: false,
        followUpReason: null,
      },
      [
        `Property match is active for ${context.property?.title ?? "the linked property"}.`,
        availabilitySummary
          ? `Availability is ready, so the system can push a concrete visit proposal (${doubleOptionSummary ?? availabilitySummary}).`
          : null,
      ],
    );
  }

  if (
    hasMatchedProperty &&
    !availableSlots &&
    (visitRequested || decision.visitIntent?.requested || decision.leadTemperature === "hot")
  ) {
    return appendInternalNotes(
      {
        ...decision,
        qualificationDecision: decision.qualificationDecision ?? "QUALIFIED",
        nextBestAction: "pedir-horario-o-derivar-por-disponibilidad",
        visitIntent: { requested: true },
        visitProposal: {
          proposed: false,
          slotSummary: "Sin disponibilidad activa confirmada para la propiedad vinculada.",
          scheduledAt: null,
        },
        requiresFollowUp: true,
        followUpReason:
          decision.followUpReason ??
          `Hay interes por visitar ${context.property?.title ?? "la propiedad vinculada"}, pero falta disponibilidad concreta para cerrarlo.`,
      },
      [
        `The lead shows visit intent for ${context.property?.title ?? "the linked property"}, but there is no active availability yet.`,
      ],
    );
  }

  if (hasMatchedProperty && decision.leadTemperature === "cold") {
    return appendInternalNotes(
      {
        ...decision,
        nextBestAction: "confirmar-interes-antes-de-visita",
      },
      [
        `Property match exists for ${context.property?.title ?? "the linked property"}, but the lead is still in low-intent discovery.`,
      ],
    );
  }

  return appendInternalNotes(
    {
      ...decision,
      nextBestAction:
        decision.nextBestAction === "seguir-conversacion"
          ? "seguir-nutriendo-propiedad-vinculada"
          : decision.nextBestAction,
    },
    [
      hasMatchedProperty
        ? `Property context stays anchored on ${context.property?.title ?? "the linked property"}.`
        : null,
    ],
  );
}

function buildCommercialSignalDefaults(
  context: PreparedConversationContext,
  overrides: Partial<
    Pick<
      AutomationDecision,
      | "leadTemperature"
      | "extractedPreferences"
      | "nextBestAction"
      | "requiresFollowUp"
      | "followUpReason"
    >
  > = {},
) {
  return {
    leadTemperature: overrides.leadTemperature ?? "unclear",
    extractedPreferences: overrides.extractedPreferences ?? extractPreferencesFallback(context),
    nextBestAction: overrides.nextBestAction ?? "seguir-conversacion",
    requiresFollowUp: overrides.requiresFollowUp ?? false,
    followUpReason: overrides.followUpReason ?? null,
  };
}

function getOpenAiClient() {
  if (openAiClient !== undefined) {
    return openAiClient;
  }

  openAiClient = getSharedOpenAIClient();
  return openAiClient;
}

function getDecisionModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function buildPrompt(context: PreparedConversationContext) {
  const availabilitySummary = getAvailabilitySummary(context);
  const doubleOptionSummary = getDoubleOptionVisitSummary(context);
  const agent = context.aiAgent;

  const identityLine = agent?.name
    ? `Tu nombre es "${agent.name}" y sos un asesor comercial inmobiliario de Argentina atendiendo por WhatsApp.`
    : "Sos un asesor comercial inmobiliario de Argentina atendiendo por WhatsApp.";

  let toneLine = "Escribi siempre en espanol de Argentina, con tono profesional, cercano y breve.";
  if (agent?.tone === "FORMAL") {
    toneLine = "Escribi siempre en espanol de Argentina, con tono profesional, educado, respetuoso y formal (debes usar el pronombre 'usted' y sus conjugaciones correspondientes, ej. '¿Cómo está usted?', 'le comento', 'su consulta', 'le acerco').";
  } else if (agent?.tone === "FRIENDLY") {
    toneLine = "Escribi siempre en espanol de Argentina, con tono amigable, calido, cercano y breve (debes usar el voseo argentino de forma natural, ej. '¿Cómo andás?', 'te cuento', 'tenés', 'te acerco').";
  } else if (agent?.tone === "NEUTRAL") {
    toneLine = "Escribi siempre en espanol de Argentina, con tono conciso, directo, neutral y breve.";
  }

  const personaLine = agent?.persona
    ? `Tu personalidad e instrucciones adicionales de comportamiento que debes seguir a rajatabla:\n${agent.persona}`
    : null;

  const zoneLine = (agent?.zoneFilters && agent.zoneFilters.length > 0)
    ? `Zonas de enfoque exclusivas: ${agent.zoneFilters.join(", ")}. Solo debes recomendar o buscar propiedades en estas zonas. Si te consultan por otras zonas, aclara con amabilidad que te especializas en estas y pregunta si les interesa alguna de ellas.`
    : null;

  const typeLine = (agent?.propertyTypes && agent.propertyTypes.length > 0)
    ? `Tipos de propiedad en los que te especializas: ${agent.propertyTypes.join(", ")}.`
    : null;

  let budgetLine = null;
  if (agent?.minBudget !== undefined && agent?.minBudget !== null && agent?.maxBudget !== undefined && agent?.maxBudget !== null) {
    budgetLine = `Rango de presupuesto de las propiedades que buscas/ofreces: USD ${agent.minBudget} - USD ${agent.maxBudget}.`;
  } else if (agent?.minBudget !== undefined && agent?.minBudget !== null) {
    budgetLine = `Presupuesto minimo de las propiedades que buscas/ofreces: USD ${agent.minBudget}.`;
  } else if (agent?.maxBudget !== undefined && agent?.maxBudget !== null) {
    budgetLine = `Presupuesto maximo de las propiedades que buscas/ofreces: USD ${agent.maxBudget}.`;
  }

  const systemInstructions = [
    identityLine,
    toneLine,
    "Las respuestas deben ser cortas, naturales y aptas para WhatsApp.",
    "No inventes datos: solo podes usar el contexto provisto.",
    personaLine,
    zoneLine,
    typeLine,
    budgetLine,
    "Comportamiento comercial esperado:",
    "- HOT: empuja directo a coordinar visita.",
    "- WARM: responde y ancla hacia visita.",
    "- COLD: aporta valor y hace una pregunta de calificacion.",
    "- UNCLEAR: aclara contexto o deriva a humano si hace falta.",
    "Reglas comerciales:",
    "- Si hay disponibilidad, preferi proponer dos opciones concretas.",
    "- Si ya hay una propiedad vinculada o matcheada de forma confiable, usala como contexto principal para decidir el siguiente paso.",
    "- Si hay propiedad matcheada + disponibilidad + senal clara de interes, orienta la respuesta a proponer visita.",
    "- Si hay propiedad matcheada pero todavia no alcanza para visita, pedi la aclaracion minima util sin volver a cero.",
    "- Si NO hay property match claro, no inventes una propiedad: pedi zona, presupuesto, ambientes o tipo segun falte.",
    "- No presiones a leads frios.",
    "- Si el lead es vago, intenta pedir zona, presupuesto o finalidad.",
    "- Deriva a humano si aparecen negociacion, temas legales, friccion repetida o pedido explicito de hablar con una persona.",
    "Debes devolver SOLO JSON valido con esta forma exacta:",
    "{",
    '  "message": string,',
    '  "intent": string,',
    '  "shouldScheduleVisit": boolean,',
    '  "proposedVisitDate": string | null,',
    '  "needsHumanHandoff": boolean,',
    '  "confidence": number,',
    '  "leadTemperature": "hot" | "warm" | "cold" | "unclear",',
    '  "extractedPreferences": {',
    '    "budget": string | null,',
    '    "zones": string[],',
    '    "rooms": number | null,',
    '    "purpose": "living" | "investment" | null',
    "  },",
    '  "nextBestAction": string,',
    '  "requiresFollowUp": boolean,',
    '  "followUpReason": string | null',
    "}",
  ].filter(Boolean) as string[];

  return {
    system: systemInstructions.join("\n"),
    user: JSON.stringify(
      {
        conversation: context.conversation,
        lead: context.lead,
        property: context.property,
        propertyMatch: context.propertyMatch,
        availability: context.availability,
        availabilitySummary,
        preferredVisitOptions: doubleOptionSummary,
        recentMessages: context.recentMessages,
      },
      null,
      2,
    ),
  };
}

function mapQualificationDecision(payload: AiDecisionPayload) {
  const normalizedIntent = payload.intent.trim().toLowerCase();

  if (normalizedIntent.includes("disqual") || normalizedIntent.includes("descart")) {
    return "DISQUALIFIED" as const;
  }

  if (
    payload.leadTemperature === "hot" ||
    payload.shouldScheduleVisit ||
    normalizedIntent.includes("visit") ||
    normalizedIntent.includes("qualif")
  ) {
    return "QUALIFIED" as const;
  }

  return null;
}

function mapAiDecisionToAutomationDecision(
  payload: AiDecisionPayload,
  context: PreparedConversationContext,
): AutomationDecision {
  const hasConcreteVisitDate =
    typeof payload.proposedVisitDate === "string" &&
    !Number.isNaN(new Date(payload.proposedVisitDate).getTime());

  return enrichDecisionWithContext({
    responseText: payload.message.trim(),
    qualificationDecision: mapQualificationDecision(payload),
    visitIntent: payload.shouldScheduleVisit ? { requested: true } : null,
    leadTemperature: payload.leadTemperature,
    extractedPreferences: {
      budget: payload.extractedPreferences.budget,
      zones: payload.extractedPreferences.zones,
      rooms: payload.extractedPreferences.rooms,
      purpose: payload.extractedPreferences.purpose,
    },
    nextBestAction: payload.nextBestAction.trim(),
    requiresFollowUp: payload.requiresFollowUp,
    followUpReason: payload.followUpReason,
    visitProposal: payload.shouldScheduleVisit
      ? {
          proposed: hasConcreteVisitDate,
          slotSummary: getDoubleOptionVisitSummary(context) ?? undefined,
          scheduledAt: hasConcreteVisitDate ? payload.proposedVisitDate : null,
        }
      : null,
    internalNotes: [
      `AI intent: ${payload.intent}`,
      `AI confidence: ${payload.confidence}`,
      `Lead temperature: ${payload.leadTemperature}`,
      payload.needsHumanHandoff ? "AI marked this conversation for human handoff." : null,
      payload.requiresFollowUp && payload.followUpReason
        ? `Follow-up reason: ${payload.followUpReason}`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  }, context);
}

function buildDeterministicFallback(
  context: PreparedConversationContext,
  reason: string,
): AutomationDecision {
  const latestInbound = getLatestInboundMessage(context);
  const latestBody = latestInbound?.body.trim() ?? "";
  const visitRequested = latestBody ? hasVisitIntentFallback(latestBody) : false;
  const availabilitySummary = getAvailabilitySummary(context);
  const doubleOptionSummary = getDoubleOptionVisitSummary(context);
  const concreteScheduledAt = getConcreteScheduledAt(context);

  if (!context.property) {
    return enrichDecisionWithContext({
      responseText: buildClarifyingQuestion(extractPreferencesFallback(context), context),
      qualificationDecision: null,
      visitIntent: visitRequested ? { requested: true } : null,
      ...buildCommercialSignalDefaults(context, {
        leadTemperature: "unclear",
        nextBestAction: "clarificar-propiedad-objetivo",
        requiresFollowUp: false,
      }),
      visitProposal: null,
      internalNotes: `Fallback activado (${reason}). Falta contexto de propiedad.`,
    }, context);
  }

  if (visitRequested) {
    if (availabilitySummary) {
      return enrichDecisionWithContext({
        responseText: applyToneToFallbackResponse(`Gracias por tu interes en ${context.property.title}. Podemos coordinar visita. Tengo ${doubleOptionSummary ?? availabilitySummary}. Te sirve alguna?`, context),
        qualificationDecision: "QUALIFIED",
        visitIntent: { requested: true },
        ...buildCommercialSignalDefaults(context, {
          leadTemperature: "hot",
          nextBestAction: "coordinar-visita",
          requiresFollowUp: false,
        }),
        visitProposal: {
          proposed: Boolean(concreteScheduledAt),
          slotSummary: doubleOptionSummary ?? availabilitySummary,
          scheduledAt: concreteScheduledAt,
        },
        internalNotes: `Fallback activado (${reason}). Intencion de visita detectada con disponibilidad.`,
      }, context);
    }

    return enrichDecisionWithContext({
      responseText: applyToneToFallbackResponse(`Gracias por tu interes en ${context.property.title}. Quiero ayudarte a coordinar visita. Que dia y horario te quedan mejor?`, context),
      qualificationDecision: "QUALIFIED",
      visitIntent: { requested: true },
      ...buildCommercialSignalDefaults(context, {
        leadTemperature: "warm",
        nextBestAction: "pedir-horario-preferido",
        requiresFollowUp: true,
        followUpReason: "Falta disponibilidad concreta para cerrar la visita.",
      }),
      visitProposal: {
        proposed: false,
        slotSummary: "Sin disponibilidad activa confirmada.",
        scheduledAt: null,
      },
      internalNotes: `Fallback activado (${reason}). Intencion de visita detectada sin disponibilidad activa.`,
    }, context);
  }

  if (context.lead.status === "NEW") {
    return enrichDecisionWithContext({
      responseText: applyToneToFallbackResponse(`Gracias por tu interes en ${context.property.title}. Estas buscando para vivir o como inversion? Y en que zona te gustaria enfocarte?`, context),
      qualificationDecision: null,
      visitIntent: null,
      ...buildCommercialSignalDefaults(context, {
        leadTemperature: "cold",
        nextBestAction: "calificar-necesidad",
        requiresFollowUp: true,
        followUpReason: "Faltan datos comerciales basicos del lead.",
      }),
      visitProposal: null,
      internalNotes: `Fallback activado (${reason}). Lead nuevo, se envia pregunta comercial de calificacion.`,
    }, context);
  }

  return enrichDecisionWithContext({
    responseText: applyToneToFallbackResponse(`Gracias por tu mensaje sobre ${context.property.title}. Si queres, contame presupuesto, zona ideal o si te interesa coordinar una visita.`, context),
    qualificationDecision: null,
    visitIntent: null,
    ...buildCommercialSignalDefaults(context, {
      leadTemperature: "warm",
      nextBestAction: "llevar-a-visita-o-calificar",
      requiresFollowUp: false,
    }),
    visitProposal: null,
    internalNotes: `Fallback activado (${reason}). Seguimiento comercial seguro con contexto de propiedad.`,
  }, context);
}

async function generateAiDecision(context: PreparedConversationContext) {
  const client = getOpenAiClient();

  if (!client) {
    return null;
  }

  const prompt = buildPrompt(context);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>;

  try {
    completion = await client.chat.completions.create(
      {
        model: getDecisionModel(),
        temperature: 0.2,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: prompt.system,
          },
          {
            role: "user",
            content: prompt.user,
          },
        ],
      },
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timeout);
  }

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("empty-llm-response");
  }

  const parsed = aiDecisionSchema.safeParse(JSON.parse(content));

  if (!parsed.success) {
    throw new Error("invalid-llm-json");
  }

  return parsed.data;
}

export async function generateAutomationDecision(
  context: PreparedConversationContext,
): Promise<AutomationDecision> {
  try {
    const aiDecision = await generateAiDecision(context);

    if (!aiDecision) {
      return buildDeterministicFallback(context, "openai-not-configured");
    }

    return mapAiDecisionToAutomationDecision(aiDecision, context);
  } catch (error) {
    console.error(
      "[automation-decision] Falling back to deterministic commercial decision service",
      error instanceof Error ? error.message : error,
    );

    return buildDeterministicFallback(
      context,
      error instanceof Error ? error.message : "llm-request-failed",
    );
  }
}
