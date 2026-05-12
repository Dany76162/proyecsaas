export const dynamic = "force-dynamic";

import { prisma } from "@/server/db/prisma";
import { BillingTable } from "@/components/platform/billing-table";
import { listPlatformPlans } from "@/modules/platform/service";
import { Badge } from "@/components/ui/badge";

export default async function PlatformBillingPage() {
  const [records, activeOrgs, plans] = await Promise.all([
    prisma.orgBillingRecord.findMany({
      orderBy: { createdAt: "desc" },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    listPlatformPlans(),
  ]);

  const now = new Date();
  
  const totalPending = records
    .filter((r) => r.status === "PENDING" || r.status === "OVERDUE")
    .reduce((sum, r) => sum + r.amountCents, 0);

  const totalPaid = records
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + r.amountCents, 0);
  
  const totalOverdue = records
    .filter((r) => r.status !== "PAID" && r.dueDate && r.dueDate < now)
    .reduce((sum, r) => sum + r.amountCents, 0);

  const formatARS = (cents: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const mpConfigured = !!process.env.MERCADO_PAGO_ACCESS_TOKEN;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Comercial Pro</h1>
          <Badge variant="brand" className="text-[10px] h-5">Enterprise</Badge>
        </div>
        <p className="text-sm text-slate-500">
          Gestión centralizada de cobros, balances y cobranza asistida por IA para RaicesPilot.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Cobrado</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">{formatARS(totalPaid)}</p>
          <p className="mt-1 text-[10px] text-slate-400">Histórico acumulado</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pendiente Total</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{formatARS(totalPending)}</p>
          <p className="mt-1 text-[10px] text-slate-400">Cobros activos</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vencido Crítico</p>
          <p className="mt-2 text-3xl font-extrabold text-red-500">{formatARS(totalOverdue)}</p>
          <p className="mt-1 text-[10px] text-slate-400">Acción requerida</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tasa de Cobro</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {totalPaid + totalPending > 0 ? Math.round((totalPaid / (totalPaid + totalPending)) * 100) : 0}%
          </p>
          <p className="mt-1 text-[10px] text-slate-400">Eficiencia mensual</p>
        </div>
      </div>

      {/* Interactive table + create */}
      <BillingTable records={records} activeOrgs={activeOrgs} plans={plans} />
    </div>
  );
}
