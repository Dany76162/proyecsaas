import { NextResponse } from "next/server";

import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getAvailableChannels } from "@/modules/agents/service";

/**
 * Diagnóstico read-only del estado de los canales de WhatsApp del usuario.
 * Sirve para entender por qué un canal conectado no aparece en la lista de
 * asignación del agente. No modifica nada. Requiere sesión.
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

    // Todos los canales del org, con los campos que importan para el filtro.
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
        },
      })
      .catch((e) => ({ error: String(e?.message ?? e) }));

    // Lo que efectivamente devuelve la función que alimenta la asignación.
    const available = await getAvailableChannels(orgId).catch((e) => ({
      error: String(e?.message ?? e),
    }));

    orgs.push({
      slug: m.organization.slug,
      role: m.role,
      isManager: m.role === "OWNER" || m.role === "ADMIN",
      rawChannels,
      availableChannels: available,
    });
  }

  return NextResponse.json({ userEmail: user.email, orgs }, { status: 200 });
}
