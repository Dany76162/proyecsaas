"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { createSession, getSessionUser } from "@/server/auth/session";

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

  if (!invite) {
    return { success: false, message: "La invitacion no existe o ya no es valida." };
  }

  if (invite.usedAt) {
    return { success: false, message: "Esta invitacion ya fue utilizada. Inicia sesion." };
  }

  if (invite.expiresAt < new Date()) {
    return { success: false, message: "La invitacion vencio. Solicita un nuevo enlace." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: invite.organizationId },
    select: {
      slug: true,
    },
  });

  if (!organization) {
    return {
      success: false,
      message: "La organizacion de esta invitacion ya no esta disponible. Solicita un nuevo enlace.",
    };
  }

  const passwordHash = await hashPassword(password);

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

  if (callerSession?.isPlatformAdmin) {
    return { success: true, message: "Invitacion activada correctamente." };
  }

  await createSession(invite.userId);
  redirect(`/${organization.slug}`);
}