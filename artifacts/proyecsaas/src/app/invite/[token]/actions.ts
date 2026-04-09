"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { createSession, getSessionUser } from "@/server/auth/session";

// 🔥 CLAVE: transición splash
function buildTransitionRedirect(nextPath: string) {
  return `/login/transition?next=${encodeURIComponent(nextPath)}`;
}

export async function acceptInviteAction(prevState: any, formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!token || !password) {
    return { success: false, message: "Completa los datos para activar el acceso." };
  }

  if (password.length < 8) {
    return { success: false, message: "La clave debe tener al menos 8 caracteres." };
  }

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    select: {
      id: true,
      userId: true,
      usedAt: true,
      expiresAt: true,
      organizationId: true,
    },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return { success: false, message: "Invitacion invalida o expirada." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: invite.organizationId },
    select: { slug: true },
  });

  if (!organization) {
    return { success: false, message: "Organizacion no disponible." };
  }

  const passwordHash = await hashPassword(password);

  // 🔥 IMPORTANTE: guardado seguro
  await prisma.$transaction([
    prisma.user.update({
      where: { id: invite.userId },
      data: { passwordHash, isActive: true },
    }),
    prisma.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  const callerSession = await getSessionUser();

  // 🔥 FIX CRÍTICO (no cortar flujo)
  if (callerSession?.isPlatformAdmin) {
    return { success: true, message: "Invitacion activada correctamente." };
  }

  await createSession(invite.userId);

  // 🔥 AQUÍ RESTAURAMOS EL SPLASH
  redirect(buildTransitionRedirect(`/${organization.slug}`));
}