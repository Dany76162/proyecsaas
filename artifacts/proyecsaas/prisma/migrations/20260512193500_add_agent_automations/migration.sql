-- CreateEnum
CREATE TYPE "AutomationType" AS ENUM ('CONTENT', 'REPORT', 'GOAL_REVIEW', 'AUDIT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AutomationFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'MANUAL');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FAILED');

-- AlterTable
ALTER TABLE "AgentTask" ADD COLUMN     "automationId" TEXT;

-- CreateTable
CREATE TABLE "AgentAutomation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" "AgentScope" NOT NULL DEFAULT 'PLATFORM',
    "organizationId" TEXT,
    "agentId" TEXT,
    "goalId" TEXT,
    "type" "AutomationType" NOT NULL DEFAULT 'CONTENT',
    "frequency" "AutomationFrequency" NOT NULL DEFAULT 'MANUAL',
    "dayOfWeek" INTEGER,
    "timeOfDay" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "AutomationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentAutomation_organizationId_idx" ON "AgentAutomation"("organizationId");

-- CreateIndex
CREATE INDEX "AgentAutomation_agentId_idx" ON "AgentAutomation"("agentId");

-- CreateIndex
CREATE INDEX "AgentAutomation_goalId_idx" ON "AgentAutomation"("goalId");

-- CreateIndex
CREATE INDEX "AgentAutomation_createdById_idx" ON "AgentAutomation"("createdById");

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "AgentAutomation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAutomation" ADD CONSTRAINT "AgentAutomation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAutomation" ADD CONSTRAINT "AgentAutomation_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "AgentGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAutomation" ADD CONSTRAINT "AgentAutomation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

