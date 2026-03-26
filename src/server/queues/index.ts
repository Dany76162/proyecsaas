import "server-only";

import { Queue } from "bullmq";

import { getQueueConnection } from "@/server/queues/connection";

declare global {
  var automationQueue: Queue | undefined;
}

export function getAutomationQueue() {
  if (!globalThis.automationQueue) {
    globalThis.automationQueue = new Queue("automation-jobs", {
      connection: getQueueConnection() as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 1000,
        removeOnFail: 500,
      },
    });
  }

  return globalThis.automationQueue;
}
