-- Migration: add_development_extra_fields
-- Corrective migration: adds columns present in schema.prisma but absent from the
-- initial 20260603120000_add_developments_module migration.
-- All columns are nullable or have defaults — fully safe for existing rows.

-- Development table: map viewer, overlay, branding, commercial fields
ALTER TABLE "Development"
  ADD COLUMN IF NOT EXISTS "mapCenterLat"      DOUBLE PRECISION DEFAULT -34.6037,
  ADD COLUMN IF NOT EXISTS "mapCenterLng"      DOUBLE PRECISION DEFAULT -58.3816,
  ADD COLUMN IF NOT EXISTS "mapZoom"           INTEGER DEFAULT 16,
  ADD COLUMN IF NOT EXISTS "overlayBounds"     TEXT,
  ADD COLUMN IF NOT EXISTS "overlayRotation"   DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "logoUrl"           TEXT,
  ADD COLUMN IF NOT EXISTS "companyLogoUrl"    TEXT,
  ADD COLUMN IF NOT EXISTS "themeColor"        TEXT DEFAULT '#0D9488',
  ADD COLUMN IF NOT EXISTS "brochurePlanUrl"   TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone"      TEXT,
  ADD COLUMN IF NOT EXISTS "contactWeb"        TEXT,
  ADD COLUMN IF NOT EXISTS "contactAddress"    TEXT,
  ADD COLUMN IF NOT EXISTS "services"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "pricePerSqmEtapa1" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pricePerSqmEtapa2" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pricePerSqmEtapa3" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pricePerSqmEtapa4" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pricePerSqmEtapa5" DOUBLE PRECISION;

-- DevelopmentLot table: etapa grouping and lot detail fields
ALTER TABLE "DevelopmentLot"
  ADD COLUMN IF NOT EXISTS "etapaNombre"  TEXT,
  ADD COLUMN IF NOT EXISTS "etapaColor"   TEXT,
  ADD COLUMN IF NOT EXISTS "frontMeters"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "backMeters"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "manzana"      TEXT,
  ADD COLUMN IF NOT EXISTS "destino"      TEXT,
  ADD COLUMN IF NOT EXISTS "clientName"   TEXT,
  ADD COLUMN IF NOT EXISTS "sellerName"   TEXT;
