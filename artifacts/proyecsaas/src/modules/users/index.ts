import type { AppModule } from "@/modules/types";

export const usersModule: AppModule = {
  key: "users",
  label: "Users",
  description: "Users and role assignments inside each organization.",
  workspacePath: "/settings/users",
};
