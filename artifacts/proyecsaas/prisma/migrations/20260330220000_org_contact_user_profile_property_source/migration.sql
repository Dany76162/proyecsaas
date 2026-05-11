-- FASE 1: Organization contact fields
ALTER TABLE "Organization" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Organization" ADD COLUMN "contactWhatsapp" TEXT;
ALTER TABLE "Organization" ADD COLUMN "website" TEXT;
ALTER TABLE "Organization" ADD COLUMN "businessHours" TEXT;

-- FASE 3: Organization property source config
ALTER TABLE "Organization" ADD COLUMN "propertySourceUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN "propertySourceType" TEXT;
ALTER TABLE "Organization" ADD COLUMN "propertySourceStatus" TEXT NOT NULL DEFAULT 'IDLE';
ALTER TABLE "Organization" ADD COLUMN "propertySourceSyncedAt" TIMESTAMP(3);

-- FASE 2: User agent profile fields
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "User" ADD COLUMN "zone" TEXT;
ALTER TABLE "User" ADD COLUMN "agentNotes" TEXT;

-- FASE 4: Property external source for dedup
ALTER TABLE "Property" ADD COLUMN "externalSourceUrl" TEXT;
ALTER TABLE "Property" ADD COLUMN "externalId" TEXT;
