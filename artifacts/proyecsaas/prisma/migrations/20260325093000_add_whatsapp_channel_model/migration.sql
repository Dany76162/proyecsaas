-- CreateEnum
CREATE TYPE "WhatsAppProvider" AS ENUM ('WHATSAPP_CLOUD');

-- CreateEnum
CREATE TYPE "WhatsAppChannelStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "WhatsAppChannelVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'REVOKED');

-- CreateTable
CREATE TABLE "WhatsAppChannel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "WhatsAppProvider" NOT NULL DEFAULT 'WHATSAPP_CLOUD',
    "status" "WhatsAppChannelStatus" NOT NULL DEFAULT 'INACTIVE',
    "verificationStatus" "WhatsAppChannelVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT,
    "businessAccountId" TEXT,
    "displayPhoneNumber" TEXT,
    "verifiedDisplayName" TEXT,
    "accessTokenEncrypted" TEXT,
    "tokenLastValidatedAt" TIMESTAMP(3),
    "tokenExpiresAt" TIMESTAMP(3),
    "webhookSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "webhookSubscriptionCheckedAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastDeliveryAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "providerMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppChannel_phoneNumberId_key" ON "WhatsAppChannel"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsAppChannel_organizationId_provider_status_idx" ON "WhatsAppChannel"("organizationId", "provider", "status");

-- CreateIndex
CREATE INDEX "WhatsAppChannel_organizationId_isPrimary_idx" ON "WhatsAppChannel"("organizationId", "isPrimary");

-- AddForeignKey
ALTER TABLE "WhatsAppChannel" ADD CONSTRAINT "WhatsAppChannel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
