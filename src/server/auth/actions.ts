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
const LOGIN_RATE_LIMIT_PRUNE_THRESHOLD = 5_000;

type RateLimitEntry = { count: number; windowStart: number };
const loginAttempts = new Map<string, RateLimitEntry>();

function getClientIdentifier(headerStore: Awaited<ReturnType<typeof headers>>): string {
  const forwarded = headerStore.get("x-forwarded-for");
  const ip = forwarded ? (forwarded.split(",")[0]?.trim() ?? null) : null;
  return ip ?? "unknown";
}

function pruneExpiredLoginAttempts(): void {
  if (loginAttempts.size < LOGIN_RATE_LIMIT_PRUNE_THRESHOLD) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of loginAttempts) {
    if (now - entry.windowStart > LOGIN_RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}

function checkAndRecordLoginAttempt(identifier: string): boolean {
  pruneExpiredLoginAttempts();
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

  if (process.env.NODE_ENV !== "production") {
    return "dev-access-password";
  }

  throw new Error(
    "[auth] Missing AUTH_SHARED_PASSWORD. Login cannot be validated in production.",
  );
}

function sanitizeRedirectPath(nextPath: string | undefined, fallbackPath: string) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallbackPath;
  }

  return nextPath;
}

function buildLoginRedirect(error: string, nextPath?: string) {
  const search = new URLSearchParams({ error });

  if (nextPath) {
    search.set("next", nextPath);
  }

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
      passwordHash: true,
      memberships: {
        where: {
          organization: {
            isActive: true,
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
        take: 1,
      },
    },
  });

  // 1. Password Verification (Hash or Shared Fallback)
  let isValidPassword = false;
  if (user) {
    if (user.passwordHash) {
      isValidPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    } else {
      isValidPassword = timingSafePasswordEqual(parsed.data.password, getSharedPassword());
    }
  } else {
    // If user not found, we still want to spend some time on validation
    // to partially mitigate timing attacks on existence.
    await verifyPassword(parsed.data.password, "dummy:hash");
    isValidPassword = false;
  }

  if (!isValidPassword) {
    redirect(buildLoginRedirect("invalid-credentials", parsed.data.next || undefined));
  }

  // 2. Membership Check (Only after valid password)
  const firstMembership = user?.memberships[0];

  if (!firstMembership) {
    // If password was correct but user has no active memberships
    redirect(buildLoginRedirect("no-memberships", parsed.data.next || undefined));
  }

  // 3. Success: Finalize Session
  clearLoginAttempts(clientId);
  await createSession(user.id);

  redirect(
    sanitizeRedirectPath(parsed.data.next || undefined, `/${firstMembership.organization.slug}`),
  );
}

export async function logoutAction() {
  await clearSession();
  redirect("/login?signedOut=1");
}