-- CreateEnum
CREATE TYPE "ManualRating" AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE "ProspectPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "ManualProspectStatus" AS ENUM ('APTO_CONTACTO', 'REVISAR', 'DESCARTAR', 'NO_CONTACTAR', 'CONTACTAR_MAS_ADELANTE');

-- AlterEnum
ALTER TYPE "ProspectActivityType" ADD VALUE IF NOT EXISTS 'manual_rating_updated';
ALTER TYPE "ProspectActivityType" ADD VALUE IF NOT EXISTS 'priority_updated';
ALTER TYPE "ProspectActivityType" ADD VALUE IF NOT EXISTS 'manual_status_updated';
ALTER TYPE "ProspectActivityType" ADD VALUE IF NOT EXISTS 'review_completed';

-- AlterTable
ALTER TABLE "CommercialProspect" ADD COLUMN IF NOT EXISTS "fitScore" INTEGER DEFAULT 0;
ALTER TABLE "CommercialProspect" ADD COLUMN IF NOT EXISTS "riskScore" INTEGER DEFAULT 0;
ALTER TABLE "CommercialProspect" ADD COLUMN IF NOT EXISTS "aiScoringNotes" TEXT;
ALTER TABLE "CommercialProspect" ADD COLUMN IF NOT EXISTS "manualRating" "ManualRating";
ALTER TABLE "CommercialProspect" ADD COLUMN IF NOT EXISTS "priority" "ProspectPriority" DEFAULT 'MEDIUM';
ALTER TABLE "CommercialProspect" ADD COLUMN IF NOT EXISTS "manualStatus" "ManualProspectStatus";
ALTER TABLE "CommercialProspect" ADD COLUMN IF NOT EXISTS "manualNotes" TEXT;
ALTER TABLE "CommercialProspect" ADD COLUMN IF NOT EXISTS "reviewedByUserId" TEXT;
ALTER TABLE "CommercialProspect" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "CommercialProspect" ADD COLUMN IF NOT EXISTS "contactLaterDate" TIMESTAMP(3);

-- Drop unique constraint on AiAgent.whatsappChannelId if exists
DROP INDEX IF EXISTS "AiAgent_whatsappChannelId_key";
