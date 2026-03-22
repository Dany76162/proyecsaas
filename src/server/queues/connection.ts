import "server-only";

import type { ConnectionOptions } from "bullmq";

let hasWarnedForDefaultRedisUrl = false;

export function getQueueConnection(): ConnectionOptions {
  const configuredRedisUrl = process.env.REDIS_URL;

  if (!configuredRedisUrl && !hasWarnedForDefaultRedisUrl) {
    hasWarnedForDefaultRedisUrl = true;
    console.warn(
      "[automation-config] REDIS_URL is not set. Falling back to redis://127.0.0.1:6379 for local-only queue usage.",
    );
  }

  let redisUrl: URL;

  try {
    redisUrl = new URL(configuredRedisUrl ?? "redis://127.0.0.1:6379");
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
