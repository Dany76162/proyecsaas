"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { createSession, getSessionUser } from "@/server/auth/session";

export async function acceptInviteAction(prevState: any, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token || !password) {
    return { success: false, message: "Invalid submission." };
  }

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          memberships: {
            select: {
              organization: {
                select: {
                  slug: true,
                },
              },
            },
            take: 1,
            orderBy: {
                createdAt: 'asc'
            }
          },
        },
      },
    },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return { success: false, message: "Invitation no longer valid." };
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

  // If the caller is already a platform admin, preserve their session.
  // Activating the invite (hash + usedAt) was enough — no new session needed.
  const callerSession = await getSessionUser();
  if (callerSession?.isPlatformAdmin) {
    redirect("/platform?invited=ok");
  }

  await createSession(invite.userId);

  const orgSlug = invite.user.memberships?.[0]?.organization?.slug;

  if (orgSlug) {
    redirect(`/${orgSlug}`);
  }

  redirect("/");
}
