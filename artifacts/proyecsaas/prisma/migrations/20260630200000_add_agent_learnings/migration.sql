-- CreateEnum
CREATE TYPE "AgentLearningType" AS ENUM ('CORRECCION_HUMANA', 'PATRON_DE_EXITO', 'OBJECION_FRECUENTE', 'PREFERENCIA_COMERCIAL', 'REGLA_OPERATIVA');

-- CreateTable
CREATE TABLE "AgentLearning" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "AgentLearningType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sourceConversationId" TEXT,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentLearning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentLearning_organizationId_isActive_idx" ON "AgentLearning"("organizationId", "isActive");

-- AddForeignKey
ALTER TABLE "AgentLearning" ADD CONSTRAINT "AgentLearning_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLearning" ADD CONSTRAINT "AgentLearning_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
