-- Restore schema elements that are still declared in Prisma schema and used by
-- production code after the AgentOS MVP migration removed them.

-- Organization fields used by the Superadmin /platform dashboard.
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "maxAiAgents" INTEGER,
ADD COLUMN IF NOT EXISTS "agentQuotaNote" TEXT;

-- InviteToken.organizationId is required by the Prisma schema and invite flows.
-- The column is restored as nullable first to avoid inventing lost relationships
-- for pre-existing tokens if a previous migration already dropped the data.
ALTER TABLE "InviteToken"
ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

CREATE INDEX IF NOT EXISTS "InviteToken_organizationId_idx"
ON "InviteToken"("organizationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InviteToken_organizationId_fkey'
  ) THEN
    ALTER TABLE "InviteToken"
    ADD CONSTRAINT "InviteToken_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AiAgent fields used by /platform impact metrics and tenant AI configuration.
ALTER TABLE "AiAgent"
ADD COLUMN IF NOT EXISTS "whatsappChannelId" TEXT,
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "persona" TEXT,
ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'Spanish',
ADD COLUMN IF NOT EXISTS "escalateOnKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "humanHandoffMessage" TEXT,
ADD COLUMN IF NOT EXISTS "escalateAfterMessages" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS "zoneFilters" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "propertyTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "minBudget" INTEGER,
ADD COLUMN IF NOT EXISTS "maxBudget" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AiAgent'
      AND column_name = 'tone'
  ) THEN
    ALTER TABLE "AiAgent"
    ADD COLUMN "tone" "AiAgentTone" NOT NULL DEFAULT 'FRIENDLY';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AiAgent'
      AND column_name = 'tone'
      AND udt_name = 'AgentTone'
  ) THEN
    ALTER TABLE "AiAgent" ALTER COLUMN "tone" DROP DEFAULT;
    ALTER TABLE "AiAgent"
    ALTER COLUMN "tone" TYPE "AiAgentTone" USING "tone"::TEXT::"AiAgentTone";
    ALTER TABLE "AiAgent" ALTER COLUMN "tone" SET DEFAULT 'FRIENDLY';
    ALTER TABLE "AiAgent" ALTER COLUMN "tone" SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "AiAgent_whatsappChannelId_key"
ON "AiAgent"("whatsappChannelId");

CREATE INDEX IF NOT EXISTS "AiAgent_organizationId_status_idx"
ON "AiAgent"("organizationId", "status");

-- Tables still declared in Prisma schema and referenced by Superadmin settings,
-- health, activation and audit helpers.
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "actorId" TEXT,
  "actorEmail" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "entityName" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_event_idx"
ON "AuditLog"("event");

CREATE INDEX IF NOT EXISTS "AuditLog_entityId_idx"
ON "AuditLog"("entityId");

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx"
ON "AuditLog"("createdAt");

CREATE TABLE IF NOT EXISTS "GlobalSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GlobalSetting_key_key"
ON "GlobalSetting"("key");

CREATE INDEX IF NOT EXISTS "GlobalSetting_key_idx"
ON "GlobalSetting"("key");
