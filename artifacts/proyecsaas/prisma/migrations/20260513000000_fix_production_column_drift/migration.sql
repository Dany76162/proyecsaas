-- Fix production drift: manually restore missing columns reported by Railway runtime
-- despite migrations being marked as applied.

-- Fix Organization columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'maxAiAgents') THEN
    ALTER TABLE "Organization" ADD COLUMN "maxAiAgents" INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'agentQuotaNote') THEN
    ALTER TABLE "Organization" ADD COLUMN "agentQuotaNote" TEXT;
  END IF;
END $$;

-- Fix AiAgent columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AiAgent' AND column_name = 'status') THEN
    ALTER TABLE "AiAgent" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AiAgent' AND column_name = 'whatsappChannelId') THEN
    ALTER TABLE "AiAgent" ADD COLUMN "whatsappChannelId" TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AiAgent' AND column_name = 'persona') THEN
    ALTER TABLE "AiAgent" ADD COLUMN "persona" TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AiAgent' AND column_name = 'language') THEN
    ALTER TABLE "AiAgent" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'Spanish';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AiAgent' AND column_name = 'escalateAfterMessages') THEN
    ALTER TABLE "AiAgent" ADD COLUMN "escalateAfterMessages" INTEGER NOT NULL DEFAULT 5;
  END IF;
END $$;

-- Fix InviteToken columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'InviteToken' AND column_name = 'organizationId') THEN
    ALTER TABLE "InviteToken" ADD COLUMN "organizationId" TEXT;
  END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS "AiAgent_organizationId_status_idx" ON "AiAgent"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "InviteToken_organizationId_idx" ON "InviteToken"("organizationId");
