import OpenAI from "openai";
import { z } from "zod";

import type { AutomationDecision, PreparedConversationContext } from "@/modules/automations/types";
import { formatCurrency } from "@/lib/utils";

const AI_REQUEST_TIMEOUT_MS = 15_000;
const FALLBACK_VISIT_KEYWORDS = [
  "visita",
  "visitar",
  "recorrido",
  "agenda",
  "agendar",
  "turno",
  "coordinar",
  "ir a ver",
];
const FALLBACK_BUDGET_HINTS = ["usd", "ars", "$", "dolar", "presupuesto", "millon"];
const FALLBACK_INVESTMENT_HINTS = ["inversion", "renta", "rentabilidad", "airbnb"];

// ─── Intent detection ────────────────────────────────────────────────────────
const PHOTO_INTENT_KEYWORDS = [
  "foto", "fotos", "fotografia", "imagen", "imagenes", "pic", "pics",
  "pasame fotos", "tenes fotos", "hay fotos", "manda fotos",
];
const CATALOG_INTENT_KEYWORDS = [
  "catalogo", "catálogo", "que tenes", "qué tenés", "que tienen", "inventario",
  "otras propiedades", "mas opciones", "más opciones", "ver propiedades",
  "listado", "todas las propiedades",
];
const ZONE_INTENT_KEYWORDS = [
  "zona", "barrio",
  "palermo", "belgrano", "recoleta", "nuñez", "caballito",
  "villa crespo", "villa urquiza", "villa devoto", "villa del parque",
  "flores", "floresta", "devoto", "urquiza", "almagro", "boedo",
  "san telmo", "puerto madero", "retiro", "microcentro", "once",
  "chacarita", "colegiales", "saavedra", "parque patricios",
];

export type LeadDetectedIntents = {
  pide_fotos: boolean;
  pide_catalogo: boolean;
  quiere_visita: boolean;
  pide_precio: boolean;
  busca_zona: boolean;
};

export function detectLeadIntents(body: string): LeadDetectedIntents {
  const n = body.toLowerCase();
  return {
    pide_fotos: PHOTO_INTENT_KEYWORDS.some((k) => n.includes(k)),
    pide_catalogo: CATALOG_INTENT_KEYWORDS.some((k) => n.includes(k)),
    quiere_visita: FALLBACK_VISIT_KEYWORDS.some((k) => n.includes(k)),
    pide_precio: /precio|valor|costo|cuánto|cuanto|sale\?|cuesta/.test(n),
    busca_zona: ZONE_INTENT_KEYWORDS.some((k) => n.includes(k)),
  };
}
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

function buildClarifyingQuestion(
  preferences: AutomationDecision["extractedPreferences"],
  context: PreparedConversationContext,
) {
  const missingSignals = getMissingDemandSignals(preferences, context);

  if (!missingSignals.length) {
    return "Contame un poco mas sobre la propiedad que te interesa y te acerco una opcion concreta.";
  }

  if (missingSignals.length === 1) {
    return `Para acercarte una propiedad mejor, decime ${missingSignals[0]}.`;
  }

  if (missingSignals.length === 2) {
    return `Para acercarte una opcion mejor, decime ${missingSignals[0]} y ${missingSignals[1]}.`;
  }

  return `Para acercarte una propiedad mejor, decime ${missingSignals.slice(0, 2).join(", ")} y ${missingSignals[2]}.`;
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

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    openAiClient = null;
    return openAiClient;
  }

  openAiClient = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });

  return openAiClient;
}

function getDecisionModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function buildPrompt(context: PreparedConversationContext) {
  const availabilitySummary = getAvailabilitySummary(context);
  const doubleOptionSummary = getDoubleOptionVisitSummary(context);
  const latestBody = getLatestInboundMessage(context)?.body ?? "";
  const intents = detectLeadIntents(latestBody);
  const hasPropertyMatch = hasMatchedPropertyContext(context);
  const propertyHasImages = (context.property?.imageCount ?? 0) > 0;
  const propertyPublicUrl = context.property?.publicUrl ?? null;
  const catalogUrl = context.catalogUrl ?? null;

  const system = [
    "Sos un asesor comercial inmobiliario de Argentina atendiendo consultas por WhatsApp.",
    "Idioma: espanol de Argentina. Tono: profesional, cercano, sin presionar. Longitud: maximo 3 oraciones.",
    "",
    "=== REGLA FUNDAMENTAL ===",
    "NUNCA inventes propiedades, fotos ni links. Solo usa datos del campo 'context' que viene en el mensaje del usuario.",
    "Si un campo no existe o es null, no lo menciones.",
    "",
    "=== LECTURA DEL CONTEXTO ===",
    "El campo 'context' contiene informacion pre-procesada que DEBES leer primero:",
    "- hasPropertyMatch: si hay una propiedad matcheada confiablemente",
    "- propertyHasImages: si esa propiedad tiene fotos cargadas",
    "- propertyPublicUrl: link publico de la propiedad (null si no existe)",
    "- catalogUrl: link del catalogo de la inmobiliaria (null si no existe)",
    "- detectedIntents: que quiere el lead en este mensaje",
    "- hasAvailability: si hay horarios de visita disponibles",
    "- preferredVisitOptions: dos opciones de horario para proponer",
    "",
    "=== REGLAS SEGUN INTENCION ===",
    "",
    "SI detectedIntents incluye 'pide_fotos':",
    "  - Si hasPropertyMatch y propertyPublicUrl existe y propertyHasImages:",
    "    → Compartí el link. Ej: 'Aca tenes las fotos: [url]'",
    "  - Si hasPropertyMatch y propertyPublicUrl existe pero NO hay imagenes:",
    "    → Decí que las fotos están siendo cargadas. Ofrecé visita presencial.",
    "  - Si hasPropertyMatch y NO hay propertyPublicUrl:",
    "    → Ofrecé coordinar visita para ver la propiedad en persona.",
    "  - Si NO hasPropertyMatch y catalogUrl existe:",
    "    → Compartí el catalogo. Ej: 'Te paso el catalogo completo: [url]'",
    "",
    "SI detectedIntents incluye 'pide_catalogo':",
    "  - Si catalogUrl existe:",
    "    → Compartí el catalogo: 'Aca esta el catalogo completo: [url]'",
    "  - Si NO existe catalogUrl:",
    "    → Pedí zona, presupuesto y tipo para acercarle opciones.",
    "",
    "SI detectedIntents incluye 'quiere_visita':",
    "  - Si hasPropertyMatch y hasAvailability:",
    "    → Proponé exactamente las dos opciones de preferredVisitOptions.",
    "  - Si hasPropertyMatch y NO hasAvailability:",
    "    → Confirmá el interes y preguntá que dia/horario le queda mejor.",
    "  - Si NO hasPropertyMatch:",
    "    → Pedí que aclare que propiedad quiere ver antes de proponer fecha.",
    "",
    "SI detectedIntents incluye 'pide_precio':",
    "  - Si hasPropertyMatch y property.priceFormatted no es null:",
    "    → Usá ese valor exactamente: 'El precio es [priceFormatted]'",
    "  - Si priceFormatted es null: decí que el precio se coordina con el asesor.",
    "",
    "SI detectedIntents incluye 'busca_zona' y NO hasPropertyMatch:",
    "  - Si catalogUrl existe: compartí el catalogo y pedí mas datos.",
    "  - Si no: pedí zona, presupuesto y tipo.",
    "",
    "=== REGLAS GENERALES ===",
    "- Si hasPropertyMatch: mantene el foco en esa propiedad, no vayas a cero.",
    "- Si el lead ya expreso interes alto: no vuelvas a hacer preguntas de calificacion.",
    "- Si propertyPublicUrl existe y la respuesta gana con un link: incluilo.",
    "- No presiones leads frios: hace UNA pregunta de calificacion y listo.",
    "- Derivá a humano si hay negociacion, temas legales, friccion repetida o pedido explicito.",
    "",
    "=== TEMPERATURA ===",
    "HOT: empujá directo a coordinar visita o siguiente paso.",
    "WARM: respondé con info util y anclá hacia visita.",
    "COLD: aporta valor, una sola pregunta de calificacion.",
    "UNCLEAR: clarificá que busca antes de avanzar.",
    "",
    "=== FORMATO DE RESPUESTA ===",
    "Devolvé SOLO JSON valido con exactamente estos campos:",
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
  ].join("\n");

  const userPayload = {
    // Pre-processed context — read this first
    context: {
      hasPropertyMatch,
      propertyHasImages,
      propertyPublicUrl,
      catalogUrl,
      hasAvailability: context.availability.length > 0,
      availabilitySummary,
      preferredVisitOptions: doubleOptionSummary,
      detectedIntents: Object.entries(intents)
        .filter(([, v]) => v)
        .map(([k]) => k),
    },
    // Raw data
    conversation: context.conversation,
    lead: context.lead,
    property: context.property
      ? {
          id: context.property.id,
          title: context.property.title,
          address: context.property.address,
          city: context.property.city,
          neighborhood: context.property.neighborhood,
          propertyType: context.property.propertyType,
          status: context.property.status,
          priceFormatted: context.property.priceCents != null
            ? formatCurrency(context.property.priceCents, context.property.currency ?? "USD")
            : null,
          publicUrl: context.property.publicUrl,
          imageCount: context.property.imageCount,
        }
      : null,
    propertyMatch: context.propertyMatch,
    recentMessages: context.recentMessages,
  };

  return {
    system,
    user: JSON.stringify(userPayload, null, 2),
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

// ─── Fallback response builders ──────────────────────────────────────────────

function buildPropertyLinkSuffix(property: PreparedConversationContext["property"]): string {
  if (!property?.publicUrl) return "";
  return ` Podés ver la ficha completa acá: ${property.publicUrl}`;
}

function buildPhotoLine(property: PreparedConversationContext["property"]): string {
  if (!property) return "";
  if (property.publicUrl && (property.imageCount ?? 0) > 0) {
    return ` Tiene fotos disponibles: ${property.publicUrl}`;
  }
  if (property.publicUrl) {
    return ` Podés ver más detalles acá: ${property.publicUrl}`;
  }
  return "";
}

function buildCatalogLine(catalogUrl: string | null): string {
  if (!catalogUrl) return "";
  return ` Te paso el catálogo completo: ${catalogUrl}`;
}

// ─── Deterministic fallback ───────────────────────────────────────────────────

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
  const intents = detectLeadIntents(latestBody);
  const catalogUrl = context.catalogUrl ?? null;
  const property = context.property;

  // ── No property match ────────────────────────────────────────────────────
  if (!property) {
    // Lead asks for photos or catalog → share catalog link if available
    if ((intents.pide_fotos || intents.pide_catalogo) && catalogUrl) {
      return enrichDecisionWithContext({
        responseText: `Acá tenés el catálogo de propiedades disponibles: ${catalogUrl} Si me decís zona, presupuesto o cantidad de ambientes, te acerco las mejores opciones.`,
        qualificationDecision: null,
        visitIntent: null,
        ...buildCommercialSignalDefaults(context, {
          leadTemperature: "cold",
          nextBestAction: "compartir-catalogo",
          requiresFollowUp: true,
          followUpReason: "Lead sin propiedad matcheada. Se compartió catálogo para calificar interes.",
        }),
        visitProposal: null,
        internalNotes: `Fallback (${reason}). pide_fotos/pide_catalogo sin match. Catálogo compartido.`,
      }, context);
    }

    // Zone search → offer catalog + ask to narrow
    if (intents.busca_zona && catalogUrl) {
      return enrichDecisionWithContext({
        responseText: `Tenemos propiedades en distintas zonas: ${catalogUrl} ¿Me contás también el presupuesto y si buscás para vivir o invertir?`,
        qualificationDecision: null,
        visitIntent: null,
        ...buildCommercialSignalDefaults(context, {
          leadTemperature: "cold",
          nextBestAction: "compartir-catalogo-y-calificar",
          requiresFollowUp: true,
          followUpReason: "Lead buscó por zona sin match. Se compartió catálogo.",
        }),
        visitProposal: null,
        internalNotes: `Fallback (${reason}). busca_zona sin match. Catálogo compartido.`,
      }, context);
    }

    // Generic clarification
    const clarifyingQ = buildClarifyingQuestion(extractPreferencesFallback(context), context);
    return enrichDecisionWithContext({
      responseText: catalogUrl
        ? `${clarifyingQ} Mientras tanto, podés ver el catálogo disponible: ${catalogUrl}`
        : clarifyingQ,
      qualificationDecision: null,
      visitIntent: visitRequested ? { requested: true } : null,
      ...buildCommercialSignalDefaults(context, {
        leadTemperature: "unclear",
        nextBestAction: catalogUrl ? "compartir-catalogo-y-calificar" : "clarificar-propiedad-objetivo",
        requiresFollowUp: false,
      }),
      visitProposal: null,
      internalNotes: `Fallback (${reason}). Sin propiedad matcheada.`,
    }, context);
  }

  // ── Has property match ───────────────────────────────────────────────────

  // Lead asks for photos → share link if available
  if (intents.pide_fotos) {
    if (property.publicUrl && (property.imageCount ?? 0) > 0) {
      return enrichDecisionWithContext({
        responseText: `Acá las fotos de ${property.title}: ${property.publicUrl} ¿Querés coordinar una visita para verla en persona?`,
        qualificationDecision: null,
        visitIntent: null,
        ...buildCommercialSignalDefaults(context, {
          leadTemperature: "warm",
          nextBestAction: "compartir-fotos-y-proponer-visita",
          requiresFollowUp: false,
        }),
        visitProposal: null,
        internalNotes: `Fallback (${reason}). pide_fotos con match y imágenes. Link compartido.`,
      }, context);
    }
    if (property.publicUrl) {
      return enrichDecisionWithContext({
        responseText: `Podés ver los detalles de ${property.title} acá: ${property.publicUrl} Las fotos se están cargando. ¿Te gustaría coordinar una visita presencial?`,
        qualificationDecision: null,
        visitIntent: null,
        ...buildCommercialSignalDefaults(context, {
          leadTemperature: "warm",
          nextBestAction: "compartir-ficha-y-proponer-visita",
          requiresFollowUp: false,
        }),
        visitProposal: null,
        internalNotes: `Fallback (${reason}). pide_fotos con match sin imágenes pero con URL.`,
      }, context);
    }
    // No public URL at all
    return enrichDecisionWithContext({
      responseText: `Para ${property.title} te recomiendo coordinar una visita presencial para que puedas ver la propiedad en detalle. ¿Qué día te queda mejor?`,
      qualificationDecision: null,
      visitIntent: { requested: true },
      ...buildCommercialSignalDefaults(context, {
        leadTemperature: "warm",
        nextBestAction: "proponer-visita-sin-fotos",
        requiresFollowUp: true,
        followUpReason: "Lead pidió fotos pero la propiedad no tiene URL pública.",
      }),
      visitProposal: null,
      internalNotes: `Fallback (${reason}). pide_fotos sin URL pública.`,
    }, context);
  }

  // Lead asks for visit
  if (visitRequested) {
    if (availabilitySummary) {
      const linkSuffix = buildPropertyLinkSuffix(property);
      return enrichDecisionWithContext({
        responseText: `¡Perfecto! Podemos coordinar la visita a ${property.title}.${linkSuffix} Tengo disponibilidad ${doubleOptionSummary ?? availabilitySummary}. ¿Te sirve alguna?`,
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
        internalNotes: `Fallback (${reason}). quiere_visita con disponibilidad.`,
      }, context);
    }

    return enrichDecisionWithContext({
      responseText: `Me alegra tu interés en ${property.title}. ¿Qué día y horario te quedan mejor para coordinar la visita?`,
      qualificationDecision: "QUALIFIED",
      visitIntent: { requested: true },
      ...buildCommercialSignalDefaults(context, {
        leadTemperature: "warm",
        nextBestAction: "pedir-horario-preferido",
        requiresFollowUp: true,
        followUpReason: "Sin disponibilidad activa para cerrar la visita.",
      }),
      visitProposal: {
        proposed: false,
        slotSummary: "Sin disponibilidad activa confirmada.",
        scheduledAt: null,
      },
      internalNotes: `Fallback (${reason}). quiere_visita sin disponibilidad.`,
    }, context);
  }

  // Lead is new — qualify
  if (context.lead.status === "NEW") {
    const linkSuffix = buildPropertyLinkSuffix(property);
    return enrichDecisionWithContext({
      responseText: `Gracias por tu interés en ${property.title}.${linkSuffix} ¿Estás buscando para vivir o como inversión?`,
      qualificationDecision: null,
      visitIntent: null,
      ...buildCommercialSignalDefaults(context, {
        leadTemperature: "cold",
        nextBestAction: "calificar-necesidad",
        requiresFollowUp: true,
        followUpReason: "Lead nuevo, faltan datos comerciales básicos.",
      }),
      visitProposal: null,
      internalNotes: `Fallback (${reason}). Lead nuevo con propiedad matcheada.`,
    }, context);
  }

  // Default: warm follow-up with property link
  const linkSuffix = buildPropertyLinkSuffix(property);
  return enrichDecisionWithContext({
    responseText: `Seguimos con ${property.title}.${linkSuffix} ¿Querés que coordine una visita o necesitás más información?`,
    qualificationDecision: null,
    visitIntent: null,
    ...buildCommercialSignalDefaults(context, {
      leadTemperature: "warm",
      nextBestAction: "llevar-a-visita-o-calificar",
      requiresFollowUp: false,
    }),
    visitProposal: null,
    internalNotes: `Fallback (${reason}). Seguimiento con contexto de propiedad.`,
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
