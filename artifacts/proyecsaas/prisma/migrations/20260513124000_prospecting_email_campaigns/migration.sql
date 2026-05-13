-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY', 'SENDING', 'SENT', 'PAUSED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CampaignRecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED', 'BOUNCED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('UNSUBSCRIBED', 'DO_NOT_CONTACT', 'BOUNCED', 'MANUAL_BLOCK', 'CUSTOMER');

-- CreateTable
CREATE TABLE "ProspectingCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "segmentRules" JSONB,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectingCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "skipReason" TEXT,
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectingCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectingSuppression" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectingSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProspectingCampaignRecipient_campaignId_idx" ON "ProspectingCampaignRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "ProspectingCampaignRecipient_prospectId_idx" ON "ProspectingCampaignRecipient"("prospectId");

-- CreateIndex
CREATE INDEX "ProspectingCampaignRecipient_status_idx" ON "ProspectingCampaignRecipient"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectingSuppression_email_key" ON "ProspectingSuppression"("email");

-- AddForeignKey
ALTER TABLE "ProspectingCampaignRecipient" ADD CONSTRAINT "ProspectingCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ProspectingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingCampaignRecipient" ADD CONSTRAINT "ProspectingCampaignRecipient_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "CommercialProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
