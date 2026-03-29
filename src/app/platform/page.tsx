export const dynamic = "force-dynamic";

import Link from "next/link";
import { AlertTriangle, UserPlus, Activity, Database, ArrowRight } from "lucide-react";

import { listOrganizationsForPlatform } from "@/modules/platform/service";
import { HealthBadge, formatRelativeTime } from "@/components/platform/platform-ui";

export default async function PlatformPage() {
  const orgs = await listOrganizationsForPlatform();

  const criticalCount = orgs.filter((o) => o.health === "critical").length;
  const warningCount = orgs.filter((o) => o.health === "warning").length;
  const totalLeads7d = orgs.reduce((sum, o) => sum + o.recentLeadCount, 0);
  const totalFailed7d = orgs.reduce((sum, o) => sum + o.recentFailedDeliveries, 0);

  const riskAccounts = orgs.filter((o) => o.health !== "ok").slice(0, 5);
  const onboardingAccounts = orgs
    .filter(
      (o) =>
        o.onboardingStatus === "Sin usuarios" || o.onboardingStatus === "Invitación pendiente",
    )
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Resumen General</h1>
        <p className="text-sm text-slate-500">
          Vista global de volumen, salud del motor automatizado y pipeline de clientes.
        </p>
      </div>

      {/* KPIs — más grandes, más presencia */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Database className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-wider">Cuentas Activas</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
              {orgs.length}
            </span>
            <span className="text-sm text-slate-400">total</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-wider">Mantenimiento</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-4xl font-extrabold tracking-tight ${
                criticalCount > 0 ? "text-red-600" : "text-slate-900"
              }`}
            >
              {criticalCount + warningCount}
            </span>
            <span className="text-sm text-slate-400">requieren revisión</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <UserPlus className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-wider">Tráfico Leads (7d)</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
              {totalLeads7d}
            </span>
            <span className="text-sm text-slate-400">capturados</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Activity className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-wider">Fallas WABA (7d)</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-4xl font-extrabold tracking-tight ${
                totalFailed7d > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {totalFailed7d}
            </span>
            <span className="text-sm text-slate-400">errores outbound</span>
          </div>
        </div>
      </div>

      {/* Widgets secundarios */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Cuentas en Riesgo */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b bg-slate-50 px-6 py-5 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Cuentas en Riesgo</h3>
            <span className="rounded-full bg-red-100 px-3 py-0.5 text-xs font-bold text-red-700">
              Requiere Atención
            </span>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {riskAccounts.map((org) => (
              <div key={org.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Última msg:{" "}
                    {org.lastActivityAt ? formatRelativeTime(org.lastActivityAt) : "Sin histórico"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <HealthBadge status={org.health} />
                  <Link
                    href="/platform/organizations"
                    className="text-xs font-medium text-slate-400 hover:text-slate-800 transition"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            ))}
            {riskAccounts.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                Todos los tenants operan con normalidad.
              </div>
            )}
          </div>
          <div className="border-t bg-slate-50 px-6 py-3">
            <Link
              href="/platform/organizations"
              className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 hover:text-slate-900 transition"
            >
              Ver inventario completo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Onboarding Pipeline */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b bg-slate-50 px-6 py-5 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Pipeline de Onboarding</h3>
            <span className="rounded-full bg-cyan-100 px-3 py-0.5 text-xs font-bold text-cyan-700">
              Pendientes
            </span>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {onboardingAccounts.map((org) => (
              <div key={org.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{org.onboardingStatus}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/platform/organizations"
                    className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                  >
                    Gestionar
                  </Link>
                </div>
              </div>
            ))}
            {onboardingAccounts.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                No hay cuentas pendientes de alta inicial.
              </div>
            )}
          </div>
          <div className="border-t bg-slate-50 px-6 py-3">
            <Link
              href="/platform/onboarding"
              className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 hover:text-slate-900 transition"
            >
              Historial de invitaciones <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
