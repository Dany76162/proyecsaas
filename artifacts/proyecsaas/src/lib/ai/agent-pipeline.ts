import { prisma } from "@/server/db/prisma";
import { ACTIVATION_EVENTS, trackActivationEventOnce } from "@/server/activation/events";
import { getOpenAIClient, AI_MODEL } from "./openai";
import type { AiAgentTone } from "@prisma/client";

const TONE_DESCRIPTION: Record<AiAgentTone, string> = {
  FORMAL: "formal y profesional, usando usted y lenguaje de negocios",
  FRIENDLY: "amigable y cercano, usando vos y un tono cálido",
  NEUTRAL: "neutral y conciso, sin excesos de formalidad ni informalidad",
};

const LEARNING_TYPE_LABELS: Record<string, string> = {
  CORRECCION_HUMANA: "Corrección",
  PATRON_DE_EXITO: "Patrón exitoso",
  OBJECION_FRECUENTE: "Objeción frecuente",
  PREFERENCIA_COMERCIAL: "Preferencia",
  REGLA_OPERATIVA: "Regla",
};

function buildLearningsBlock(
  learnings: Array<{ type: string; title: string; content: string }> | null | undefined,
): string {
  if (!learnings || learnings.length === 0) return "";

  const lines = learnings.map((l, i) => {
    const label = LEARNING_TYPE_LABELS[l.type] ?? l.type;
    return `${i + 1}. [${label}] ${l.title}: ${l.content}`;
  });

  return [
    "",
    "APRENDIZAJES DEL EQUIPO (instrucciones basadas en experiencia real — seguí estas reglas con prioridad alta):",
    ...lines,
    "",
  ].join("\n");
}

const SYSTEM_PROMPT_TEMPLATE = (params: {
  orgName: string;
  agentName: string;
  tone: AiAgentTone;
  persona: string | null;
  language: string;
  properties: Array<{
    id: string;
    title: string;
    address: string | null;
    neighborhood: string | null;
    city: string | null;
    propertyType: string | null;
    operationType: string | null;
    priceCents: number | null;
    currency: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    surfaceM2: number | null;
    description: string | null;
  }>;
  escalateOnKeywords: string[];
  humanHandoffMessage: string | null;
  learnings?: Array<{ type: string; title: string; content: string }> | null;
}) => {
  const { orgName, agentName, tone, persona, language, properties, escalateOnKeywords, humanHandoffMessage } = params;

  const propsText =
    properties.length === 0
      ? "No hay propiedades disponibles en este momento."
      : properties
          .map((p) => {
            const price = p.priceCents
              ? `${p.currency ?? "USD"} ${(p.priceCents / 100).toLocaleString("es-AR")}`
              : "Consultar precio";
            const details = [
              p.propertyType,
              p.operationType,
              p.bedrooms ? `${p.bedrooms} dorm.` : null,
              p.bathrooms ? `${p.bathrooms} baños` : null,
              p.surfaceM2 ? `${p.surfaceM2}mÂ²` : null,
            ]
              .filter(Boolean)
              .join(" | ");
            const location = [p.neighborhood, p.city].filter(Boolean).join(", ");
            return `- [ID:${p.id}] ${p.title} â€” ${location} â€” ${price} â€” ${details}${p.description ? `\n  Descripción: ${p.description}` : ""}`;
          })
          .join("\n");

  const escalationText =
    escalateOnKeywords.length > 0
      ? `Si el cliente menciona alguna de estas palabras o frases, DEBÉS escalar: ${escalateOnKeywords.join(", ")}.`
      : "";

  return `Sos el asistente de IA de ${orgName}, una agencia inmobiliaria. Tu nombre es ${agentName}.

Idioma: ${language}
Estilo de comunicación: Hablá de manera ${TONE_DESCRIPTION[tone]}.
${persona ? `\nPersonalidad adicional:\n${persona}` : ""}

PROPIEDADES DISPONIBLES PARA OFRECER:
${propsText}

CONTEXTO DEL MERCADO INMOBILIARIO:
Operás en el mercado inmobiliario argentino. Manejá con naturalidad la terminología local: departamento, PH, monoambiente, cochera, expensas, baulera, amenities, escritura, boleto, seña, reserva, crédito UVA, tasación, comisión, matrícula. Si el cliente pregunta por financiación, créditos UVA o temas legales (escritura, boleto, posesión), respondé que lo mejor es coordinar con un asesor del equipo para ese tema puntual. Adaptá tu lenguaje al tipo de propiedad: para departamentos hablá de ambientes, piso, orientación y expensas; para terrenos/lotes hablá de superficie, frente, fondo, servicios disponibles y posibilidad de escriturar.
${buildLearningsBlock(params.learnings)}
INSTRUCCIONES CRÍTICAS:
1. Solo ofrecé propiedades de la lista de arriba. NUNCA inventes propiedades.
2. Si el cliente muestra interés concreto en una propiedad, incluí exactamente este marcador en tu respuesta: [LEAD_INTERESTED]
3. Si querés proponer una visita a una propiedad, incluí: [PROPOSE_VISIT: YYYY-MM-DD HH:MM | PROPERTY_ID:xxx]
   - Usá una fecha y hora razonable (próximos 7 días, horario laboral 9-19h).
   - Si no sabés exactamente cuándo, proponé opciones y esperá confirmación antes de usar el marcador.
4. Si el cliente pide hablar con una persona, o si la conversación está fuera de tu capacidad, incluí: [ESCALATE: motivo]
${escalationText}
5. Si el cliente te da su nombre, incluí: [LEAD_NAME: nombre completo]
6. Respondé de forma concisa (máximo 3 párrafos cortos). No uses markdown en tus respuestas, solo texto plano.
7. Tu objetivo es calificar el lead y agendar una visita cuando sea el momento adecuado.

${humanHandoffMessage ? `Mensaje para cuando escales: "${humanHandoffMessage}"` : ""}

Hoy es ${new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
};

export interface PipelineInput {
  agentId: string;
  organizationId: string;
  contactName?: string;
  contactPhone: string;
  messageText: string;
  conversationId?: string;
}

export interface PipelineResult {
  response: string;
  conversationId: string;
  leadId: string;
  actions: {
    leadInterested: boolean;
    visitCreated: boolean;
    visitScheduledAt?: Date;
    escalated: boolean;
    escalationReason?: string;
    leadNameUpdated?: string;
    visitPropertyId?: string;
  };
}

function parseMarkers(text: string) {
  const leadInterested = text.includes("[LEAD_INTERESTED]");
  const escalateMatch = text.match(/\[ESCALATE:\s*([^\]]+)\]/);
  const visitMatch = text.match(/\[PROPOSE_VISIT:\s*([^|]+)\|\s*PROPERTY_ID:([^\]]+)\]/);
  const nameMatch = text.match(/\[LEAD_NAME:\s*([^\]]+)\]/);

  return {
    leadInterested,
    escalated: !!escalateMatch,
    escalationReason: escalateMatch?.[1]?.trim(),
    visitDateStr: visitMatch?.[1]?.trim(),
    visitPropertyId: visitMatch?.[2]?.trim(),
    leadName: nameMatch?.[1]?.trim(),
  };
}

function cleanResponse(text: string): string {
  return text
    .replace(/\[LEAD_INTERESTED\]/g, "")
    .replace(/\[ESCALATE:[^\]]*\]/g, "")
    .replace(/\[PROPOSE_VISIT:[^\]]*\]/g, "")
    .replace(/\[LEAD_NAME:[^\]]*\]/g, "")
    .trim();
}

export async function runAgentPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { agentId, organizationId, contactPhone, messageText, conversationId } = input;
  let contactName = input.contactName ?? contactPhone;

  const agent = await prisma.aiAgent.findFirst({
    where: { id: agentId, organizationId },
    include: { organization: true },
  });

  if (!agent) throw new Error("Agent not found");

  const [properties, agentLearnings] = await Promise.all([
    prisma.property.findMany({
      where: {
        organizationId,
        status: "AVAILABLE",
        publicVisible: true,
        ...(agent.zoneFilters.length > 0
          ? {
              OR: agent.zoneFilters.map((z) => ({
                neighborhood: { contains: z, mode: "insensitive" as const },
              })),
            }
          : {}),
        ...(agent.propertyTypes.length > 0
          ? { propertyType: { in: agent.propertyTypes } }
          : {}),
        ...(agent.minBudget != null ? { priceCents: { gte: agent.minBudget } } : {}),
        ...(agent.maxBudget != null ? { priceCents: { lte: agent.maxBudget } } : {}),
      },
      select: {
        id: true,
        title: true,
        address: true,
        neighborhood: true,
        city: true,
        propertyType: true,
        operationType: true,
        priceCents: true,
        currency: true,
        bedrooms: true,
        bathrooms: true,
        surfaceM2: true,
        description: true,
      },
      take: 10,
    }),
    prisma.agentLearning.findMany({
      where: { organizationId, isActive: true },
      select: { type: true, title: true, content: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 10,
    }).catch(() => []),
  ]);

  let createdFirstLead = false;

  let lead = await prisma.lead.findFirst({
    where: { organizationId, phone: contactPhone },
  });

  if (!lead) {
    const leadCountBefore = await prisma.lead.count({
      where: {
        organizationId,
      },
    });

    lead = await prisma.lead.create({
      data: {
        organizationId,
        fullName: contactName,
        phone: contactPhone,
        source: "whatsapp",
        status: "NEW",
      },
    });

    createdFirstLead = leadCountBefore === 0;
  }

  if (createdFirstLead) {
    await trackActivationEventOnce(prisma, {
      event: ACTIVATION_EVENTS.firstLeadCreated,
      organizationId,
      metadata: {
        source: "legacy_pipeline",
        leadId: lead.id,
      },
    });
  }

  let conversation = conversationId
    ? await prisma.conversation.findFirst({
        where: { id: conversationId, organizationId },
        include: {
          messages: {
            orderBy: { sentAt: "asc" },
            take: 20,
          },
        },
      })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        organizationId,
        leadId: lead.id,
        channel: `agent:${agent.id}`,
        status: "OPEN",
        lastMessageAt: new Date(),
      },
      include: { messages: true },
    });
  }

  await prisma.message.create({
    data: {
      organizationId,
      conversationId: conversation.id,
      direction: "INBOUND",
      deliveryStatus: "RECEIVED",
      body: messageText,
      senderName: contactName,
      senderPhone: contactPhone,
      sentAt: new Date(),
    },
  });

  const allMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id, organizationId },
    orderBy: { sentAt: "asc" },
    take: 20,
  });

  const chatMessages: Array<{ role: "user" | "assistant"; content: string }> =
    allMessages.map((m) => ({
      role: m.direction === "INBOUND" ? "user" : "assistant",
      content: m.body,
    }));

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE({
    orgName: agent.organization.name,
    agentName: agent.name,
    tone: agent.tone,
    persona: agent.persona,
    language: agent.language,
    properties,
    escalateOnKeywords: agent.escalateOnKeywords,
    humanHandoffMessage: agent.humanHandoffMessage,
    learnings: agentLearnings.length > 0 ? agentLearnings : null,
  });

  const completion = await getOpenAIClient().chat.completions.create({
    model: AI_MODEL,
    max_completion_tokens: 512,
    messages: [
      { role: "system", content: systemPrompt },
      ...chatMessages,
    ],
  });

  const rawResponse = completion.choices[0]?.message?.content ?? "Lo siento, no pude procesar tu mensaje.";
  const markers = parseMarkers(rawResponse);
  const cleanedResponse = cleanResponse(rawResponse);

  const actions: PipelineResult["actions"] = {
    leadInterested: markers.leadInterested,
    visitCreated: false,
    escalated: markers.escalated,
    escalationReason: markers.escalationReason,
  };

  const dbUpdates: Array<Promise<unknown>> = [];

  if (markers.leadName && markers.leadName !== contactName) {
    contactName = markers.leadName;
    actions.leadNameUpdated = markers.leadName;
    dbUpdates.push(
      prisma.lead.update({ where: { id: lead.id }, data: { fullName: markers.leadName } })
    );
  }

  if (markers.leadInterested && lead.status === "NEW") {
    dbUpdates.push(
      prisma.lead.update({ where: { id: lead.id }, data: { status: "INTERESTED" } })
    );
  }

  if (markers.escalated) {
    dbUpdates.push(
      prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          isHumanControlled: true,
          nextBestAction: `Escalar: ${markers.escalationReason ?? "El cliente solicitó atención humana"}`,
        },
      })
    );
  }

  if (markers.visitDateStr && markers.visitPropertyId) {
    const visitDate = new Date(markers.visitDateStr);
    if (!isNaN(visitDate.getTime()) && markers.visitPropertyId) {
      const orgOwner = await prisma.membership.findFirst({
        where: { organizationId, role: "OWNER" },
        select: { userId: true },
      });

      if (orgOwner) {
        const property = await prisma.property.findFirst({
          where: { id: markers.visitPropertyId, organizationId },
          select: { id: true },
        });

        if (property) {
          await prisma.visit.create({
            data: {
              organizationId,
              propertyId: property.id,
              leadId: lead.id,
              createdById: orgOwner.userId,
              scheduledAt: visitDate,
              status: "PENDING",
              notes: `Visita agendada automáticamente por el agente IA "${agent.name}" vía WhatsApp.`,
            },
          });
          actions.visitCreated = true;
          actions.visitScheduledAt = visitDate;
          actions.visitPropertyId = property.id;

          dbUpdates.push(
            prisma.lead.update({ where: { id: lead.id }, data: { status: "VISIT" } })
          );
        }
      }
    }
  }

  dbUpdates.push(
    prisma.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        direction: "OUTBOUND",
        deliveryStatus: "SENT",
        body: cleanedResponse,
        senderName: agent.name,
        sentAt: new Date(),
      },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    })
  );

  await Promise.all(dbUpdates);

  return {
    response: cleanedResponse,
    conversationId: conversation.id,
    leadId: lead.id,
    actions,
  };
}
