-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "planCode" TEXT,
ADD COLUMN     "paidCycles" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "aiMonthlyConversationLimit" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "aiMonthlyConversationsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lifetimeGrantedAt" TIMESTAMP(3);
