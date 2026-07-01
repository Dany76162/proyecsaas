-- CreateEnum
CREATE TYPE "SalesLibraryChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'INSTAGRAM', 'GENERAL');

-- CreateTable
CREATE TABLE "SalesLibraryMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "channel" "SalesLibraryChannel" NOT NULL DEFAULT 'GENERAL',
    "variables" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesLibraryMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLibraryMaterial" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "category" TEXT,
    "thumbnailUrl" TEXT,
    "publicShareUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesLibraryMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLibraryArgument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "objections" TEXT,
    "suggestedResponse" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesLibraryArgument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLibraryFAQ" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesLibraryFAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLibraryObjection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "objection" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesLibraryObjection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesLibraryMessage_organizationId_idx" ON "SalesLibraryMessage"("organizationId");
CREATE INDEX "SalesLibraryMessage_channel_idx" ON "SalesLibraryMessage"("channel");
CREATE INDEX "SalesLibraryMessage_category_idx" ON "SalesLibraryMessage"("category");

-- CreateIndex
CREATE INDEX "SalesLibraryMaterial_organizationId_idx" ON "SalesLibraryMaterial"("organizationId");
CREATE INDEX "SalesLibraryMaterial_category_idx" ON "SalesLibraryMaterial"("category");
CREATE INDEX "SalesLibraryMaterial_sortOrder_idx" ON "SalesLibraryMaterial"("sortOrder");

-- CreateIndex
CREATE INDEX "SalesLibraryArgument_organizationId_idx" ON "SalesLibraryArgument"("organizationId");
CREATE INDEX "SalesLibraryArgument_category_idx" ON "SalesLibraryArgument"("category");

-- CreateIndex
CREATE INDEX "SalesLibraryFAQ_organizationId_idx" ON "SalesLibraryFAQ"("organizationId");
CREATE INDEX "SalesLibraryFAQ_category_idx" ON "SalesLibraryFAQ"("category");

-- CreateIndex
CREATE INDEX "SalesLibraryObjection_organizationId_idx" ON "SalesLibraryObjection"("organizationId");
CREATE INDEX "SalesLibraryObjection_category_idx" ON "SalesLibraryObjection"("category");

-- AddForeignKey
ALTER TABLE "SalesLibraryMessage" ADD CONSTRAINT "SalesLibraryMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesLibraryMaterial" ADD CONSTRAINT "SalesLibraryMaterial_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesLibraryArgument" ADD CONSTRAINT "SalesLibraryArgument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesLibraryFAQ" ADD CONSTRAINT "SalesLibraryFAQ_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesLibraryObjection" ADD CONSTRAINT "SalesLibraryObjection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
