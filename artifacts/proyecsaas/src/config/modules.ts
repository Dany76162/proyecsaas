import { authModule } from "@/modules/auth";
import { automationsModule } from "@/modules/automations";
import { conversationsModule } from "@/modules/conversations";
import { leadsModule } from "@/modules/leads";
import { organizationsModule } from "@/modules/organizations";
import { propertiesModule } from "@/modules/properties";
import type { AppModule } from "@/modules/types";
import { usersModule } from "@/modules/users";
import { visitsModule } from "@/modules/visits";

export const modules: readonly AppModule[] = [
  authModule,
  organizationsModule,
  usersModule,
  leadsModule,
  propertiesModule,
  conversationsModule,
  visitsModule,
  automationsModule,
];
