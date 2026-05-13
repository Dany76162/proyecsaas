-- DropIndex
DROP INDEX "AiAgent_organizationId_status_idx";

-- AlterTable
ALTER TABLE "ProspectingCampaign" ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProspectingCampaignRecipient" ADD COLUMN     "clickedAt" TIMESTAMP(3),
ADD COLUMN     "openedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "ProspectingCampaignRecipient_providerMessageId_key" ON "ProspectingCampaignRecipient"("providerMessageId");

-- CreateIndex
CREATE INDEX "ProspectingCampaignRecipient_providerMessageId_idx" ON "ProspectingCampaignRecipient"("providerMessageId");

