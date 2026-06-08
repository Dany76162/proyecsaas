-- Migration: add_reservation_payment_settlement_fields
-- Fase 2 del modelo centralizado de cobro de reservas de Raíces Pilot.
-- Adds payment tracking and settlement (liquidación) fields to DevelopmentReservation.
-- All changes are ADDITIVE — no DROP, no ALTER COLUMN, no data loss.
-- Existing rows will have NULL in all new nullable columns.

-- ── Step 1: Create new enum for settlement status ────────────────────────────
-- Guards against duplicate type in case of partial re-run.
DO $$ BEGIN
  CREATE TYPE "ReservationSettlementStatus" AS ENUM (
    'PENDING',    -- Payment received by Raíces Pilot, transfer to developer pending
    'IN_REVIEW',  -- Under internal review before transfer
    'SETTLED',    -- Funds transferred to developer
    'HELD',       -- Transfer on hold (dispute, refund, or compliance check)
    'REFUNDED'    -- Refunded to the buyer
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Step 2: Add payment tracking columns ─────────────────────────────────────
ALTER TABLE "DevelopmentReservation"
  ADD COLUMN IF NOT EXISTS "mpPaymentId"    TEXT,
  ADD COLUMN IF NOT EXISTS "mpPreferenceId" TEXT,
  ADD COLUMN IF NOT EXISTS "mpCurrency"     TEXT,
  ADD COLUMN IF NOT EXISTS "grossAmountCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "commissionCents"  INTEGER,
  ADD COLUMN IF NOT EXISTS "netAmountCents"   INTEGER;

-- ── Step 3: Add settlement tracking columns ───────────────────────────────────
ALTER TABLE "DevelopmentReservation"
  ADD COLUMN IF NOT EXISTS "settlementStatus"    "ReservationSettlementStatus" DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "settledAt"           TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "settlementReference" TEXT,
  ADD COLUMN IF NOT EXISTS "settlementNotes"     TEXT,
  ADD COLUMN IF NOT EXISTS "settledById"         TEXT;

-- ── Step 4: Create performance indexes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS "DevelopmentReservation_mpPaymentId_idx"
  ON "DevelopmentReservation"("mpPaymentId");

CREATE INDEX IF NOT EXISTS "DevelopmentReservation_mpPreferenceId_idx"
  ON "DevelopmentReservation"("mpPreferenceId");

CREATE INDEX IF NOT EXISTS "DevelopmentReservation_settlementStatus_idx"
  ON "DevelopmentReservation"("settlementStatus");

CREATE INDEX IF NOT EXISTS "DevelopmentReservation_organizationId_settlementStatus_idx"
  ON "DevelopmentReservation"("organizationId", "settlementStatus");
