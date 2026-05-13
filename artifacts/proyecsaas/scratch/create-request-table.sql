-- CreateEnum
CREATE TYPE "ConnectionRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'CONNECTED', 'REJECTED', 'CANCELED');

-- CreateTable
CREATE TABLE "WhatsAppChannelConnectionRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedPhoneNumber" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "notes" TEXT,
    "status" "ConnectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "internalNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppChannelConnectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppChannelConnectionRequest_organizationId_status_idx" ON "WhatsAppChannelConnectionRequest"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "WhatsAppChannelConnectionRequest" ADD CONSTRAINT "WhatsAppChannelConnectionRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
