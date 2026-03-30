process.env.NEXT_RUNTIME = "nodejs";

import { validateWorkerRuntimeConfig } from "@/server/config/runtime";
import { createConversationWorker } from "@/server/workers/conversation-worker";
import { prismaWorker } from "@/server/db/prisma-worker";

async function main() {
  validateWorkerRuntimeConfig();

  const worker = createConversationWorker();

  worker.on("ready", () => {
    console.log(JSON.stringify({ scope: "worker", event: "ready" }));
  });

  worker.on("error", (error) => {
    console.error(
      JSON.stringify({
        scope: "worker",
        event: "error",
        message: error instanceof Error ? error.message : "unknown-worker-error",
      }),
    );
  });

  worker.on("active", (job) => {
    console.log(
      JSON.stringify({
        scope: "worker",
        event: "job-active",
        jobId: job?.id ?? null,
        jobName: job?.name ?? null,
      }),
    );
  });

  worker.on("completed", (job) => {
    console.log(
      JSON.stringify({
        scope: "worker",
        event: "job-completed",
        jobId: job?.id ?? null,
        jobName: job?.name ?? null,
      }),
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      JSON.stringify({
        scope: "worker",
        event: "job-failed",
        jobId: job?.id ?? null,
        jobName: job?.name ?? null,
        message: error?.message ?? "unknown-job-failure",
      }),
    );
  });

  // Write initial heartbeat immediately so the platform dashboard sees the worker
  // as live right after boot, then refresh every 30 s.
  async function writeHeartbeat() {
    try {
      await prismaWorker.workerHeartbeat.upsert({
        where: { id: "singleton" },
        update: { lastSeenAt: new Date() },
        create: { id: "singleton", lastSeenAt: new Date() },
      });
    } catch (err) {
      console.error(
        JSON.stringify({
          scope: "worker",
          event: "heartbeat-failed",
          message: err instanceof Error ? err.message : "unknown",
        }),
      );
    }
  }

  await writeHeartbeat();
  const heartbeatInterval = setInterval(() => void writeHeartbeat(), 30_000);

  const shutdown = async (signal: string) => {
    console.log(JSON.stringify({ scope: "worker", event: "shutdown", signal }));
    clearInterval(heartbeatInterval);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error(
      JSON.stringify({
        scope: "worker",
        event: "unhandled-rejection",
        message: reason instanceof Error ? reason.message : String(reason),
      }),
    );
  });

  process.on("uncaughtException", (error) => {
    console.error(
      JSON.stringify({
        scope: "worker",
        event: "uncaught-exception",
        message: error.message,
      }),
    );
    process.exit(1);
  });

  await new Promise(() => { });
}

void main().catch((error) => {
  console.error(
    JSON.stringify({
      scope: "worker",
      event: "startup-failed",
      message: error instanceof Error ? error.message : "unknown-startup-error",
    }),
  );
  process.exit(1);
});