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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Inmobiliarias activas</h1>
        <p className="mt-1 text-sm text-slate-500">
          {orgs.length} en total
          {criticalCount > 0 && (
            <span className="ml-2 font-medium text-red-600">{criticalCount} con error crítico</span>
          )}
          {warningCount > 0 && (
            <span className="ml-2 font-medium text-amber-600">{warningCount} con advertencia</span>
          )}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Inmobiliaria</th>
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
                    <p className="font-medium text-slate-900">{org.name}</p>
                    <p className="text-xs text-slate-400">
                      {org.city} · {org.planLabel}
                    </p>
                  </div>
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
