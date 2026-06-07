-- Migration: add_developments_module
-- Additive only — no existing tables touched.
-- Safe for Railway legacy DB.

-- Enums
CREATE TYPE "DevelopmentStatus" AS ENUM (
  'DRAFT', 'ACTIVE', 'SOLD_OUT', 'PAUSED', 'CANCELLED'
);

CREATE TYPE "DevelopmentLotStatus" AS ENUM (
  'AVAILABLE', 'RESERVED_PENDING', 'RESERVED', 'SOLD', 'BLOCKED'
);

CREATE TYPE "DevelopmentReservationStatus" AS ENUM (
  'PENDING_APPROVAL', 'ACTIVE', 'CANCELLED', 'SOLD'
);

-- Development table
CREATE TABLE "Development" (
  "id"                    TEXT NOT NULL,
  "organizationId"        TEXT NOT NULL,
  "name"                  TEXT NOT NULL,
  "description"           TEXT,
  "address"               TEXT,
  "city"                  TEXT,
  "province"              TEXT,
  "country"               TEXT DEFAULT 'Argentina',
  "status"                "DevelopmentStatus" NOT NULL DEFAULT 'DRAFT',
  "publicVisible"         BOOLEAN NOT NULL DEFAULT false,
  "masterplanSVG"         TEXT,
  "masterplanSourceUrl"   TEXT,
  "masterplanSourceKind"  TEXT,
  "latitude"              DECIMAL(10,7),
  "longitude"             DECIMAL(10,7),
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Development_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Development_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE INDEX "Development_organizationId_status_idx" ON "Development"("organizationId", "status");
CREATE INDEX "Development_organizationId_publicVisible_idx" ON "Development"("organizationId", "publicVisible");

-- DevelopmentLot table
CREATE TABLE "DevelopmentLot" (
  "id"               TEXT NOT NULL,
  "developmentId"    TEXT NOT NULL,
  "organizationId"   TEXT NOT NULL,
  "lotNumber"        TEXT NOT NULL,
  "status"           "DevelopmentLotStatus" NOT NULL DEFAULT 'AVAILABLE',
  "pathData"         TEXT,
  "centerX"          DOUBLE PRECISION,
  "centerY"          DOUBLE PRECISION,
  "areaSqm"          DOUBLE PRECISION,
  "priceCents"       INTEGER,
  "currency"         TEXT DEFAULT 'USD',
  "linkedPropertyId" TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DevelopmentLot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevelopmentLot_developmentId_lotNumber_key" UNIQUE ("developmentId", "lotNumber"),
  CONSTRAINT "DevelopmentLot_developmentId_fkey"
    FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE
);

CREATE INDEX "DevelopmentLot_developmentId_status_idx" ON "DevelopmentLot"("developmentId", "status");
CREATE INDEX "DevelopmentLot_organizationId_idx" ON "DevelopmentLot"("organizationId");

-- FK DevelopmentLot.organizationId -> Organization(id)
ALTER TABLE "DevelopmentLot"
  ADD CONSTRAINT "DevelopmentLot_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

-- linkedPropertyId is intentionally a plain scalar — no FK added in this phase.
-- It is nullable and will be linked to Property.id at the application layer only.

-- DevelopmentReservation table
CREATE TABLE "DevelopmentReservation" (
  "id"             TEXT NOT NULL,
  "lotId"          TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadId"         TEXT,
  "agentId"        TEXT,
  "status"         "DevelopmentReservationStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "depositCents"   INTEGER,
  "notes"          TEXT,
  "expiresAt"      TIMESTAMP(3),
  "approvedById"   TEXT,
  "approvedAt"     TIMESTAMP(3),
  "cancelledById"  TEXT,
  "cancelledAt"    TIMESTAMP(3),
  "cancelReason"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DevelopmentReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevelopmentReservation_lotId_fkey"
    FOREIGN KEY ("lotId") REFERENCES "DevelopmentLot"("id") ON DELETE CASCADE,
  CONSTRAINT "DevelopmentReservation_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "DevelopmentReservation_lotId_idx" ON "DevelopmentReservation"("lotId");
CREATE INDEX "DevelopmentReservation_organizationId_status_idx" ON "DevelopmentReservation"("organizationId", "status");
CREATE INDEX "DevelopmentReservation_leadId_idx" ON "DevelopmentReservation"("leadId");

-- Compound FK to Lead(id, organizationId). PostgreSQL enforces this only when
-- leadId IS NOT NULL, which is the correct behavior for a nullable FK column.
ALTER TABLE "DevelopmentReservation"
  ADD CONSTRAINT "DevelopmentReservation_lead_fkey"
    FOREIGN KEY ("leadId", "organizationId")
    REFERENCES "Lead"("id", "organizationId")
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED;

-- DevelopmentLotHistory table
CREATE TABLE "DevelopmentLotHistory" (
  "id"             TEXT NOT NULL,
  "lotId"          TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId"         TEXT,
  "previousStatus" "DevelopmentLotStatus" NOT NULL,
  "newStatus"      "DevelopmentLotStatus" NOT NULL,
  "reason"         TEXT,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DevelopmentLotHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevelopmentLotHistory_lotId_fkey"
    FOREIGN KEY ("lotId") REFERENCES "DevelopmentLot"("id") ON DELETE CASCADE
);

CREATE INDEX "DevelopmentLotHistory_lotId_idx" ON "DevelopmentLotHistory"("lotId");
CREATE INDEX "DevelopmentLotHistory_organizationId_idx" ON "DevelopmentLotHistory"("organizationId");

-- DevelopmentMapImage table
CREATE TABLE "DevelopmentMapImage" (
  "id"              TEXT NOT NULL,
  "developmentId"   TEXT NOT NULL,
  "unidadId"        TEXT,
  "url"             TEXT NOT NULL,
  "tipo"            TEXT NOT NULL,
  "titulo"          TEXT,
  "lat"             DOUBLE PRECISION NOT NULL,
  "lng"             DOUBLE PRECISION NOT NULL,
  "orden"           INTEGER NOT NULL DEFAULT 0,
  "altitudM"        DOUBLE PRECISION,
  "imageHeading"    DOUBLE PRECISION,
  "latOffset"       DOUBLE PRECISION,
  "lngOffset"       DOUBLE PRECISION,
  "planRotation"    DOUBLE PRECISION,
  "planScale"       DOUBLE PRECISION,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  "overlayConfig"   JSONB,

  CONSTRAINT "DevelopmentMapImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevelopmentMapImage_developmentId_fkey"
    FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE,
  CONSTRAINT "DevelopmentMapImage_unidadId_fkey"
    FOREIGN KEY ("unidadId") REFERENCES "DevelopmentLot"("id") ON DELETE SET NULL
);

CREATE INDEX "DevelopmentMapImage_developmentId_idx" ON "DevelopmentMapImage"("developmentId");
