import "server-only";

import { Queue } from "bullmq";

import { getQueueConnection } from "@/server/queues/connection";

declare global {
  var automationQueue: Queue | undefined;
}

export function getAutomationQueue() {
  if (!globalThis.automationQueue) {
    globalThis.automationQueue = new Queue("automation-jobs", {
      connection: getQueueConnection(),
    });
  }

  return globalThis.automationQueue;
}
