-- CreateEnum
CREATE TYPE "ContentCalendarStatus" AS ENUM ('UNSCHEDULED', 'SCHEDULED', 'USED_MANUALLY', 'ARCHIVED');

-- AlterTable
ALTER TABLE "ContentDraft" ADD COLUMN     "calendarStatus" "ContentCalendarStatus" NOT NULL DEFAULT 'UNSCHEDULED',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "plannedPlatform" "ContentPlatform",
ADD COLUMN     "scheduledFor" TIMESTAMP(3);

