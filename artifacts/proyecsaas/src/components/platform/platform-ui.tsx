import type { OrgHealthStatus, OrgPlatformSummary } from "@/modules/platform/types";

export function HealthBadge({ status }: { status: OrgHealthStatus }) {
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

export function WhatsAppStatus({ channel }: { channel: OrgPlatformSummary["whatsappChannel"] }) {
  if (!channel) {
    return <span className="text-sm text-slate-500">Sin canal</span>;
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
      <span className={`text-sm font-bold ${color}`}>{channel.status}</span>
      {channel.displayPhoneNumber && (
        <p className="text-sm text-slate-600 font-medium">{channel.displayPhoneNumber}</p>
      )}
      {channel.lastErrorCode && (
        <p className="text-sm text-red-600 font-bold">{channel.lastErrorCode}</p>
      )}
    </div>
  );
}

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return "—";
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}
