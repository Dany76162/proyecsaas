-- Unified media manager support for property images and panorama capture direction.
-- Some environments already had PropertyImage but not PropertyPanorama, so keep this
-- migration idempotent and create the panorama table before altering it.

DO $$
BEGIN
  CREATE TYPE "PropertyImageCategory" AS ENUM ('PANORAMA', 'REAL', 'RENDER', 'PROGRESS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PropertyImage"
  ADD COLUMN IF NOT EXISTS "category" "PropertyImageCategory" NOT NULL DEFAULT 'REAL';

CREATE TABLE IF NOT EXISTS "PropertyPanorama" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "label" TEXT,
  "direction" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "initialYaw" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "initialPitch" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "initialHfov" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PropertyPanorama_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PropertyPanorama"
  ADD COLUMN IF NOT EXISTS "direction" TEXT;

DO $$
BEGIN
  ALTER TABLE "PropertyPanorama"
    ADD CONSTRAINT "PropertyPanorama_propertyId_organizationId_fkey"
    FOREIGN KEY ("propertyId", "organizationId") REFERENCES "Property"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "PropertyPanorama_propertyId_idx" ON "PropertyPanorama"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyPanorama_organizationId_propertyId_idx" ON "PropertyPanorama"("organizationId", "propertyId");
