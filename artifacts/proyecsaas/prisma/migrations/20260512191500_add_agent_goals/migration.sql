-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'FAILED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('MARKETING', 'OPERATIONS', 'ONBOARDING', 'COMMERCIAL', 'AUDIT');

-- AlterTable
ALTER TABLE "AgentTask" ADD COLUMN     "goalId" TEXT;

-- CreateTable
CREATE TABLE "AgentGoal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "AgentPriority" NOT NULL DEFAULT 'MEDIUM',
    "type" "GoalType" NOT NULL,
    "targetDate" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentGoal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "AgentGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

