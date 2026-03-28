import "server-only";

import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import type { SessionUser } from "@/server/auth/session";

export async function requirePlatformAdmin(): Promise<SessionUser> {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/platform");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { isPlatformAdmin: true },
  });

  if (!user?.isPlatformAdmin) {
    redirect("/");
  }

  return sessionUser;
}
