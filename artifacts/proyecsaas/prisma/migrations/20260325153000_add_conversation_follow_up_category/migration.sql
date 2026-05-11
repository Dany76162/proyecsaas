CREATE TYPE "FollowUpCategory" AS ENUM ('TECHNICAL', 'COMMERCIAL');

ALTER TABLE "Conversation"
ADD COLUMN "followUpCategory" "FollowUpCategory";
