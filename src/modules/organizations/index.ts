import type { AppModule } from "@/modules/types";

export const organizationsModule: AppModule = {
  key: "organizations",
  label: "Organizations",
  description: "Tenant resolution, workspace settings, and memberships.",
  workspacePath: "/settings/organization",
};
