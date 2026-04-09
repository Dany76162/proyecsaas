ALTER TABLE "Organization"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");
