import "server-only";
import webpush from "web-push";

import { prisma } from "@/server/db/prisma";

let configured: boolean | null = null;

/** Configura web-push con las claves VAPID. Devuelve false si faltan. */
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:soporte@raicespilot.com";
  if (!publicKey || !privateKey) {
    console.error("[web-push] Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY");
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

type SendResult = { sent: number; failed: number };

async function sendToSubscriptions(
  subs: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload,
): Promise<SendResult> {
  if (!ensureConfigured()) return { sent: 0, failed: subs.length };

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 404/410 → suscripción expirada o cancelada: la limpiamos.
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: s.endpoint } })
            .catch(() => {});
        }
      }
    }),
  );

  return { sent, failed };
}

/** Envía una notificación push a todas las suscripciones de un usuario. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<SendResult> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  return sendToSubscriptions(subs, payload);
}

/** Envía una notificación push a todas las suscripciones de una organización. */
export async function sendPushToOrganization(
  organizationId: string,
  payload: PushPayload,
): Promise<SendResult> {
  const subs = await prisma.pushSubscription.findMany({ where: { organizationId } });
  return sendToSubscriptions(subs, payload);
}
