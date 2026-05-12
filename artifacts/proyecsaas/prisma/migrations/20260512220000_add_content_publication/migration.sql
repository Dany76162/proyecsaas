-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "ContentPublication" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "platform" "MetaPlatformType" NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "externalPostId" TEXT,
    "errorMessage" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPublication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentPublication_draftId_idx" ON "ContentPublication"("draftId");

-- CreateIndex
CREATE INDEX "ContentPublication_status_idx" ON "ContentPublication"("status");

-- AddForeignKey
ALTER TABLE "ContentPublication" ADD CONSTRAINT "ContentPublication_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

