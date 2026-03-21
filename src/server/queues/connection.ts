import "server-only";

import type { ConnectionOptions } from "bullmq";

export function getQueueConnection(): ConnectionOptions {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

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
