import { createConversationWorker } from "@/server/workers/conversation-worker";

async function main() {
  const worker = createConversationWorker();

  worker.on("ready", () => {
    console.log("Conversation worker is ready.");
  });

  worker.on("error", (error) => {
    console.error("Conversation worker error", error);
  });

  const shutdown = async (signal: string) => {
    console.log(`Shutting down conversation worker (${signal})...`);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  await new Promise(() => undefined);
}

void main().catch((error) => {
  console.error("Failed to start conversation worker", error);
  process.exit(1);
});
