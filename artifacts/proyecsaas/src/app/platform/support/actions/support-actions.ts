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

    // 2. Inferir tipo de usuario
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

    // 3. Obtener el manual
    const manualContext = getManualContextForAI();

    // 4. Construir el prompt de soporte técnico
    const prompt = `Actúas como el Agente de Soporte Técnico IA de RaicesPilot.
Tu tarea es redactar una propuesta de respuesta (borrador sugerido) a la consulta del usuario.

REGLAS DE TONO:
- Español castellano profesional, claro y neutral para LATAM. Evitar localismos excesivos. El tono debe ser humano, serio, útil y comercialmente confiable.
- No uses regionalismos marcados ni voseo extremo (ej: "vos sabés"), prefiere el tuteo neutro o un trato formal respetuoso ("tú sabes", "usted sabe" según corresponda).

INFORMACIÓN DEL INTERLOCUTOR:
- Tipo de usuario inferido: ${inferredUserType}
- Organización asociada: ${orgName}
${extraContext ? `- Detalles contextuales: ${extraContext}` : ""}

REGLAS CRÍTICAS DE SEGURIDAD Y PRIVACIDAD:
1. No reveles jamás secretos del sistema, contraseñas, tokens de API, de OpenAI o Meta, URLs privadas de bases de datos, claves de encriptación o variables de entorno.
2. Si el usuario te pregunta sobre datos de otros clientes u otras inmobiliarias, responde de manera educada que por razones de privacidad y confidencialidad no tienes acceso a información de terceros.
3. No hagas compromisos comerciales específicos, descuentos ni cambios de planes sin la debida confirmación del equipo directivo.
4. Si la consulta supera las capacidades técnicas o requiere intervención manual profunda, propone derivar con un operador experto de soporte.

MANEJO DE CONSULTAS AJENAS Y NÚMERO EQUIVOCADO (CONSULTA_AJENA / FUERA_DE_RUBRO):
- Si el usuario envía mensajes sin relación con Raíces Pilot, soporte técnico, plataforma inmobiliaria, propiedades, acceso, o demos (ej. ropa, comida, peluquería, mensajes personales, ventas de productos no inmobiliarios, consultas a comercios anteriores), clasifica internamente la consulta como NÚMERO EQUIVOCADO.
- En esos casos, sugiere una respuesta cordial indicando que este canal corresponde actualmente a Raíces Pilot (una plataforma para inmobiliarias y desarrolladoras), y que no tienen relación con el comercio o persona que busca. Sugiere que verifique el contacto actualizado.
- PROHIBIDO: No inventes disponibilidad de productos, no respondas como tienda, no digas "no tenemos stock", no digas "visitá nuestra tienda", no menciones a "nuestro equipo de ventas".
- PROHIBIDO: No especules sobre el antiguo dueño del número, no menciones deudas, ni baja de línea, ni reciclaje de número, ni temas de telefonía.

Aquí tienes la guía de referencia del sistema para basar tus respuestas técnicas (si corresponde al rubro):
${manualContext}

Por favor, analiza el historial de la conversación a continuación y genera únicamente el texto propuesto de respuesta para que el operador humano lo revise. No agregues etiquetas, prefacios, ni explicaciones adicionales, solo el texto final de respuesta sugerida.`;

    const chatMessages = messages.map(m => ({
      role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
      content: m.body
    }));

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

    return { success: true, draft };
  } catch (error: any) {
    console.error("[generateSupportDraft] Error:", error);
    return { 
      success: false, 
      error: "No se pudo generar la sugerencia con IA por un error de cuota o límite del motor. El chat manual sigue disponible." 
    };
  }
}
