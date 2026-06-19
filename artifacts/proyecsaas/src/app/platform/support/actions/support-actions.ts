"use server";

import { prisma } from "@/server/db/prisma";
import { requirePlatformAdmin } from "@/server/auth/access";
import { MessageDirection, MessageDeliveryStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { updateGlobalSetting, getGlobalSettings } from "@/app/platform/settings/actions/settings-actions";
import { resolveActiveChannelByOrgId } from "@/server/whatsapp/channel-resolver";
import { attemptWhatsAppOutboundDelivery } from "@/modules/automations/delivery-service";
import { getOpenAIClient } from "@/modules/agents/service";
import { getManualContextForAI } from "@/modules/manuals/content";

/**
 * Fetches all support conversations (those routed to the platform org).
 */
export async function getSupportConversations() {
  await requirePlatformAdmin();

  const settings = await getGlobalSettings();
  const platformOrgId = process.env.WHATSAPP_ORGANIZATION_ID;

  if (!platformOrgId) {
    return [];
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      organizationId: platformOrgId,
    },
    orderBy: {
      lastMessageAt: "desc",
    },
    include: {
      messages: {
        orderBy: {
          sentAt: "desc",
        },
        take: 1,
      },
    },
  });

  return conversations.map(c => ({
    id: c.id,
    participantName: c.participantName || "Visitante",
    participantPhone: c.participantPhone,
    lastMessage: c.messages[0]?.body || "",
    lastMessageAt: c.lastMessageAt?.toISOString() || new Date().toISOString(),
    status: c.status,
  }));
}

/**
 * Fetches full message history for a support conversation.
 */
export async function getSupportMessages(conversationId: string) {
  await requirePlatformAdmin();

  return await prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      sentAt: "asc",
    },
    select: {
      id: true,
      direction: true,
      body: true,
      sentAt: true,
      senderName: true,
    },
  });
}

/**
 * Sends a manual support response from the Superadmin.
 */
export async function sendSupportResponse(conversationId: string, text: string) {
  const sessionUser = await requirePlatformAdmin();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { organizationId: true, participantPhone: true },
  });

  if (!conversation) throw new Error("Conversation not found");
  if (!conversation.participantPhone) throw new Error("Conversation has no participant phone");

  // Persist the outbound message first so it appears in the UI immediately.
  const newMessage = await prisma.message.create({
    data: {
      organizationId: conversation.organizationId,
      conversationId,
      direction: MessageDirection.OUTBOUND,
      body: text,
      senderName: sessionUser.fullName,
      sentAt: new Date(),
      deliveryStatus: MessageDeliveryStatus.PENDING,
    },
  });

  // Attempt WhatsApp delivery via the active channel for this org.
  const channel = await resolveActiveChannelByOrgId(prisma, conversation.organizationId);

  if (channel) {
    const deliveryResult = await attemptWhatsAppOutboundDelivery(prisma, {
      organizationId: conversation.organizationId,
      conversationId,
      outboundMessageId: newMessage.id,
      responseText: text,
      recipientPhone: conversation.participantPhone,
      senderKind: "human",
      channel: {
        provider: channel.provider,
        phoneNumberId: channel.phoneNumberId,
        instanceName: channel.instanceName,
        accessToken: channel.accessToken,
      },
    });

    await prisma.message.update({
      where: { id: newMessage.id },
      data: {
        deliveryStatus:
          deliveryResult.deliveryStatus === "delivered"
            ? MessageDeliveryStatus.SENT
            : deliveryResult.deliveryStatus === "skipped"
              ? MessageDeliveryStatus.SKIPPED
              : MessageDeliveryStatus.FAILED,
        providerMessageId: deliveryResult.providerMessageId ?? null,
        deliveryError: deliveryResult.deliveryStatus !== "delivered" ? deliveryResult.reason : null,
        deliveryAttemptedAt: deliveryResult.attemptedAt ? new Date(deliveryResult.attemptedAt) : new Date(),
      },
    });
  } else {
    // No active WA channel — mark as SKIPPED so the operator knows delivery was not attempted.
    await prisma.message.update({
      where: { id: newMessage.id },
      data: {
        deliveryStatus: MessageDeliveryStatus.SKIPPED,
        deliveryError: "no-active-channel",
        deliveryAttemptedAt: new Date(),
      },
    });
  }

  revalidatePath("/platform/support");
  return { success: true };
}

type SupportIntent =
  | "SALUDO_SIMPLE"
  | "AYUDA_AMBIGUA"
  | "SOPORTE_ACCESO"
  | "SOPORTE_ERROR_PLATAFORMA"
  | "SOPORTE_WHATSAPP"
  | "SOPORTE_PANEL"
  | "SOPORTE_PROPIEDADES_EN_PANEL"
  | "SOPORTE_DESARROLLOS_EN_PANEL"
  | "SOPORTE_RESERVAS"
  | "DEMO_ACCESO_B2B"
  | "COMPRADOR_FINAL_INMOBILIARIO"
  | "OTRO_RUBRO_AJENO"
  | "SPAM_IRRELEVANTE"
  | "ESCALAR_HUMANO";

function getTemplateForIntent(intent: SupportIntent): string | null {
  switch (intent) {
    case "SALUDO_SIMPLE":
      return "Hola, gracias por escribir a Raíces Pilot. ¿Con qué podemos ayudarte?";
    case "AYUDA_AMBIGUA":
      return "Claro, contame qué necesitás hacer o qué inconveniente estás teniendo en la plataforma, así podemos orientarte.";
    case "COMPRADOR_FINAL_INMOBILIARIO":
      return "Hola, gracias por escribir. Este canal corresponde al soporte de Raíces Pilot, una plataforma para inmobiliarias y desarrolladoras. Desde este canal no brindamos asesoramiento para la compra, alquiler o búsqueda directa de propiedades. Te sugerimos contactar a la inmobiliaria o desarrolladora correspondiente por sus canales comerciales. Saludos.";
    case "OTRO_RUBRO_AJENO":
      return "Hola, gracias por escribir. Este canal corresponde actualmente a Raíces Pilot, una plataforma tecnológica para inmobiliarias y desarrolladoras. No tenemos relación con el comercio o persona que quizás estabas buscando. Te sugerimos verificar el contacto actualizado. Saludos.";
    case "SPAM_IRRELEVANTE":
      return "Hola, este canal corresponde al soporte de Raíces Pilot. Si necesitás asistencia sobre la plataforma, podés escribirnos con más detalle para poder orientarte.";
    case "DEMO_ACCESO_B2B":
      return "Hola, gracias por escribir. Podemos ayudarte con la solicitud de demo de Raíces Pilot. Por favor indicanos tu nombre, empresa o rubro y un WhatsApp de contacto para que el equipo pueda coordinar los próximos pasos.";
    default:
      return null;
  }
}

async function classifySupportIntent(messages: { role: "user" | "assistant", content: string }[]): Promise<{ intent: SupportIntent, confidence: "high" | "medium" | "low", reason: string }> {
  const openai = getOpenAIClient();

  const prompt = `Analiza el siguiente historial de chat y clasifica la intención principal del último mensaje del usuario en una de las siguientes categorías exactas:
- SALUDO_SIMPLE (ej: "Hola", "Buenas")
- AYUDA_AMBIGUA (ej: "Necesito ayuda", "Tengo un problema")
- SOPORTE_ACCESO (ej: "No puedo entrar", "Perdí mi clave")
- SOPORTE_ERROR_PLATAFORMA (ej: "Error 500", "No carga la página")
- SOPORTE_WHATSAPP (ej: "No conecta WhatsApp")
- SOPORTE_PANEL (ej: "Duda sobre cómo usar el CRM")
- SOPORTE_PROPIEDADES_EN_PANEL (ej: "Mis propiedades no se ven")
- SOPORTE_DESARROLLOS_EN_PANEL (ej: "No puedo cargar un desarrollo")
- SOPORTE_RESERVAS (ej: "Problema con una reserva")
- DEMO_ACCESO_B2B (ej: "Quiero probar", "Quiero una demo")
- COMPRADOR_FINAL_INMOBILIARIO (ej: "Busco casa", "Precio del lote X")
- OTRO_RUBRO_AJENO (ej: "Kg de papa", "Comida", "Ropa")
- SPAM_IRRELEVANTE
- ESCALAR_HUMANO

Debes responder ÚNICAMENTE con un objeto JSON válido con las claves "intent", "confidence" (high, medium, low) y "reason".`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un clasificador de intención estructurado." },
        ...messages,
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 150,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    const validIntents = ["SALUDO_SIMPLE", "AYUDA_AMBIGUA", "SOPORTE_ACCESO", "SOPORTE_ERROR_PLATAFORMA", "SOPORTE_WHATSAPP", "SOPORTE_PANEL", "SOPORTE_PROPIEDADES_EN_PANEL", "SOPORTE_DESARROLLOS_EN_PANEL", "SOPORTE_RESERVAS", "DEMO_ACCESO_B2B", "COMPRADOR_FINAL_INMOBILIARIO", "OTRO_RUBRO_AJENO", "SPAM_IRRELEVANTE", "ESCALAR_HUMANO"];

    if (validIntents.includes(parsed.intent)) {
      return {
        intent: parsed.intent as SupportIntent,
        confidence: parsed.confidence || "low",
        reason: parsed.reason || "Sin razón"
      };
    }

    throw new Error("Invalid intent returned");
  } catch (error) {
    console.error("[classifySupportIntent] Error parsing intent:", error);
    return { intent: "AYUDA_AMBIGUA", confidence: "low", reason: "Fallback por error de clasificación" };
  }
}

/**
 * Genera un borrador de respuesta sugerido con IA usando el historial del chat
 * e infiriendo el tipo de usuario y el manual operativo compartible.
 */
export async function generateSupportDraft(conversationId: string) {
  await requirePlatformAdmin();

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return { success: false, error: "Conversación no encontrada" };
    }

    // 1. Obtener mensajes recientes
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: "asc" },
      take: 20,
    });

    const chatMessages = messages.map(m => ({
      role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
      content: m.body
    }));

    // 2. Clasificar la intención del usuario
    const classification = await classifySupportIntent(chatMessages);
    const template = getTemplateForIntent(classification.intent);

    // 3. Si hay plantilla directa, se devuelve inmediatamente
    if (template) {
      return { success: true, draft: template };
    }

    // 4. Si no hay plantilla, es soporte real. Inferir usuario y cargar manual.
    let inferredUserType = "usuario externo / lead";
    let orgName = "Soporte Técnico General";
    let extraContext = "";

    if (conversation.participantPhone) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: conversation.participantPhone },
            { whatsapp: conversation.participantPhone }
          ]
        },
        include: {
          memberships: {
            include: {
              organization: {
                include: {
                  subscription: true
                }
              }
            }
          }
        }
      });

      if (user) {
        if (user.isPlatformAdmin) {
          inferredUserType = "Superadmin de la Plataforma";
          extraContext = `El usuario es un Superadmin del sistema. Nombre completo: ${user.fullName}. Email: ${user.email}.`;
        } else if (user.memberships.length > 0) {
          const mainMembership = user.memberships[0];
          const isDemo = mainMembership.organization.subscription?.status === "TRIALING";
          inferredUserType = isDemo ? "Usuario Demo (Inmobiliaria en Prueba)" : "Admin Inmobiliario (Inmobiliaria Cliente)";
          orgName = mainMembership.organization.name;
          extraContext = `El usuario pertenece a la inmobiliaria "${orgName}". Plan asignado: ${mainMembership.organization.planLabel ?? "Ninguno"}. Rol en la inmobiliaria: ${mainMembership.role}.`;
        }
      }
    }

    const manualContext = getManualContextForAI();

    const prompt = `Actúas como el Agente de Soporte Técnico IA de RaicesPilot.
Tu tarea es redactar una propuesta de respuesta (borrador sugerido) a la consulta del usuario.
La intención detectada del último mensaje es: ${classification.intent} (${classification.reason}).
Deberás brindar soporte técnico de plataforma B2B usando la información del manual.

REGLAS DE TONO:
- Español castellano profesional, claro y neutral para LATAM. Evitar localismos excesivos. El tono debe ser humano, serio, útil y comercialmente confiable.
- No uses regionalismos marcados ni voseo extremo (ej: "vos sabés"), prefiere el tuteo neutro o un trato formal respetuoso ("tú sabes", "usted sabe" según corresponda).
- Eres soporte de plataforma B2B, no eres inmobiliaria, no eres tienda, no eres asesor de compradores finales, no eres vendedor de propiedades.

INFORMACIÓN DEL INTERLOCUTOR:
- Tipo de usuario inferido: ${inferredUserType}
- Organización asociada: ${orgName}
${extraContext ? `- Detalles contextuales: ${extraContext}` : ""}

REGLAS CRÍTICAS DE SEGURIDAD Y PRIVACIDAD:
1. No reveles jamás secretos del sistema, contraseñas, tokens de API, de OpenAI o Meta, URLs privadas de bases de datos, claves de encriptación o variables de entorno.
2. Si el usuario te pregunta sobre datos de otros clientes u otras inmobiliarias, responde de manera educada que por razones de privacidad y confidencialidad no tienes acceso a información de terceros.
3. No hagas compromisos comerciales específicos, descuentos ni cambios de planes sin la debida confirmación del equipo directivo.
4. Si la consulta supera las capacidades técnicas o requiere intervención manual profunda, propone derivar con un operador experto de soporte.

Aquí tienes la guía de referencia del sistema para basar tus respuestas técnicas:
${manualContext}

Por favor, analiza el historial de la conversación a continuación y genera únicamente el texto propuesto de respuesta para que el operador humano lo revise. No agregues etiquetas, prefacios, ni explicaciones adicionales, solo el texto final de respuesta sugerida.`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres el Agente de Soporte Técnico IA de RaicesPilot. Generas borradores de respuesta útiles y concisos basados en la documentación técnica." },
        ...chatMessages,
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const draft = completion.choices[0]?.message?.content?.trim() || "";

    if (!draft) {
      return { success: true, draft: getTemplateForIntent("AYUDA_AMBIGUA") };
    }

    return { success: true, draft };
  } catch (error: any) {
    console.error("[generateSupportDraft] Error:", error);
    return {
      success: false,
      error: "No se pudo generar la sugerencia con IA por un error de cuota o límite del motor. El chat manual sigue disponible."
    };
  }
}
