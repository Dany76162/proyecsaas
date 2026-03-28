export const dynamic = "force-dynamic";

import Link from "next/link";

import { listOrganizationsForPlatform } from "@/modules/platform/service";
import type { OrgHealthStatus, OrgPlatformSummary } from "@/modules/platform/types";

function HealthBadge({ status }: { status: OrgHealthStatus }) {
  if (status === "critical") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Crítico
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Advertencia
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      OK
    </span>
  );
}

function WhatsAppStatus({ channel }: { channel: OrgPlatformSummary["whatsappChannel"] }) {
  if (!channel) {
    return <span className="text-xs text-slate-400">Sin canal</span>;
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "text-emerald-600",
    INACTIVE: "text-slate-400",
    DISCONNECTED: "text-amber-600",
    ERROR: "text-red-600",
  };

  const color = statusColors[channel.status] ?? "text-slate-500";

  return (
    <div>
      <span className={`text-xs font-semibold ${color}`}>{channel.status}</span>
      {channel.displayPhoneNumber && (
        <p className="text-xs text-slate-500">{channel.displayPhoneNumber}</p>
      )}
      {channel.lastErrorCode && (
        <p className="text-xs text-red-500">{channel.lastErrorCode}</p>
      )}
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export default async function PlatformPage() {
  const orgs = await listOrganizationsForPlatform();

  const criticalCount = orgs.filter((o) => o.health === "critical").length;
  const warningCount = orgs.filter((o) => o.health === "warning").length;
  const totalLeads7d = orgs.reduce((sum, o) => sum + o.recentLeadCount, 0);
  const totalFailed7d = orgs.reduce((sum, o) => sum + o.recentFailedDeliveries, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Control de Plataforma
        </h1>
        <p className="text-sm text-slate-500">
          Supervisión global de tenants, actividad operativa y estado de conexiones activas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cuentas Activas
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-slate-950">{orgs.length}</span>
            <span className="text-sm text-slate-500">total</span>
          </div>
        </div>
        
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Alertas de Salud
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-semibold ${criticalCount > 0 ? "text-red-600" : "text-slate-950"}`}>
              {criticalCount + warningCount}
            </span>
            <span className="text-sm text-slate-500">requieren revisión</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tráfico Leads (7d)
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-slate-950">{totalLeads7d}</span>
            <span className="text-sm text-slate-500">procesados</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Fallas Delivery (7d)
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-semibold ${totalFailed7d > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {totalFailed7d}
            </span>
            <span className="text-sm text-slate-500">errores de WABA</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Inmobiliaria</th>
              <th className="px-5 py-3">Modelo Comercial</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">WhatsApp</th>
              <th className="px-5 py-3">Leads (7d)</th>
              <th className="px-5 py-3">Pendientes</th>
              <th className="px-5 py-3">Errores (7d)</th>
              <th className="px-5 py-3">Última actividad</th>
              <th className="px-5 py-3">Miembros</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orgs.map((org) => (
              <tr
                key={org.id}
                className={`transition hover:bg-slate-50 ${!org.isActive ? "opacity-50" : ""}`}
              >
                <td className="px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-950">{org.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{org.city}</p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    Pendiente definir
                  </span>
                </td>
                <td className="px-5 py-4">
                  <HealthBadge status={org.health} />
                </td>
                <td className="px-5 py-4">
                  <WhatsAppStatus channel={org.whatsappChannel} />
                </td>
                <td className="px-5 py-4">
                  <span className={org.recentLeadCount > 0 ? "font-semibold text-slate-900" : "text-slate-400"}>
                    {org.recentLeadCount}
                  </span>
                  <span className="ml-1 text-xs text-slate-400">/ {org.leadCount} total</span>
                </td>
                <td className="px-5 py-4">
                  <span className={org.pendingFollowUpCount > 0 ? "font-semibold text-amber-700" : "text-slate-400"}>
                    {org.pendingFollowUpCount}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={org.recentFailedDeliveries > 0 ? "font-semibold text-red-600" : "text-slate-400"}>
                    {org.recentFailedDeliveries}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-slate-500">
                  {org.lastActivityAt ? formatRelativeTime(org.lastActivityAt) : "—"}
                </td>
                <td className="px-5 py-4 text-slate-500">{org.memberCount}</td>
                <td className="px-5 py-4">
                  <Link
                    href={`/${org.slug}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    Entrar
                  </Link>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-400">
                  No hay inmobiliarias registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
