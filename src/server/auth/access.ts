import "server-only";

import { notFound, redirect } from "next/navigation";

import { MembershipRole } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";

function buildLoginRedirectPath(nextPath: string) {
  const safePath = nextPath.startsWith("/") ? nextPath : "/";
  const search = new URLSearchParams({ next: safePath });
  return `/login?${search.toString()}`;
}

export async function requireSessionUser(nextPath = "/") {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(buildLoginRedirectPath(nextPath));
  }

  return sessionUser;
}

export async function requirePlatformAdmin() {
  const sessionUser = await requireSessionUser("/platform");

  if (!sessionUser.isPlatformAdmin) {
    notFound();
  }

  return sessionUser;
}

export async function requireOrganizationMembership(orgSlug: string) {
  const sessionUser = await requireSessionUser(`/${orgSlug}`);

  const membership = await prisma.membership.findFirst({
    where: {
      userId: sessionUser.id,
      user: {
        isActive: true,
      },
      organization: {
        slug: orgSlug,
        isActive: true,
      },
    },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!membership) {
    notFound();
  }

  return {
    user: sessionUser,
    membership,
  };
}

const ROLE_RANK: Record<MembershipRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  AGENT: 2,
  ASSISTANT: 1,
};

export function assertMinimumRole(actual: MembershipRole, minimum: MembershipRole): void {
  if (ROLE_RANK[actual] < ROLE_RANK[minimum]) {
    notFound();
  }
}
