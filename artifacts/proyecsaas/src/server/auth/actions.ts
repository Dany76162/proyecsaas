"use server";

import { createHmac, timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { clearSession, createSession } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
  next: z.string().max(500).optional(),
});

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10;
const DUMMY_PASSWORD_HASH =
  "c3RhdGljLWR1bW15LXNhbHQ=:SrMNT6ufGZ1E1DGAKiq/4QD9dSjbacGakPcM6rpuBtkVKIy0DuKAK1yak2KqGAqNOjXQt7ScuOdbByQM18dsBw==";

const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function getClientIdentifier(headerStore: Awaited<ReturnType<typeof headers>>): string {
  const forwarded = headerStore.get("x-forwarded-for");
  const ip = forwarded ? (forwarded.split(",")[0]?.trim() ?? null) : null;
  return ip ?? "unknown";
}

function checkAndRecordLoginAttempt(identifier: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  if (!entry || now - entry.windowStart > LOGIN_RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  entry.count += 1;
  return true;
}

function clearLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

function timingSafePasswordEqual(provided: string, expected: string): boolean {
  const key = Buffer.from("proyecsaas-pwd-compare-key");
  const hmacProvided = createHmac("sha256", key).update(provided).digest();
  const hmacExpected = createHmac("sha256", key).update(expected).digest();
  return timingSafeEqual(hmacProvided, hmacExpected);
}

function getSharedPassword() {
  const password = process.env.AUTH_SHARED_PASSWORD?.trim();

  if (password) {
    return password;
  }

  throw new Error(
    "[auth] Missing AUTH_SHARED_PASSWORD. Login cannot be validated without explicit shared password configuration.",
  );
}

function sanitizeRedirectPath(nextPath: string | undefined, fallbackPath: string) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallbackPath;
  }
  return nextPath;
}

// 🔥 CLAVE: transición splash
function buildTransitionRedirect(nextPath: string) {
  return `/login/transition?next=${encodeURIComponent(nextPath)}`;
}

function buildLoginRedirect(error: string, nextPath?: string) {
  const search = new URLSearchParams({ error });
  if (nextPath) search.set("next", nextPath);
  return `/login?${search.toString()}`;
}

export async function loginAction(formData: FormData) {
  const headerStore = await headers();
  const clientId = getClientIdentifier(headerStore);

  if (!checkAndRecordLoginAttempt(clientId)) {
    redirect(buildLoginRedirect("too-many-attempts"));
  }

  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "").trim(),
  });

  if (!parsed.success) {
    redirect(buildLoginRedirect("invalid-credentials"));
  }

  const user = await prisma.user.findFirst({
    where: {
      email: parsed.data.email,
      isActive: true,
    },
    select: {
      id: true,
      isPlatformAdmin: true,
      passwordHash: true,
      termsAcceptedAt: true,
      memberships: {
        select: {
          organization: {
            select: { slug: true },
          },
        },
        take: 1,
      },
    },
  });

  let isValidPassword = false;

  if (user) {
    if (timingSafePasswordEqual(parsed.data.password, getSharedPassword())) {
      isValidPassword = true;
    } else if (user.passwordHash) {
      isValidPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    }
  } else {
    await verifyPassword(parsed.data.password, DUMMY_PASSWORD_HASH);
  }

  if (!isValidPassword) {
    redirect(buildLoginRedirect("invalid-credentials"));
  }

  clearLoginAttempts(clientId);
  await createSession(user!.id);

  const finalPath = sanitizeRedirectPath(
    parsed.data.next || undefined,
    user?.isPlatformAdmin ? "/platform" : `/${user!.memberships[0]?.organization.slug}`,
  );

  // Check if policies need acceptance
  if (!user?.termsAcceptedAt) {
    redirect(buildTransitionRedirect(`/auth/accept-policies?next=${encodeURIComponent(finalPath)}`));
  }

  // 🔥 AQUÍ ESTÁ EL FIX DEL SPLASH
  redirect(buildTransitionRedirect(finalPath));
}

export async function logoutAction() {
  await clearSession();
  redirect("/login?signedOut=1");
}
