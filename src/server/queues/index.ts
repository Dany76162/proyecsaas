import "server-only";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { getQueueConnection } from "@/server/queues/connection";

declare global {
  var automationQueue: Queue | undefined;
  var automationRedis: Redis | undefined;
}

export function getAutomationQueue() {
  // 🔥 FIX: conexión Redis persistente para evitar que Next la rompa
  if (!globalThis.automationRedis) {
    globalThis.automationRedis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  }

  const queue =
    globalThis.automationQueue ??
    new Queue("automation-jobs", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: globalThis.automationRedis as any,
    });

  if (process.env.NODE_ENV !== "production") {
    globalThis.automationQueue = queue;
  }

  return queue;
}