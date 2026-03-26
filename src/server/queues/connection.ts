import type { ConnectionOptions } from "bullmq";

let hasWarnedForDefaultRedisUrl = false;

const LOCAL_REDIS_FALLBACK_URL = "redis://127.0.0.1:6379";

export function getQueueConnection(): ConnectionOptions {
  const configuredRedisUrl = process.env.REDIS_URL;
  const isProduction = process.env.NODE_ENV === "production";

  if (!configuredRedisUrl && isProduction) {
    throw new Error("REDIS_URL is required in production for webhook enqueue and worker processing.");
  }

  if (!configuredRedisUrl && !isProduction && !hasWarnedForDefaultRedisUrl) {
    hasWarnedForDefaultRedisUrl = true;
    console.warn(
      "[automation-config] REDIS_URL is not set. Falling back to redis://127.0.0.1:6379 for local-only queue usage.",
    );
  }

  let redisUrl: URL;

  try {
    redisUrl = new URL(configuredRedisUrl ?? LOCAL_REDIS_FALLBACK_URL);
  } catch {
    throw new Error("Invalid REDIS_URL. Automation queue connection could not be configured.");
  }

  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1) || "0") : 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
