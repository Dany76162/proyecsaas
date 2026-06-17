import { NextRequest, NextResponse } from "next/server";

import { MembershipRole } from "@prisma/client";

import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

/**
 * Al tocar la notificación de un prospecto: toma el control humano de la
 * conversación (PAUSA la IA) y redirige a WhatsApp con el contacto del prospecto
 * para que el agente siga la charla manualmente.
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
    // Pausa la IA: a partir de acá responde el humano.
    await prisma.conversation
      .update({ where: { id: conversation.id }, data: { isHumanControlled: true } })
      .catch(() => {});
  }

  const digits = conversation?.participantPhone?.replace(/\D/g, "") ?? "";
  const target = digits
    ? `https://wa.me/${digits}`
    : new URL(`/${orgSlug}/conversations`, _req.url).toString();

  return NextResponse.redirect(target);
}
