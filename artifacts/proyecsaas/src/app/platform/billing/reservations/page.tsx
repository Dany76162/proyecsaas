export const dynamic = "force-dynamic";

import { prisma } from "@/server/db/prisma";
import { ReservationsTable } from "@/components/platform/reservations-table";

export default async function PlatformReservationsPage() {
  const reservations = await prisma.developmentReservation.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
    include: {
      Lead: {
        select: { id: true, fullName: true, email: true, phone: true },
      },
      DevelopmentLot: {
        select: {
          id: true,
          lotNumber: true,
          Development: {
            select: {
              id: true,
              name: true,
              Organization: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      },
    },
  });

  // KPIs
  const totalGross = reservations.reduce(
    (sum, r) => sum + (r.grossAmountCents ?? 0),
    0
  );
  const totalNet = reservations.reduce(
    (sum, r) => sum + (r.netAmountCents ?? 0),
    0
  );
  const pendingSettlement = reservations.filter(
    (r) => r.settlementStatus === "PENDING" || r.settlementStatus === "IN_REVIEW"
  );
  const settled = reservations.filter((r) => r.settlementStatus === "SETTLED");

  const kpis = {
    totalConfirmed: reservations.length,
    totalGrossCents: totalGross,
    totalNetCents: totalNet,
    pendingSettlementCount: pendingSettlement.length,
    settledCount: settled.length,
    pendingSettlementCents: pendingSettlement.reduce(
      (sum, r) => sum + (r.netAmountCents ?? 0),
      0
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Cobros de Reservas
        </h1>
        <p className="text-sm text-slate-500">
          Pagos de señas confirmados vía Mercado Pago. Registrá la liquidación
          manual a cada desarrolladora cuando correspondas.
        </p>
      </div>

      <ReservationsTable reservations={reservations as any} kpis={kpis} />
    </div>
  );
}
