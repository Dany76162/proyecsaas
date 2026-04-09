import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { prisma } from "@/server/db/prisma";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
};

const SESSION_COOKIE_NAME = "proyecsaas_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;

type SessionPayload = {
  userId: string;
  issuedAt: number;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-only-proyecsaas-session-secret";
  }

  throw new Error(
    "[auth] Missing AUTH_SESSION_SECRET. Web runtime sessions cannot be validated in production.",
  );
}

function signSessionPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

function encodeSessionToken(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signSessionPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function decodeSessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(encodedPayload);

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as
      | SessionPayload
      | null;

    if (!payload?.userId || typeof payload.issuedAt !== "number") {
      return null;
    }

    const ageMs = Date.now() - payload.issuedAt;

    if (ageMs < 0 || ageMs > SESSION_DURATION_MS) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const token = encodeSessionToken({
    userId,
    issuedAt: Date.now(),
  });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  let payload: SessionPayload | null;
  try {
    payload = decodeSessionToken(token);
  } catch (err) {
    // AUTH_SESSION_SECRET missing or wrong — clear stale cookie and degrade gracefully
    console.error(
      JSON.stringify({ scope: "session", event: "decode-error", message: err instanceof Error ? err.message : String(err) }),
    );
    return null;
  }

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      isPlatformAdmin: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}
