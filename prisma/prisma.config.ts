import { defineConfig } from "@prisma/internals";

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
      directUrl: process.env.DIRECT_URL,
      shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
    },
  },
});
