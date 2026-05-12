-- AlterTable: Make InviteToken.organizationId nullable
-- This is a safe, non-destructive change to align the schema with production
-- reality where legacy invite tokens exist without an associated organization.
-- All current code paths that CREATE invite tokens always provide organizationId.

ALTER TABLE "InviteToken" ALTER COLUMN "organizationId" DROP NOT NULL;
