import "server-only";

import Redis from "ioredis";

declare global {
  var redis: Redis | undefined;
}

export function getRedis() {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (process.env.NODE_ENV === "production" && !redisUrl) {
    throw new Error("[cache] Missing REDIS_URL in production.");
  }

  const client =
    globalThis.redis ??
    new Redis(redisUrl || "redis://127.0.0.1:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

  if (process.env.NODE_ENV !== "production") {
    globalThis.redis = client;
  }

  return client;
}
