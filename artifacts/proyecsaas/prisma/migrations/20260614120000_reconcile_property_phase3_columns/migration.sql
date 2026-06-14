-- Reconcile production Property table with current Prisma schema.
-- These "Fase 3" columns exist in the schema and in the local DB, but are
-- missing in the production (Railway) database due to a silent migration drift
-- (migrations recorded as applied without their SQL ever running).
--
-- This migration is purely additive and idempotent (ADD COLUMN IF NOT EXISTS):
-- it does not modify or delete existing data. Existing rows receive the column
-- defaults (showExactLocation = false → privacy preserved by default).

ALTER TABLE "Property"
  ADD COLUMN IF NOT EXISTS "province"          TEXT,
  ADD COLUMN IF NOT EXISTS "country"           TEXT    DEFAULT 'Argentina',
  ADD COLUMN IF NOT EXISTS "showExactLocation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isFeatured"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "coveredSurfaceM2"  INTEGER,
  ADD COLUMN IF NOT EXISTS "totalSurfaceM2"    INTEGER,
  ADD COLUMN IF NOT EXISTS "yearBuilt"         INTEGER,
  ADD COLUMN IF NOT EXISTS "petsAllowed"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "professionalApt"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "creditApt"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "condition"         TEXT;
