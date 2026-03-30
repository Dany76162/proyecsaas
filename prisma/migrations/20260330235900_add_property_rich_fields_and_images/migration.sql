-- FASE 2C: Property rich fields — carga manual avanzada
-- Todos los campos son nullable → migración no destructiva

ALTER TABLE "Property" ADD COLUMN "description"    TEXT;
ALTER TABLE "Property" ADD COLUMN "operationType"  TEXT;
ALTER TABLE "Property" ADD COLUMN "rooms"          INTEGER;
ALTER TABLE "Property" ADD COLUMN "parkingSpots"   INTEGER;
ALTER TABLE "Property" ADD COLUMN "expensesCents"  INTEGER;
ALTER TABLE "Property" ADD COLUMN "amenities"      TEXT;
ALTER TABLE "Property" ADD COLUMN "externalLink"   TEXT;
ALTER TABLE "Property" ADD COLUMN "videoUrl"       TEXT;

-- Galería de imágenes por propiedad (URL-based, compatible con upload futuro)
CREATE TABLE "PropertyImage" (
    "id"             TEXT NOT NULL,
    "propertyId"     TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url"            TEXT NOT NULL,
    "altText"        TEXT,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "isPrimary"      BOOLEAN NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyImage_propertyId_idx"
    ON "PropertyImage"("propertyId");

CREATE INDEX "PropertyImage_organizationId_propertyId_idx"
    ON "PropertyImage"("organizationId", "propertyId");

ALTER TABLE "PropertyImage"
    ADD CONSTRAINT "PropertyImage_propertyId_organizationId_fkey"
    FOREIGN KEY ("propertyId", "organizationId")
    REFERENCES "Property"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;
