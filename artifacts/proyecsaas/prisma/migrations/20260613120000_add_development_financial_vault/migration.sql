-- CreateEnum
CREATE TYPE "FinancialEntityType" AS ENUM ('DEVELOPER', 'TRUST', 'CONSTRUCTION', 'COMPANY', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "FinancialRole" AS ENUM ('OWNER', 'ADMIN', 'CONTADOR', 'AUDITOR', 'CARGADOR', 'SOLO_LECTURA');

-- CreateEnum
CREATE TYPE "FinancialAuditEvent" AS ENUM ('VAULT_ACTIVATED', 'MODULE_ACCESS', 'MODULE_ACCESS_FAILED');

-- CreateTable
CREATE TABLE "DevelopmentFinancialVault" (
    "id" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "ownerEntityType" "FinancialEntityType" NOT NULL,
    "vaultKeyHash" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAccessAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentFinancialVault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentFinancialAccess" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "FinancialRole" NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "DevelopmentFinancialAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentFinancialAuditLog" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" "FinancialRole",
    "event" "FinancialAuditEvent" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevelopmentFinancialAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentFinancialVault_developmentId_key" ON "DevelopmentFinancialVault"("developmentId");

-- CreateIndex
CREATE INDEX "DevelopmentFinancialVault_organizationId_idx" ON "DevelopmentFinancialVault"("organizationId");

-- CreateIndex
CREATE INDEX "DevelopmentFinancialAccess_vaultId_accessedAt_idx" ON "DevelopmentFinancialAccess"("vaultId", "accessedAt");

-- CreateIndex
CREATE INDEX "DevelopmentFinancialAuditLog_vaultId_createdAt_idx" ON "DevelopmentFinancialAuditLog"("vaultId", "createdAt");

-- CreateIndex
CREATE INDEX "DevelopmentFinancialAuditLog_vaultId_event_idx" ON "DevelopmentFinancialAuditLog"("vaultId", "event");

-- AddForeignKey
ALTER TABLE "DevelopmentFinancialVault" ADD CONSTRAINT "DevelopmentFinancialVault_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentFinancialVault" ADD CONSTRAINT "DevelopmentFinancialVault_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentFinancialAccess" ADD CONSTRAINT "DevelopmentFinancialAccess_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "DevelopmentFinancialVault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentFinancialAuditLog" ADD CONSTRAINT "DevelopmentFinancialAuditLog_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "DevelopmentFinancialVault"("id") ON DELETE CASCADE ON UPDATE CASCADE;
