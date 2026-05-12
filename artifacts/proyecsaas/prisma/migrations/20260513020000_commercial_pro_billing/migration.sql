-- Extend BillingStatus enum with OVERDUE and ARCHIVED
ALTER TYPE "BillingStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
ALTER TYPE "BillingStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Add Commercial Pro fields to OrgBillingRecord
ALTER TABLE "OrgBillingRecord" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "OrgBillingRecord" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "OrgBillingRecord" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "OrgBillingRecord" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "OrgBillingRecord" ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;
ALTER TABLE "OrgBillingRecord" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "OrgBillingRecord" ADD COLUMN IF NOT EXISTS "reminderEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OrgBillingRecord" ADD COLUMN IF NOT EXISTS "reminderPausedAt" TIMESTAMP(3);
ALTER TABLE "OrgBillingRecord" ADD COLUMN IF NOT EXISTS "reminderPauseReason" TEXT;

-- Performance index for due date queries
CREATE INDEX IF NOT EXISTS "OrgBillingRecord_dueDate_status_idx" ON "OrgBillingRecord"("dueDate", "status");
