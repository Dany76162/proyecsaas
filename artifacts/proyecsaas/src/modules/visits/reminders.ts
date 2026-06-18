import {
  Prisma,
  PrismaClient,
  VisitStatus,
  MessageDirection,
  MessageDeliveryStatus,
} from "@prisma/client";

import { resolveActiveChannelByOrgId } from "@/server/whatsapp/channel-resolver";
import { attemptWhatsAppOutboundDelivery } from "@/modules/automations/delivery-service";
import { notifyVisitReminder } from "@/server/push/notify";

const DAY_MS = 24 * 60 * 60 * 1000;

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || full;
}

/**
 * Recordatorio automático de visitas próximas (dentro de las próximas 24 h):
 * envía un WhatsApp al prospecto y un push a la inmobiliaria/agente. Marca
 * `reminderSentAt` para no reenviar. Idempotente: solo procesa visitas activas
 * (PENDING/CONFIRMED) sin recordatorio previo. Pensado para correr periódicamente
 * desde el worker.
 */
export async function processVisitReminders(
  prisma: PrismaClient | Prisma.TransactionClient,
): Promise<{ processed: number; whatsappSent: number }> {
  const now = new Date();
  const within24h = new Date(now.getTime() + DAY_MS);

  const visits = await prisma.visit.findMany({
    where: {
      status: { in: [VisitStatus.PENDING, VisitStatus.CONFIRMED] },
      reminderSentAt: null,
      scheduledAt: { gt: now, lte: within24h },
    },
    select: {
      id: true,
      scheduledAt: true,
      targetLabel: true,
      organizationId: true,
      property: { select: { title: true } },
      organization: { select: { slug: true } },
      lead: {
        select: {
          fullName: true,
          phone: true,
          conversations: {
            select: { id: true, participantPhone: true },
            orderBy: { lastMessageAt: "desc" },
            take: 1,
          },
        },
      },
    },
    take: 100,
  });

  let whatsappSent = 0;

  for (const visit of visits) {
    const orgSlug = visit.organization?.slug ?? "";
    const targetTitle = visit.property?.title ?? visit.targetLabel ?? "tu visita";
    const leadName = visit.lead?.fullName ?? "Cliente";
    const fechaLarga = visit.scheduledAt.toLocaleString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 1) Recordatorio al PROSPECTO por WhatsApp (si tiene conversación y hay canal activo)
    const conversation = visit.lead?.conversations[0];
    const recipientPhone = conversation?.participantPhone ?? visit.lead?.phone ?? null;
    if (conversation && recipientPhone) {
      try {
        const channel = await resolveActiveChannelByOrgId(prisma, visit.organizationId);
        if (channel) {
          const text = `Hola ${firstName(leadName)}, te recordamos tu visita a ${targetTitle} el ${fechaLarga} hs. ¡Te esperamos! Si necesitás reprogramar o cancelar, avisanos por acá.`;
          const message = await prisma.message.create({
            data: {
              organizationId: visit.organizationId,
              conversationId: conversation.id,
              direction: MessageDirection.OUTBOUND,
              body: text,
              senderName: "Recordatorio automático",
              sentAt: new Date(),
              deliveryStatus: MessageDeliveryStatus.PENDING,
            },
          });

          const result = await attemptWhatsAppOutboundDelivery(prisma, {
            organizationId: visit.organizationId,
            conversationId: conversation.id,
            outboundMessageId: message.id,
            responseText: text,
            recipientPhone,
            senderKind: "human",
            channel: {
              provider: channel.provider,
              phoneNumberId: channel.phoneNumberId,
              instanceName: channel.instanceName,
              accessToken: channel.accessToken,
            },
          });

          await prisma.message.update({
            where: { id: message.id },
            data: {
              deliveryStatus:
                result.deliveryStatus === "delivered"
                  ? MessageDeliveryStatus.SENT
                  : result.deliveryStatus === "skipped"
                    ? MessageDeliveryStatus.SKIPPED
                    : MessageDeliveryStatus.FAILED,
              providerMessageId: result.providerMessageId ?? null,
              deliveryError: result.deliveryStatus !== "delivered" ? result.reason : null,
              deliveryAttemptedAt: new Date(),
            },
          });

          if (result.deliveryStatus === "delivered") whatsappSent++;
        }
      } catch (err) {
        console.error(
          JSON.stringify({
            scope: "visit-reminder",
            event: "whatsapp-failed",
            visitId: visit.id,
            error: err instanceof Error ? err.message : "unknown",
          }),
        );
      }
    }

    // 2) Recordatorio a la INMOBILIARIA / agente por push de la app
    await notifyVisitReminder(
      visit.organizationId,
      orgSlug,
      leadName,
      targetTitle,
      visit.scheduledAt,
    ).catch(() => {});

    // 3) Marcar como recordada para no reenviar
    await prisma.visit
      .update({ where: { id: visit.id }, data: { reminderSentAt: new Date() } })
      .catch(() => {});
  }

  if (visits.length > 0) {
    console.log(
      JSON.stringify({
        scope: "visit-reminder",
        event: "processed",
        processed: visits.length,
        whatsappSent,
      }),
    );
  }

  return { processed: visits.length, whatsappSent };
}
