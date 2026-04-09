import type { AppModule } from "@/modules/types";

export const automationsModule: AppModule = {
  key: "automations",
  label: "Automations",
  description: "Queue-driven automation rules and jobs.",
  workspacePath: "/automations",
};
