ALTER TABLE "InviteToken" ADD COLUMN "organizationId" TEXT;

WITH first_membership AS (
  SELECT DISTINCT ON ("userId")
    "userId",
    "organizationId"
  FROM "Membership"
  ORDER BY "userId", "createdAt" ASC
)
UPDATE "InviteToken" AS invite
SET "organizationId" = first_membership."organizationId"
FROM first_membership
WHERE invite."userId" = first_membership."userId"
  AND invite."organizationId" IS NULL;

DELETE FROM "InviteToken"
WHERE "organizationId" IS NULL;

ALTER TABLE "InviteToken"
ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "InviteToken"
ADD CONSTRAINT "InviteToken_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "InviteToken_organizationId_idx" ON "InviteToken"("organizationId");
