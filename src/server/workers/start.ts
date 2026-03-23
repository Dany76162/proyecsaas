import { validateWorkerRuntimeConfig } from "@/server/config/runtime";
import { createConversationWorker } from "@/server/workers/conversation-worker";

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

  const shutdown = async (signal: string) => {
    console.log(JSON.stringify({ scope: "worker", event: "shutdown", signal }));
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

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

  await new Promise(() => undefined);
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
