-- Extend FinancialAuditEvent enum with expense and attachment events
ALTER TYPE "FinancialAuditEvent" ADD VALUE IF NOT EXISTS 'EXPENSE_CREATED';
ALTER TYPE "FinancialAuditEvent" ADD VALUE IF NOT EXISTS 'EXPENSE_APPROVED';
ALTER TYPE "FinancialAuditEvent" ADD VALUE IF NOT EXISTS 'EXPENSE_REJECTED';
ALTER TYPE "FinancialAuditEvent" ADD VALUE IF NOT EXISTS 'EXPENSE_VOIDED';
ALTER TYPE "FinancialAuditEvent" ADD VALUE IF NOT EXISTS 'ATTACHMENT_UPLOADED';
ALTER TYPE "FinancialAuditEvent" ADD VALUE IF NOT EXISTS 'ATTACHMENT_DELETED';

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM (
  'MENSURA',
  'AGRIMENSURA',
  'MUNICIPALIDAD',
  'APROBACIONES',
  'ESCRITURAS',
  'INFRAESTRUCTURA',
  'CALLES',
  'LUZ',
  'AGUA',
  'SEGURIDAD',
  'MARKETING',
  'COMISIONES',
  'ADMINISTRACION',
  'HONORARIOS',
  'IMPUESTOS',
  'GASTOS_MENORES',
  'OTROS'
);

-- CreateTable
CREATE TABLE "DevelopmentFinancialExpense" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "provider" TEXT,
    "paidBy" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "internalNotes" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "voidedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentFinancialExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentFinancialAttachment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "r2Key" TEXT NOT NULL,
    "hash" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "deleteReason" TEXT,

    CONSTRAINT "DevelopmentFinancialAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DevelopmentFinancialExpense_vaultId_date_idx" ON "DevelopmentFinancialExpense"("vaultId", "date");

-- CreateIndex
CREATE INDEX "DevelopmentFinancialExpense_vaultId_status_idx" ON "DevelopmentFinancialExpense"("vaultId", "status");

-- CreateIndex
CREATE INDEX "DevelopmentFinancialExpense_vaultId_category_idx" ON "DevelopmentFinancialExpense"("vaultId", "category");

-- CreateIndex
CREATE INDEX "DevelopmentFinancialAttachment_expenseId_idx" ON "DevelopmentFinancialAttachment"("expenseId");

-- CreateIndex
CREATE INDEX "DevelopmentFinancialAttachment_vaultId_idx" ON "DevelopmentFinancialAttachment"("vaultId");

-- AddForeignKey
ALTER TABLE "DevelopmentFinancialExpense" ADD CONSTRAINT "DevelopmentFinancialExpense_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "DevelopmentFinancialVault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentFinancialAttachment" ADD CONSTRAINT "DevelopmentFinancialAttachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "DevelopmentFinancialExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentFinancialAttachment" ADD CONSTRAINT "DevelopmentFinancialAttachment_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "DevelopmentFinancialVault"("id") ON DELETE CASCADE ON UPDATE CASCADE;
