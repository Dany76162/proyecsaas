-- CreateEnum
CREATE TYPE "AgentAutonomyLevel" AS ENUM ('SUGGEST_ONLY', 'CREATE_DRAFTS', 'REQUIRE_APPROVAL', 'MANUAL_ONLY');

-- CreateTable
CREATE TABLE "AgentGovernancePolicy" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "scope" "AgentScope" NOT NULL DEFAULT 'PLATFORM',
    "organizationId" TEXT,
    "maxTasksPerDay" INTEGER DEFAULT 10,
    "maxRunsPerDay" INTEGER DEFAULT 50,
    "maxAutomationRunsPerDay" INTEGER DEFAULT 20,
    "maxEstimatedCostPerMonth" DECIMAL(65,30) DEFAULT 50.00,
    "autonomyLevel" "AgentAutonomyLevel" NOT NULL DEFAULT 'REQUIRE_APPROVAL',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pauseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentGovernancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentGovernancePolicy_agentId_key" ON "AgentGovernancePolicy"("agentId");

-- CreateIndex
CREATE INDEX "AgentGovernancePolicy_scope_organizationId_idx" ON "AgentGovernancePolicy"("scope", "organizationId");

-- AddForeignKey
ALTER TABLE "AgentGovernancePolicy" ADD CONSTRAINT "AgentGovernancePolicy_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
