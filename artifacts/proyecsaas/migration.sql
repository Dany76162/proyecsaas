-- CreateEnum
CREATE TYPE "MetaIntegrationStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "MetaPlatformType" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'WHATSAPP_BUSINESS');

-- DropIndex
DROP INDEX "AiAgent_organizationId_status_idx";

-- CreateTable
CREATE TABLE "MetaIntegration" (
    "id" TEXT NOT NULL,
    "scope" "AgentScope" NOT NULL DEFAULT 'PLATFORM',
    "organizationId" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "status" "MetaIntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaPage" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "MetaPlatformType" NOT NULL,
    "accessToken" TEXT,
    "status" TEXT,
    "metadata" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaIntegration_scope_organizationId_idx" ON "MetaIntegration"("scope", "organizationId");

-- CreateIndex
CREATE INDEX "MetaPage_integrationId_idx" ON "MetaPage"("integrationId");

-- CreateIndex
CREATE INDEX "MetaPage_pageId_idx" ON "MetaPage"("pageId");

-- AddForeignKey
ALTER TABLE "MetaPage" ADD CONSTRAINT "MetaPage_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "MetaIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

