import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { MembershipRole } from "@prisma/client";

/**
 * Resolves the organizationId from the orgSlug query parameter,
 * checking that the current user has at least ADMIN role.
 */
async function resolveOrgFromRequest(req: NextRequest, userId: string) {
  const orgSlug = req.nextUrl.searchParams.get("orgSlug");
  if (!orgSlug) return null;

  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      organization: { slug: orgSlug, isActive: true },
      user: { isActive: true },
    },
    select: {
      role: true,
      organization: { select: { id: true } },
    },
  });

  if (!membership) return null;

  const ROLE_RANK: Record<string, number> = {
    OWNER: 4,
    ADMIN: 3,
    AGENT: 2,
    ASSISTANT: 1,
  };

  if ((ROLE_RANK[membership.role] ?? 0) < ROLE_RANK[MembershipRole.ADMIN]) {
    return null;
  }

  return membership.organization.id;
}

/**
 * GET /api/agent?orgSlug=xxx
 * Returns the org's AiAgent (auto-creates a default one if missing).
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const organizationId = await resolveOrgFromRequest(req, user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "Organización no encontrada." }, { status: 404 });
  }

  const agent = await prisma.aiAgent.upsert({
    where: { organizationId },
    create: {
      organizationId,
      name: "Asistente IA",
      tone: "FRIENDLY",
      isActive: true,
    },
    update: {},
  });

  return NextResponse.json({ agent });
}

/**
 * PATCH /api/agent?orgSlug=xxx
 * Updates name, tone, persona, isActive.
 */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const organizationId = await resolveOrgFromRequest(req, user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "Organización no encontrada." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const allowedTones = ["FORMAL", "FRIENDLY", "NEUTRAL"];
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim().length > 0) {
    data.name = body.name.trim().slice(0, 120);
  }

  if (typeof body.tone === "string" && allowedTones.includes(body.tone)) {
    data.tone = body.tone;
  }

  if (body.persona !== undefined) {
    data.persona = typeof body.persona === "string" && body.persona.trim().length > 0
      ? body.persona.trim().slice(0, 2000)
      : null;
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Sin campos válidos para actualizar." }, { status: 400 });
  }

  const agent = await prisma.aiAgent.upsert({
    where: { organizationId },
    create: {
      organizationId,
      name: (data.name as string) ?? "Asistente IA",
      tone: (data.tone as "FORMAL" | "FRIENDLY" | "NEUTRAL") ?? "FRIENDLY",
      persona: (data.persona as string) ?? null,
      isActive: (data.isActive as boolean) ?? true,
    },
    update: data,
  });

  return NextResponse.json({ agent });
}
