-- F-1: Gestión de Venta — buyer data, payment fields, and installment plan
-- All new columns on DevelopmentReservation are nullable — no existing data touched.
-- DevelopmentReservationInstallment is a brand-new table.

-- CreateEnum
CREATE TYPE "DevelopmentInstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- AlterTable: add buyer + commercial + installment plan fields to existing reservation
ALTER TABLE "DevelopmentReservation"
ADD COLUMN     "buyerDni" TEXT,
ADD COLUMN     "buyerWhatsapp" TEXT,
ADD COLUMN     "downPaymentCents" INTEGER,
ADD COLUMN     "firstDueDate" TIMESTAMP(3),
ADD COLUMN     "installmentAmountCents" INTEGER,
ADD COLUMN     "installmentCount" INTEGER,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "totalPriceCents" INTEGER;

-- CreateTable
CREATE TABLE "DevelopmentReservationInstallment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "DevelopmentInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentReservationInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DevelopmentReservationInstallment_reservationId_idx" ON "DevelopmentReservationInstallment"("reservationId");

-- CreateIndex
CREATE INDEX "DevelopmentReservationInstallment_organizationId_status_idx" ON "DevelopmentReservationInstallment"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "DevelopmentReservationInstallment" ADD CONSTRAINT "DevelopmentReservationInstallment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "DevelopmentReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
