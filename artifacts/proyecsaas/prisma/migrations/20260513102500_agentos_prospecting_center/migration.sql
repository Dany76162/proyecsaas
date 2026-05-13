-- CreateEnum
CREATE TYPE "ProspectCompanyType" AS ENUM ('REAL_ESTATE_AGENCY', 'CONSTRUCTION_COMPANY', 'DEVELOPER', 'BROKER_AGENT', 'PROPERTY_MANAGER', 'LAND_DEVELOPER', 'REAL_ESTATE_GROUP', 'ARCHITECTURE_STUDIO', 'REAL_ESTATE_INVESTOR', 'OTHER_REAL_ESTATE');

-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NEW', 'NEEDS_REVIEW', 'APPROVED', 'DISCARDED', 'DUPLICATE', 'CONTACT_READY', 'CONTACTED', 'REPLIED', 'DEMO_REQUESTED', 'CUSTOMER', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "ProspectActivityType" AS ENUM ('created', 'imported', 'approved', 'discarded', 'marked_duplicate', 'marked_do_not_contact', 'email_draft_generated', 'contact_marked_sent', 'reply_logged', 'demo_requested', 'note_added');

-- CreateEnum
CREATE TYPE "ProspectMessageChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'LINKEDIN', 'OTHER');

-- CreateEnum
CREATE TYPE "ProspectDraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'SENT_MANUALLY');

-- CreateTable
CREATE TABLE "CommercialProspect" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyType" "ProspectCompanyType" NOT NULL DEFAULT 'OTHER_REAL_ESTATE',
    "status" "ProspectStatus" NOT NULL DEFAULT 'NEW',
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "sourceUrl" TEXT,
    "sourceName" TEXT,
    "confidenceScore" INTEGER DEFAULT 0,
    "qualityScore" INTEGER DEFAULT 0,
    "notes" TEXT,
    "agentNotes" TEXT,
    "internalTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDoNotContact" BOOLEAN NOT NULL DEFAULT false,
    "doNotContactReason" TEXT,
    "duplicateOfId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "discardedAt" TIMESTAMP(3),
    "discardedReason" TEXT,
    "contactedAt" TIMESTAMP(3),
    "lastContactedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "demoRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialProspect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialProspectActivity" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" "ProspectActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialProspectActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectingMessageDraft" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "channel" "ProspectMessageChannel" NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "ProspectDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedByAgent" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectingMessageDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommercialProspect_status_idx" ON "CommercialProspect"("status");

-- CreateIndex
CREATE INDEX "CommercialProspect_companyType_idx" ON "CommercialProspect"("companyType");

-- CreateIndex
CREATE INDEX "CommercialProspect_email_idx" ON "CommercialProspect"("email");

-- CreateIndex
CREATE INDEX "CommercialProspect_website_idx" ON "CommercialProspect"("website");

-- CreateIndex
CREATE INDEX "CommercialProspectActivity_prospectId_idx" ON "CommercialProspectActivity"("prospectId");

-- CreateIndex
CREATE INDEX "ProspectingMessageDraft_prospectId_idx" ON "ProspectingMessageDraft"("prospectId");

-- CreateIndex
CREATE INDEX "ProspectingMessageDraft_status_idx" ON "ProspectingMessageDraft"("status");

-- AddForeignKey
ALTER TABLE "CommercialProspectActivity" ADD CONSTRAINT "CommercialProspectActivity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "CommercialProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingMessageDraft" ADD CONSTRAINT "ProspectingMessageDraft_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "CommercialProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
