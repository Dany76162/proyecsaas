import { NextResponse } from "next/server";

import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getAvailableChannels } from "@/modules/agents/service";
import { getEvolutionWebhook, fetchEvolutionNumber } from "@/server/whatsapp/evolution";

/**
 * Diagnóstico read-only del estado de WhatsApp + agentes del usuario.
 * Sirve para entender por qué un canal no aparece para asignar o por qué el
 * agente no responde mensajes (asignación, llegada de inbound, errores de envío).
 * No modifica nada. Requiere sesión.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "no-session" }, { status: 401 });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: {
      role: true,
      organization: { select: { id: true, slug: true, name: true } },
    },
  });

  const orgs = [];
  for (const m of memberships) {
    const orgId = m.organization.id;

    const rawChannels = await prisma.whatsAppChannel
      .findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          provider: true,
          status: true,
          isActive: true,
          isPrimary: true,
          displayPhoneNumber: true,
          verifiedDisplayName: true,
          instanceName: true,
          webhookSubscribed: true,
          lastInboundAt: true,
          lastDeliveryAt: true,
          lastErrorAt: true,
          lastErrorCode: true,
          lastErrorMessage: true,
        },
      })
      .catch((e) => ({ error: String(e?.message ?? e) }));

    const agents = await prisma.aiAgent
      .findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          status: true,
          whatsappChannelId: true,
          escalateOnKeywords: true,
          humanHandoffMessage: true,
        },
      })
      .catch((e) => ({ error: String(e?.message ?? e) }));

    const available = await getAvailableChannels(orgId).catch((e) => ({
      error: String(e?.message ?? e),
    }));

    const conversations = await prisma.conversation
      .count({ where: { organizationId: orgId } })
      .catch(() => null);

    // ¿Hay dispositivos suscriptos al push para este org? (si 0, hay que activar
    // alertas en la app móvil logueado como este org).
    const pushSubscriptions = await prisma.pushSubscription
      .count({ where: { organizationId: orgId } })
      .catch(() => null);

    // Estado de la suscripción: las 3 compuertas que pueden frenar la respuesta
    // de la IA aunque el mensaje entre (suspendida / IA pausada / cupo agotado).
    const subscription = await prisma.subscription
      .findUnique({
        where: { organizationId: orgId },
        select: {
          status: true,
          aiStatus: true,
          aiMonthlyConversationLimit: true,
          aiMonthlyConversationsUsed: true,
          currentPeriodEnd: true,
        },
      })
      .catch((e) => ({ error: String(e?.message ?? e) }));

    // Estado real del webhook en Evolution para cada instancia (read-only).
    const evolutionWebhooks: Record<string, unknown> = {};
    const evolutionNumbers: Record<string, unknown> = {};
    if (Array.isArray(rawChannels)) {
      for (const ch of rawChannels) {
        if (ch.provider === "EVOLUTION_API" && ch.instanceName) {
          evolutionWebhooks[ch.instanceName] = await getEvolutionWebhook(ch.instanceName);
          evolutionNumbers[ch.instanceName] = await fetchEvolutionNumber(ch.instanceName);
        }
      }
    }

    orgs.push({
      slug: m.organization.slug,
      role: m.role,
      isManager: m.role === "OWNER" || m.role === "ADMIN",
      agents,
      rawChannels,
      availableChannels: available,
      conversationCount: conversations,
      pushSubscriptions,
      subscription,
      evolutionWebhooks,
      evolutionNumbers,
    });
  }

  const env = {
    appUrlSet: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() ?? null,
    webhookGlobalUrlSet: Boolean(process.env.WEBHOOK_GLOBAL_URL?.trim()),
    evolutionConfigured:
      Boolean(process.env.EVOLUTION_API_URL?.trim()) && Boolean(process.env.EVOLUTION_API_KEY?.trim()),
    // OJO: esto refleja el proceso WEB. El push de lead/caliente lo dispara el
    // WORKER (proceso aparte) — si el worker no tiene estas VAPID, el push no sale.
    vapidConfiguredWeb:
      Boolean(process.env.VAPID_PUBLIC_KEY?.trim()) && Boolean(process.env.VAPID_PRIVATE_KEY?.trim()),
  };

  return NextResponse.json(
    { userEmail: user.email, now: new Date().toISOString(), env, orgs },
    { status: 200 },
  );
}
