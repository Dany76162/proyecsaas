import "server-only";

import { Queue } from "bullmq";

import { getQueueConnection } from "@/server/queues/connection";

declare global {
  var automationQueue: Queue | undefined;
}

export function getAutomationQueue() {
  const queue =
    globalThis.automationQueue ??
    new Queue("automation-jobs", {
      connection: getQueueConnection(),
    });

  if (process.env.NODE_ENV !== "production") {
    globalThis.automationQueue = queue;
  }

  return queue;
}
