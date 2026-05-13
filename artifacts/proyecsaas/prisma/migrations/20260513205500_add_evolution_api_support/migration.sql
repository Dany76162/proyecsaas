-- AlterEnum
ALTER TYPE "WhatsAppProvider" ADD VALUE 'EVOLUTION_API';

-- AlterTable
ALTER TABLE "WhatsAppChannel" ADD COLUMN     "instanceKey" TEXT,
ADD COLUMN     "instanceName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppChannel_instanceName_key" ON "WhatsAppChannel"("instanceName");
