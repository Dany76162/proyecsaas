-- FASE 3C: Add planId to OrgBillingRecord
-- Additive migration: nullable column, no existing rows affected.
-- planId stores the Plan.id that a payment is intended to activate.
-- Stored without FK constraint (loose reference), consistent with
-- activatedByRecordId on Subscription.

ALTER TABLE "OrgBillingRecord" ADD COLUMN "planId" TEXT;
