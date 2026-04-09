export const dynamic = "force-dynamic";

import { prisma } from "@/server/db/prisma";
import { BillingTable } from "@/components/platform/billing-table";
import { listPlatformPlans } from "@/modules/platform/service";

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

  const totalPending = records
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + r.amountCents, 0);

  const totalPaid = records
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + r.amountCents, 0);

  const formatARS = (cents: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const mpConfigured = !!process.env.MERCADO_PAGO_ACCESS_TOKEN;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Comercial / Cobros</h1>
        <p className="text-sm text-slate-500">
          Registros de cobro por cliente. Generá links de pago vía Mercado Pago y gestioná el estado de factura.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Registros</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{records.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pendiente</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{formatARS(totalPending)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cobrado</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">{formatARS(totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Mercado Pago</p>
          <p className={`mt-2 text-sm font-bold ${mpConfigured ? "text-emerald-600" : "text-red-500"}`}>
            {mpConfigured ? "Configurado" : "Sin credenciales"}
          </p>
          {!mpConfigured && (
            <p className="mt-1 text-[10px] text-slate-400">Falta MERCADO_PAGO_ACCESS_TOKEN</p>
          )}
        </div>
      </div>

      {/* Interactive table + create */}
      <BillingTable records={records} activeOrgs={activeOrgs} plans={plans} />
    </div>
  );
}
