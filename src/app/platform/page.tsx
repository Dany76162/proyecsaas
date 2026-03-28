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
  const onboardingAccounts = orgs.filter(
    (o) => o.onboardingStatus === "Sin usuarios" || o.onboardingStatus === "Invitación pendiente"
  ).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Resumen General
        </h1>
        <p className="text-sm text-slate-500">
          Vista global de volumen, salud del motor automatizado y pipeline de clientes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Database className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wider">Cuentas Activas</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{orgs.length}</span>
            <span className="text-xs text-slate-500">total</span>
          </div>
        </div>
        
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wider">Mantenimiento</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight ${criticalCount > 0 ? "text-red-600" : "text-slate-900"}`}>
              {criticalCount + warningCount}
            </span>
            <span className="text-xs text-slate-500">requieren revisión</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <UserPlus className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wider">Tráfico Leads (7d)</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{totalLeads7d}</span>
            <span className="text-xs text-slate-500">capturados</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Activity className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wider">Fallas WABA (7d)</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight ${totalFailed7d > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {totalFailed7d}
            </span>
            <span className="text-xs text-slate-500">errores outbound</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Atencion Urgente */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b bg-slate-50 px-5 py-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Cuentas en Riesgo (Top 5)</h3>
            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Requiere Atención</span>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {riskAccounts.map(org => (
              <div key={org.id} className="flex items-center justify-between p-4 px-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Última msg: {org.lastActivityAt ? formatRelativeTime(org.lastActivityAt) : "Sin histórico"}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <HealthBadge status={org.health} />
                  <Link href={`/platform/organizations`} className="text-xs font-medium text-slate-500 hover:text-slate-800 transition">
                    Ver canal
                  </Link>
                </div>
              </div>
            ))}
            {riskAccounts.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                Todos los Tenants operan con normalidad verde.
              </div>
            )}
          </div>
          <div className="border-t bg-slate-50 p-3 text-center">
            <Link href="/platform/organizations" className="text-xs font-semibold text-slate-600 flex items-center justify-center gap-1 hover:text-slate-900 transition">
              Ver inventario completo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Onboarding Pipeline */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b bg-slate-50 px-5 py-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Pipeline de Onboarding</h3>
            <span className="rounded bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-700">Pendientes</span>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {onboardingAccounts.map(org => (
              <div key={org.id} className="flex items-center justify-between p-4 px-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {org.onboardingStatus}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/platform/organizations`} className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm">
                    Gestionar
                  </Link>
                </div>
              </div>
            ))}
            {onboardingAccounts.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No hay cuentas pendientes de alta inicial.
              </div>
            )}
          </div>
          <div className="border-t bg-slate-50 p-3 text-center">
            <Link href="/platform/onboarding" className="text-xs font-semibold text-slate-600 flex items-center justify-center gap-1 hover:text-slate-900 transition">
              Historial de invitaciones <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
