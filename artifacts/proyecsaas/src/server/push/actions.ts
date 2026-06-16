"use server";

import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { sendPushToUser } from "@/server/push/web-push";

type SubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Guarda (upsert) la suscripción de push del navegador para el usuario logueado. */
export async function savePushSubscriptionAction(
  sub: SubscriptionInput,
  userAgent?: string,
): Promise<{ ok: true } | { ok: false; reason: "auth" | "invalid" }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "auth" };
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, reason: "invalid" };
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userId: user.id,
      organizationId: membership?.organizationId ?? null,
      userAgent: userAgent ?? null,
    },
    update: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userId: user.id,
      organizationId: membership?.organizationId ?? null,
      userAgent: userAgent ?? null,
    },
  });

  return { ok: true };
}

/** Elimina una suscripción por endpoint (al desactivar alertas). */
export async function deletePushSubscriptionAction(endpoint: string): Promise<{ ok: true }> {
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }
  return { ok: true };
}

/** Envía una notificación de prueba al usuario logueado para verificar el flujo. */
export async function sendTestPushAction(): Promise<
  | { ok: true; sent: number }
  | { ok: false; reason: "auth" | "no-subscriptions" | "not-configured" }
> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "auth" };

  const result = await sendPushToUser(user.id, {
    title: "🔔 Alertas activadas",
    body: "¡Listo! Las notificaciones de Raíces Pilot están funcionando.",
    url: "/",
  });

  if (result.sent === 0) {
    return { ok: false, reason: result.failed > 0 ? "not-configured" : "no-subscriptions" };
  }
  return { ok: true, sent: result.sent };
}
