-- AlterTable: add reservation config fields to Development
ALTER TABLE "Development"
  ADD COLUMN IF NOT EXISTS "reservationCurrency"          TEXT,
  ADD COLUMN IF NOT EXISTS "reservationAmountStage1Cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "reservationAmountStage2Cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "reservationAmountStage3Cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "reservationAmountStage4Cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "reservationAmountStage5Cents" INTEGER;
