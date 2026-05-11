-- CreateEnum
CREATE TYPE "MessageDeliveryStatus" AS ENUM ('RECEIVED', 'PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Message"
ADD COLUMN     "deliveryStatus" "MessageDeliveryStatus" NOT NULL DEFAULT 'RECEIVED',
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "deliveryAttemptedAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_organizationId_direction_deliveryStatus_idx" ON "Message"("organizationId", "direction", "deliveryStatus");
