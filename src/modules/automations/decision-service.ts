import OpenAI from "openai";
import { z } from "zod";

import type { AutomationDecision, PreparedConversationContext } from "@/modules/automations/types";

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
});

type AiDecisionPayload = z.infer<typeof aiDecisionSchema>;

const AI_REQUEST_TIMEOUT_MS = 15_000;

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

  return {
    system: [
      "Sos un asesor inmobiliario de Argentina para un SaaS de real estate.",
      "Responde siempre en espanol de Argentina.",
      "No inventes datos ni supongas propiedades, precios, horarios o estados que no aparezcan en el contexto.",
      "Si falta contexto de propiedad, pedi aclaracion de forma breve y profesional.",
      "Si propones una visita, usa solamente horarios disponibles del contexto.",
      "Debes devolver SOLO JSON valido con esta forma exacta:",
      '{',
      '  "message": string,',
      '  "intent": string,',
      '  "shouldScheduleVisit": boolean,',
      '  "proposedVisitDate": string | null,',
      '  "needsHumanHandoff": boolean,',
      '  "confidence": number',
      '}',
    ].join("\n"),
    user: JSON.stringify(
      {
        conversation: context.conversation,
        lead: context.lead,
        property: context.property,
        availability: context.availability,
        availabilitySummary,
        recentMessages: context.recentMessages,
      },
      null,
      2,
    ),
  };
}

function mapAiDecisionToAutomationDecision(
  payload: AiDecisionPayload,
  context: PreparedConversationContext,
): AutomationDecision {
  const normalizedIntent = payload.intent.trim().toLowerCase();
  const hasConcreteVisitDate =
    typeof payload.proposedVisitDate === "string" &&
    !Number.isNaN(new Date(payload.proposedVisitDate).getTime());

  const qualificationDecision =
    normalizedIntent.includes("disqual") || normalizedIntent.includes("descart")
      ? "DISQUALIFIED"
      : payload.shouldScheduleVisit || normalizedIntent.includes("qualif")
        ? "QUALIFIED"
        : null;

  return {
    responseText: payload.message.trim(),
    qualificationDecision,
    visitIntent: payload.shouldScheduleVisit ? { requested: true } : null,
    visitProposal: payload.shouldScheduleVisit
      ? {
          proposed: hasConcreteVisitDate,
          slotSummary: getAvailabilitySummary(context) ?? undefined,
          scheduledAt: hasConcreteVisitDate ? payload.proposedVisitDate : null,
        }
      : null,
    internalNotes: [
      `AI intent: ${payload.intent}`,
      `AI confidence: ${payload.confidence}`,
      payload.needsHumanHandoff ? "AI marked this conversation for human handoff." : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function buildDeterministicFallback(
  context: PreparedConversationContext,
  reason: string,
): AutomationDecision {
  const latestInbound = getLatestInboundMessage(context);
  const latestBody = latestInbound?.body.trim() ?? "";
  const visitRequested = latestBody ? hasVisitIntentFallback(latestBody) : false;
  const availabilitySummary = getAvailabilitySummary(context);
  const concreteScheduledAt = getConcreteScheduledAt(context);

  if (!context.property) {
    return {
      responseText:
        "Gracias por escribirnos. ¿Me contás qué propiedad te interesa así te ayudo más rápido?",
      qualificationDecision: null,
      visitIntent: visitRequested ? { requested: true } : null,
      visitProposal: null,
      internalNotes: `Fallback activado (${reason}). Falta contexto de propiedad.`,
    };
  }

  if (visitRequested) {
    if (availabilitySummary) {
      return {
        responseText: `Gracias por tu interes en ${context.property.title}. Tenemos disponibilidad para coordinar una visita en estos horarios: ${availabilitySummary}. ¿Te sirve alguna de esas opciones?`,
        qualificationDecision: "QUALIFIED",
        visitIntent: { requested: true },
        visitProposal: {
          proposed: Boolean(concreteScheduledAt),
          slotSummary: availabilitySummary,
          scheduledAt: concreteScheduledAt,
        },
        internalNotes: `Fallback activado (${reason}). Se detecto intencion de visita con disponibilidad.`,
      };
    }

    return {
      responseText: `Gracias por tu interes en ${context.property.title}. Podemos coordinar una visita, pero todavía estamos confirmando disponibilidad. ¿Qué día y horario te quedan mejor?`,
      qualificationDecision: "QUALIFIED",
      visitIntent: { requested: true },
      visitProposal: {
        proposed: false,
        slotSummary: "Sin disponibilidad activa confirmada.",
        scheduledAt: null,
      },
      internalNotes: `Fallback activado (${reason}). Se detecto intencion de visita sin disponibilidad activa.`,
    };
  }

  if (context.lead.status === "NEW") {
    return {
      responseText: `Gracias por tu interes en ${context.property.title}. Para orientarte mejor, ¿estás buscando mudarte pronto o por ahora estás explorando opciones?`,
      qualificationDecision: null,
      visitIntent: null,
      visitProposal: null,
      internalNotes: `Fallback activado (${reason}). Lead nuevo, se envia pregunta inicial de calificacion.`,
    };
  }

  return {
    responseText: `Gracias por tu mensaje sobre ${context.property.title}. Ya tenemos tus datos cargados. Si querés, contame qué horario te conviene o qué duda puntual tenés sobre la propiedad.`,
    qualificationDecision: null,
    visitIntent: null,
    visitProposal: null,
    internalNotes: `Fallback activado (${reason}). Seguimiento seguro con contexto de propiedad existente.`,
  };
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
      "[automation-decision] Falling back to deterministic decision service",
      error instanceof Error ? error.message : error,
    );

    return buildDeterministicFallback(
      context,
      error instanceof Error ? error.message : "llm-request-failed",
    );
  }
}
