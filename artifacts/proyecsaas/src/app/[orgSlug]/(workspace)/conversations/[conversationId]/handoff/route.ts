import { NextRequest, NextResponse } from "next/server";

import { MembershipRole } from "@prisma/client";

import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

/**
 * Al tocar la notificación de un prospecto: toma el control humano de la
 * conversación (PAUSA la IA) y abre la APP de WhatsApp con el contacto del
 * prospecto (esquema whatsapp:// para que abra la app, no WhatsApp Web).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; conversationId: string }> },
) {
  const { orgSlug, conversationId } = await params;
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId: membership.organization.id },
    select: { id: true, participantPhone: true },
  });

  if (conversation) {
    await prisma.conversation
      .update({ where: { id: conversation.id }, data: { isHumanControlled: true } })
      .catch(() => {});
  }

  const digits = conversation?.participantPhone?.replace(/\D/g, "") ?? "";

  // Sin número válido → volvemos al Inbox.
  if (!digits) {
    return NextResponse.redirect(new URL(`/${orgSlug}/conversations`, _req.url));
  }

  const appUrl = `whatsapp://send?phone=${digits}`;
  const webUrl = `https://wa.me/${digits}`;

  // Página puente: intenta abrir la APP de WhatsApp; si no está, link manual a la web.
  const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Abriendo WhatsApp…</title>
<script>window.location.href = ${JSON.stringify(appUrl)};</script>
</head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 24px;color:#0f172a">
  <p style="font-size:18px;font-weight:700">Abriendo WhatsApp…</p>
  <p style="color:#64748b;font-size:14px">Te estamos llevando al chat con el prospecto.</p>
  <p style="margin-top:24px">
    <a href="${appUrl}" style="display:inline-block;background:#25D366;color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:12px">Abrir WhatsApp</a>
  </p>
  <p style="margin-top:12px"><a href="${webUrl}" style="color:#64748b;font-size:13px">Si no se abrió, abrir en WhatsApp Web</a></p>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
