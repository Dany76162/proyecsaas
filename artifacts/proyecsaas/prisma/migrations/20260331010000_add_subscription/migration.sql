-- FASE 3B: Subscription model — tenant subscription state
-- Additive migration: creates SubscriptionStatus enum and Subscription table.
-- No existing tables are modified.

-- ─── Enum ─────────────────────────────────────────────────────────────────────

CREATE TYPE "SubscriptionStatus" AS ENUM (
    'TRIALING',
    'ACTIVE',
    'PAST_DUE',
    'CANCELLED',
    'EXPIRED'
);

-- ─── Subscription ─────────────────────────────────────────────────────────────
-- Represents the real-time commercial state of a tenant.
-- One row per organization (@unique on organizationId) — the schema-level
-- guarantee that a tenant can never accidentally have two active subscriptions.
--
-- activatedByRecordId is a plain nullable text column (no FK constraint) that
-- stores the OrgBillingRecord.id which activated or renewed this subscription.
-- Kept as a loose reference intentionally to avoid touching OrgBillingRecord
-- in this phase. A proper FK can be added in a future migration if needed.
--
-- onDelete on planId is RESTRICT: a Plan row cannot be deleted while any
-- Subscription still references it, preventing accidental catalog corruption.

CREATE TABLE "Subscription" (
    "id"                   TEXT                  NOT NULL,
    "organizationId"       TEXT                  NOT NULL,
    "planId"               TEXT                  NOT NULL,
    "status"               "SubscriptionStatus"  NOT NULL DEFAULT 'TRIALING',
    "currentPeriodStart"   TIMESTAMP(3)          NOT NULL,
    "currentPeriodEnd"     TIMESTAMP(3)          NOT NULL,
    "cancelAtPeriodEnd"    BOOLEAN               NOT NULL DEFAULT false,
    "activatedByRecordId"  TEXT,
    "createdAt"            TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3)          NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on organizationId — enforced at the database level
CREATE UNIQUE INDEX "Subscription_organizationId_key"
    ON "Subscription"("organizationId");

-- Index for expiration jobs: find all subscriptions with a given status
CREATE INDEX "Subscription_status_idx"
    ON "Subscription"("status");

-- Compound index for expiration jobs: find subscriptions expiring before a date
CREATE INDEX "Subscription_currentPeriodEnd_status_idx"
    ON "Subscription"("currentPeriodEnd", "status");

-- FK to Organization — CASCADE so orphaned subscriptions are cleaned automatically
ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- FK to Plan — RESTRICT so a Plan with active subscriptions cannot be deleted
ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_planId_fkey"
    FOREIGN KEY ("planId")
    REFERENCES "Plan"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
