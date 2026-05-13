import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Applying tracking fields...");
  
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProspectingCampaign" ADD COLUMN IF NOT EXISTS "clickCount" INTEGER NOT NULL DEFAULT 0`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProspectingCampaign" ADD COLUMN IF NOT EXISTS "openCount" INTEGER NOT NULL DEFAULT 0`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProspectingCampaignRecipient" ADD COLUMN IF NOT EXISTS "clickedAt" TIMESTAMP(3)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProspectingCampaignRecipient" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMP(3)`);
    
    // Check if index exists before creating
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "ProspectingCampaignRecipient_providerMessageId_key" ON "ProspectingCampaignRecipient"("providerMessageId")`);
    } catch (e) {
      console.log("Unique index might already exist, skipping.");
    }

    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX "ProspectingCampaignRecipient_providerMessageId_idx" ON "ProspectingCampaignRecipient"("providerMessageId")`);
    } catch (e) {
      console.log("Index might already exist, skipping.");
    }

    console.log("DONE.");
  } catch (err) {
    console.error("Error applying SQL:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
