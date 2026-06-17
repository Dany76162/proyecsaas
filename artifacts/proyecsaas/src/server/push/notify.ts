import "server-only";

import { prisma } from "@/server/db/prisma";
import { sendPushToOrganization } from "@/server/push/web-push";

/**
 * Notifica (web push) a los miembros suscriptos de la organización que entró
 * un nuevo lead. Best-effort: nunca lanza ni bloquea el flujo que lo invoca.
 */
export async function notifyNewLead(
  organizationId: string,
  leadName: string,
  conversationId?: string,
): Promise<void> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });
    if (!org) return;
    // Al tocar la notificación: toma control (pausa la IA) y abre WhatsApp con
    // el prospecto. Si no hay conversación, cae al Inbox.
    const url = conversationId
      ? `/${org.slug}/conversations/${conversationId}/handoff`
      : `/${org.slug}/conversations`;
    await sendPushToOrganization(organizationId, {
      title: "🔔 Nuevo lead",
      body: `${leadName || "Un interesado"} escribió por WhatsApp. Tocá para responderle.`,
      url,
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Notifica (web push) que un prospecto se calificó como caliente / muy
 * interesado, para que la inmobiliaria pueda intervenir. Best-effort.
 * No pausa la IA: es solo un aviso (la IA sigue atendiendo).
 */
export async function notifyHotLead(
  organizationId: string,
  orgSlug: string,
  leadName: string,
  summary: string,
  conversationId?: string,
): Promise<void> {
  try {
    // Al tocar: toma control (pausa la IA) y abre WhatsApp con el prospecto.
    const url = conversationId
      ? `/${orgSlug}/conversations/${conversationId}/handoff`
      : `/${orgSlug}/conversations`;
    await sendPushToOrganization(organizationId, {
      title: "🔥 Prospecto caliente",
      body: `${leadName || "Un interesado"} — ${summary}`,
      url,
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Notifica (web push) que se agendó una visita. Best-effort.
 */
export async function notifyVisitScheduled(
  organizationId: string,
  orgSlug: string,
  leadName: string,
  propertyTitle: string,
  scheduledAt: Date,
): Promise<void> {
  try {
    const fecha = scheduledAt.toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    await sendPushToOrganization(organizationId, {
      title: "📅 Visita agendada",
      body: `${leadName} — ${propertyTitle} · ${fecha}`,
      url: `/${orgSlug}/visits`,
    });
  } catch {
    /* best-effort */
  }
}
