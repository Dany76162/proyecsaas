import "server-only";

import { notFound, redirect } from "next/navigation";

import { MembershipRole } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import type { SessionUser } from "@/server/auth/session";
import { resolveEffectiveCommercialState } from "@/server/billing/commercial-access";

function buildLoginRedirectPath(nextPath: string) {
  const safePath = nextPath.startsWith("/") ? nextPath : "/";
  const search = new URLSearchParams({ next: safePath });
  return `/login?${search.toString()}`;
}

export async function requireSessionUser(nextPath = "/", skipTermsCheck = false) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(buildLoginRedirectPath(nextPath));
  }

  if (!skipTermsCheck && !sessionUser.termsAcceptedAt) {
    redirect(`/auth/accept-policies?next=${encodeURIComponent(nextPath)}`);
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

export async function resolveSignedInHomePath(sessionUser: SessionUser): Promise<string> {
  if (sessionUser.isPlatformAdmin) {
    return "/platform";
  }

  const firstMembership = await prisma.membership.findFirst({
    where: {
      userId: sessionUser.id,
      user: {
        isActive: true,
      },
      organization: {
        isActive: true,
        deletedAt: null,
      },
    },
    select: {
      organization: {
        select: {
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return firstMembership ? `/${firstMembership.organization.slug}` : "/map";
}

export async function requireOrganizationMembership(orgSlug: string) {
  const sessionUser = await requireSessionUser(`/${orgSlug}`);

  // First check: does the org exist at all?
  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug },
    select: {
      id: true,
      isActive: true,
      deletedAt: true,
      name: true,
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  if (!org) {
    notFound();
  }

  if (org.deletedAt) {
    notFound();
  }

  // Second check: is it commercially blocked? Show a clear suspension page.
  const commercialState = resolveEffectiveCommercialState({
    isActive: org.isActive,
    subscription: org.subscription,
  });

  if (!commercialState.allowed) {
    redirect(`/suspended?org=${encodeURIComponent(orgSlug)}&name=${encodeURIComponent(org.name)}`);
  }

  // Third check: does the user have membership?
  const membership = await prisma.membership.findFirst({
    where: {
      userId: sessionUser.id,
      user: {
        isActive: true,
      },
      organization: {
        slug: orgSlug,
        deletedAt: null,
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
    if (sessionUser.isPlatformAdmin) {
      // Record administrative access in audit logs
      await prisma.auditLog.create({
        data: {
          event: "SUPERADMIN_WORKSPACE_ACCESS",
          actorId: sessionUser.id,
          actorEmail: sessionUser.email,
          entityType: "ORGANIZATION",
          entityId: org.id,
          entityName: org.name,
          metadata: {
            reason: "Administrative oversight",
            path: orgSlug,
          },
        },
      });

      return {
        user: sessionUser,
        membership: {
          role: MembershipRole.OWNER,
          organization: {
            id: org.id,
            slug: orgSlug,
            name: org.name,
          },
        },
      };
    }
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
