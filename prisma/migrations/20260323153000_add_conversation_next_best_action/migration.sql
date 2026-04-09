ALTER TABLE "Conversation"
ADD COLUMN "nextBestAction" TEXT,
ADD COLUMN "nextBestActionAt" TIMESTAMP(3);
