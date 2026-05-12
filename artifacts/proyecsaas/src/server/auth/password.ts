import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using Node.js crypto.scrypt.
 * Returns a string in the format "salt:hash" (base64).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("base64")}`;
}

/**
 * Verifies a password against a salt:hash string.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const hashBuf = Buffer.from(hash, "base64");

  if (buf.length !== hashBuf.length) return false;
  return timingSafeEqual(buf, hashBuf);
}
