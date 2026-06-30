-- CreateEnum
CREATE TYPE "ProspectSourceType" AS ENUM ('MANUAL', 'GOOGLE_PLACES', 'CSV', 'WEB_SEARCH', 'API');

-- CreateEnum
CREATE TYPE "DataValidationStatus" AS ENUM ('VALIDATED', 'PENDING_ADDRESS', 'PENDING_CITY', 'AMBIGUOUS');

-- AlterTable
ALTER TABLE "CommercialProspect" ADD COLUMN "countryCode" TEXT,
ADD COLUMN "stateProvince" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "formattedAddress" TEXT,
ADD COLUMN "latitude" DECIMAL(10,7),
ADD COLUMN "longitude" DECIMAL(10,7),
ADD COLUMN "placeId" TEXT,
ADD COLUMN "sourceType" "ProspectSourceType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "rawSourceData" JSONB,
ADD COLUMN "addressVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "validationStatus" "DataValidationStatus",
ADD COLUMN "importBatchId" TEXT,
ADD COLUMN "isBranch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "parentCompanyId" TEXT,
ADD COLUMN "scoreExplanation" JSONB;

-- CreateIndex
CREATE INDEX "CommercialProspect_placeId_idx" ON "CommercialProspect"("placeId");

-- CreateIndex
CREATE INDEX "CommercialProspect_countryCode_stateProvince_city_idx" ON "CommercialProspect"("countryCode", "stateProvince", "city");
