-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'ISSUED', 'EXEMPT');

-- CreateTable
CREATE TABLE "OrgBillingRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "mpPreferenceId" TEXT,
    "mpPaymentUrl" TEXT,
    "mpPaymentId" TEXT,
    "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgBillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgBillingRecord_organizationId_status_idx" ON "OrgBillingRecord"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrgBillingRecord_organizationId_createdAt_idx" ON "OrgBillingRecord"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrgBillingRecord" ADD CONSTRAINT "OrgBillingRecord_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
