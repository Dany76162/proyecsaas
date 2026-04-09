import crypto from "node:crypto";

// AES-256-GCM authenticated encryption for WhatsApp access tokens.
// Stored format: "enc:v1:<iv-base64url>:<ciphertext+authTag-base64url>"
// Legacy (plaintext) tokens — those without the prefix — are passed through
// transparently so existing DB rows keep working without a migration.

const ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES = 12; // 96-bit IV — recommended for GCM
const AUTH_TAG_BYTES = 16;
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const hex = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "WHATSAPP_TOKEN_ENCRYPTION_KEY is not set. " +
        "Generate a 32-byte key with: openssl rand -hex 32",
    );
  }
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    throw new Error(
      "WHATSAPP_TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters).",
    );
  }
  return buf;
}

export function isEncryptedToken(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag(); // always 16 bytes for GCM
  const payload = Buffer.concat([encrypted, authTag]).toString("base64url");
  return `${PREFIX}${iv.toString("base64url")}:${payload}`;
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    // Legacy plaintext — return as-is for backward compatibility.
    return stored;
  }

  const key = getKey();
  const rest = stored.slice(PREFIX.length);
  const colonIdx = rest.indexOf(":");
  if (colonIdx === -1) {
    throw new Error("Malformed encrypted token: missing IV/payload separator.");
  }

  const iv = Buffer.from(rest.slice(0, colonIdx), "base64url");
  const payload = Buffer.from(rest.slice(colonIdx + 1), "base64url");

  if (payload.length < AUTH_TAG_BYTES) {
    throw new Error("Malformed encrypted token: payload too short.");
  }

  const ciphertext = payload.subarray(0, payload.length - AUTH_TAG_BYTES);
  const authTag = payload.subarray(payload.length - AUTH_TAG_BYTES);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}
