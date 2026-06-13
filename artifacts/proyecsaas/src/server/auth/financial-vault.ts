import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// ── Constants ─────────────────────────────────────────────────────────────────

const VAULT_COOKIE_NAME = "prs_fin_vault";
const VAULT_SESSION_DURATION_SECONDS = 60 * 60 * 4; // 4 hours
const VAULT_SESSION_DURATION_MS = VAULT_SESSION_DURATION_SECONDS * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

export type FinancialVaultSession = {
  vaultId: string;
  userId: string;
  organizationId: string;
  developmentId: string;
  role: "OWNER";
  issuedAt: number;
};

// ── Secret ───────────────────────────────────────────────────────────────────

function getVaultSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();
  if (secret) return secret + ":fin_vault";
  if (process.env.NODE_ENV !== "production") return "dev-only-fin-vault-secret";
  throw new Error("[financial-vault] Missing AUTH_SESSION_SECRET for vault sessions.");
}

// ── Token encode/decode ───────────────────────────────────────────────────────

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getVaultSecret()).update(encodedPayload).digest("base64url");
}

function encodeVaultToken(payload: FinancialVaultSession): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function decodeVaultToken(token: string): FinancialVaultSession | null {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return null;

  const encodedPayload = token.slice(0, dotIdx);
  const signature = token.slice(dotIdx + 1);

  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  if (signature.length !== expectedSignature.length) return null;

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as FinancialVaultSession | null;

    if (
      !payload?.vaultId ||
      !payload?.userId ||
      !payload?.organizationId ||
      !payload?.developmentId ||
      !payload?.role ||
      typeof payload.issuedAt !== "number"
    ) {
      return null;
    }

    const ageMs = Date.now() - payload.issuedAt;
    if (ageMs < 0 || ageMs > VAULT_SESSION_DURATION_MS) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function createFinancialVaultSession(
  session: Omit<FinancialVaultSession, "issuedAt">,
): Promise<void> {
  const cookieStore = await cookies();
  const token = encodeVaultToken({ ...session, issuedAt: Date.now() });
  cookieStore.set(VAULT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VAULT_SESSION_DURATION_SECONDS,
  });
}

export async function getFinancialVaultSession(): Promise<FinancialVaultSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(VAULT_COOKIE_NAME)?.value;
    if (!token) return null;
    return decodeVaultToken(token);
  } catch {
    return null;
  }
}

export async function clearFinancialVaultSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(VAULT_COOKIE_NAME);
}

/**
 * Returns the financial vault session ONLY if it matches the requested vault.
 * Prevents cross-vault session reuse.
 */
export async function getFinancialVaultSessionForVault(
  vaultId: string,
  developmentId: string,
  organizationId: string,
): Promise<FinancialVaultSession | null> {
  const session = await getFinancialVaultSession();
  if (!session) return null;
  if (
    session.vaultId !== vaultId ||
    session.developmentId !== developmentId ||
    session.organizationId !== organizationId
  ) {
    return null;
  }
  return session;
}
