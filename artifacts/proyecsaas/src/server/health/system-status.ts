import "server-only";

import { prisma } from "@/server/db/prisma";
import { getRedis } from "@/server/cache/redis";

export type SystemStatusSnapshot = {
  whatsapp: "ok" | "error";
  openai: "ok" | "missing_key";
  redis: "ok" | "error";
  db: "ok" | "error";
  mercadopago: "ok" | "missing_secret";
  runtime: "ok" | "missing_env";
};

async function getDatabaseStatus(): Promise<SystemStatusSnapshot["db"]> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

async function getRedisStatus(): Promise<SystemStatusSnapshot["redis"]> {
  try {
    const redis = getRedis();
    const result = await redis.ping();
    return result === "PONG" ? "ok" : "error";
  } catch {
    return "error";
  }
}

export async function getSystemStatusSnapshot(): Promise<SystemStatusSnapshot> {
  const [db, redis] = await Promise.all([getDatabaseStatus(), getRedisStatus()]);

  const whatsapp =
    process.env.WHATSAPP_APP_SECRET?.trim() &&
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
      ? "ok"
      : "error";

  const openai = process.env.OPENAI_API_KEY?.trim() ? "ok" : "missing_key";

  const mercadopago =
    process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() &&
    process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim()
      ? "ok"
      : "missing_secret";

  const runtime =
    process.env.AUTH_SESSION_SECRET?.trim() && process.env.NEXT_PUBLIC_APP_URL?.trim()
      ? "ok"
      : "missing_env";

  return {
    whatsapp,
    openai,
    redis,
    db,
    mercadopago,
    runtime,
  };
}
