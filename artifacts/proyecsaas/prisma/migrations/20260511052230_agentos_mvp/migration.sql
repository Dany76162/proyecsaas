-- CreateEnum
CREATE TYPE "AgentTone" AS ENUM ('FORMAL', 'FRIENDLY', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "AgentScope" AS ENUM ('PLATFORM', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('ORCHESTRATOR', 'MARKETING');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'APPROVAL_PENDING');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContentPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'WHATSAPP_BUSINESS');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AgentPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AgentLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- DropForeignKey
ALTER TABLE "InviteToken" DROP CONSTRAINT IF EXISTS "InviteToken_organizationId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "AiAgent_organizationId_status_idx";

-- DropIndex
DROP INDEX IF EXISTS "AiAgent_whatsappChannelId_key";

-- DropIndex
DROP INDEX IF EXISTS "InviteToken_organizationId_idx";

-- AlterTable
ALTER TABLE "AiAgent" DROP COLUMN IF EXISTS "description",
DROP COLUMN IF EXISTS "escalateAfterMessages",
DROP COLUMN IF EXISTS "escalateOnKeywords",
DROP COLUMN IF EXISTS "humanHandoffMessage",
DROP COLUMN IF EXISTS "is24x7",
DROP COLUMN IF EXISTS "language",
DROP COLUMN IF EXISTS "maxBudget",
DROP COLUMN IF EXISTS "minBudget",
DROP COLUMN IF EXISTS "propertyTypes",
DROP COLUMN IF EXISTS "status",
DROP COLUMN IF EXISTS "whatsappChannelId",
DROP COLUMN IF EXISTS "zoneFilters",
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "name" SET DEFAULT 'Asistente IA',
DROP COLUMN IF EXISTS "tone",
ADD COLUMN IF NOT EXISTS "tone" "AgentTone" NOT NULL DEFAULT 'FRIENDLY';

-- AlterTable
ALTER TABLE "InviteToken" DROP COLUMN IF EXISTS "organizationId";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN IF EXISTS "agentQuotaNote",
DROP COLUMN IF EXISTS "maxAiAgents";

-- DropTable
DROP TABLE IF EXISTS "AuditLog";

-- DropTable
DROP TABLE IF EXISTS "GlobalSetting";

-- DropEnum
-- DROP TYPE IF EXISTS "AiAgentStatus"; -- Comentado para evitar error si no existe o se usa
-- DROP TYPE IF EXISTS "AiAgentTone"; -- Comentado para evitar error si no existe o se usa

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Agent" (
    "id" TEXT NOT NULL,
    "scope" "AgentScope" NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentTask" (
    "id" TEXT NOT NULL,
    "scope" "AgentScope" NOT NULL,
    "organizationId" TEXT,
    "agentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "AgentPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentRun" (
    "id" TEXT NOT NULL,
    "scope" "AgentScope" NOT NULL,
    "organizationId" TEXT,
    "taskId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentApproval" (
    "id" TEXT NOT NULL,
    "scope" "AgentScope" NOT NULL,
    "organizationId" TEXT,
    "taskId" TEXT NOT NULL,
    "runId" TEXT,
    "requestedByAgentId" TEXT,
    "decidedByUserId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AgentApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentLog" (
    "id" TEXT NOT NULL,
    "scope" "AgentScope" NOT NULL,
    "organizationId" TEXT,
    "runId" TEXT,
    "level" "AgentLogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentDraft" (
    "id" TEXT NOT NULL,
    "scope" "AgentScope" NOT NULL,
    "organizationId" TEXT,
    "taskId" TEXT NOT NULL,
    "platform" "ContentPlatform" NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "hashtags" TEXT[],
    "imagePrompt" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Agent_scope_organizationId_type_idx" ON "Agent"("scope", "organizationId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgentTask_scope_organizationId_status_idx" ON "AgentTask"("scope", "organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgentRun_scope_organizationId_status_idx" ON "AgentRun"("scope", "organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgentLog_scope_organizationId_timestamp_idx" ON "AgentLog"("scope", "organizationId", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentDraft_scope_organizationId_status_idx" ON "ContentDraft"("scope", "organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AiAgent_organizationId_key" ON "AiAgent"("organizationId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentApproval" ADD CONSTRAINT "AgentApproval_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentApproval" ADD CONSTRAINT "AgentApproval_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentApproval" ADD CONSTRAINT "AgentApproval_requestedByAgentId_fkey" FOREIGN KEY ("requestedByAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentApproval" ADD CONSTRAINT "AgentApproval_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
