import "server-only";

import { prisma } from "@/server/db/prisma";
import { DevelopmentInstallmentStatus } from "@prisma/client";

/**
 * F-7 — On-demand OVERDUE transition.
 *
 * Marks PENDING installments as OVERDUE when their dueDate is strictly before
 * the start of today (midnight UTC). Called on every GET reservation and on
 * every load of the private installment sheet (/ficha/[lotId]/cuotas).
 *
 * Rules:
 *  - Only touches PENDING installments.
 *  - Never touches PAID, OVERDUE, or CANCELLED installments.
 *  - Never changes lot status or reservation status.
 *  - Returns the number of rows updated.
 */
export async function markOverdueInstallments(
  reservationId: string,
): Promise<number> {
  // Start of today in UTC — any dueDate before this moment is considered past.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const result = await prisma.developmentReservationInstallment.updateMany({
    where: {
      reservationId,
      status: DevelopmentInstallmentStatus.PENDING,
      dueDate: { lt: todayStart },
    },
    data: {
      status: DevelopmentInstallmentStatus.OVERDUE,
    },
  });

  return result.count;
}
