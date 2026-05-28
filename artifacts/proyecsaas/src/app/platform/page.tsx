export const dynamic = "force-dynamic";

import Link from "next/link";
import { AlertTriangle, UserPlus, Activity, Database, ArrowRight } from "lucide-react";

import { listOrganizationsForPlatform, getWorkerHeartbeatStatus } from "@/modules/platform/service";
import { HealthBadge, formatRelativeTime } from "@/components/platform/platform-ui";
import { getImpactMetrics, type ImpactMetrics } from "./analytics-actions";
import ImpactSection from "./ImpactSection";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/layout-ui";
import { cn } from "@/lib/utils";

const emptyImpactMetrics: ImpactMetrics = {
  totals: { leads: 0, visits: 0, conversations: 0 },
  byOrg: [],
};

function logPlatformDataError(source: string, reason: unknown) {
  console.error(`[platform] ${source} failed while rendering /platform`, reason);
}

function formatSecondsToHuman(seconds: number | null): string {
  if (seconds === null) return "Sin señal de vida registrada";
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

export default async function PlatformPage() {
  const [orgsResult, workerStatusResult, impactMetricsResult] = await Promise.allSettled([
    listOrganizationsForPlatform(),
    getWorkerHeartbeatStatus(),
    getImpactMetrics("7d"),
  ]);

  if (orgsResult.status === "rejected") {
    logPlatformDataError("listOrganizationsForPlatform", orgsResult.reason);
  }

  if (workerStatusResult.status === "rejected") {
    logPlatformDataError("getWorkerHeartbeatStatus", workerStatusResult.reason);
  }

  if (impactMetricsResult.status === "rejected") {
    logPlatformDataError("getImpactMetrics", impactMetricsResult.reason);
  }

  const orgs = orgsResult.status === "fulfilled" ? orgsResult.value : [];
  const workerStatus =
    workerStatusResult.status === "fulfilled"
      ? workerStatusResult.value
      : { status: "down" as const, lastSeenAt: null, secondsAgo: null };
  const impactMetrics =
    impactMetricsResult.status === "fulfilled" ? impactMetricsResult.value : emptyImpactMetrics;

  const activeOrgs = orgs.filter((org) => !org.isTrashed);
  const activeBillingCount = activeOrgs.filter(
    (o) => o.isActive && o.commercialAccess === "allowed",
  ).length;

  const criticalCount = activeOrgs.filter((o) => o.health === "critical").length;
  const warningCount = activeOrgs.filter((o) => o.health === "warning").length;
  const totalLeads7d = activeOrgs.reduce((sum, o) => sum + o.recentLeadCount, 0);
  const totalFailed7d = activeOrgs.reduce((sum, o) => sum + o.recentFailedDeliveries, 0);

  const riskAccounts = activeOrgs.filter((o) => o.health !== "ok").slice(0, 5);
  const onboardingAccounts = activeOrgs
    .filter(
      (o) =>
        o.onboardingStatus === "Sin usuarios" || o.onboardingStatus === "Invitación pendiente",
    )
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="Resumen General" 
        description="Vista global de volumen, salud del motor automatizado y embudo de clientes."
      />

      {/* Worker status chip */}
      <div className="flex items-center gap-3">
        <Badge 
          variant={workerStatus.status === "ok" ? "success" : workerStatus.status === "stale" ? "warning" : "danger"}
          className="flex items-center gap-1.5 py-1"
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              workerStatus.status === "ok" ? "bg-emerald-500" : workerStatus.status === "stale" ? "bg-amber-500" : "bg-red-500"
            )}
          />
          {workerStatus.status === "ok" ? "Servicio automático activo" : workerStatus.status === "stale" ? "Servicio automático demorado" : "Servicio automático detenido"}
        </Badge>
        <span className="text-[11px] font-medium text-slate-400">
          {formatSecondsToHuman(workerStatus.secondsAgo)}
        </span>
      </div>

      {/* KPIs — más grandes, más presencia */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Cuentas Activas"
          value={activeBillingCount}
          icon={Database}
          description="comercial real"
        />
        <MetricCard
          title="Mantenimiento"
          value={criticalCount + warningCount}
          icon={AlertTriangle}
          description="requieren revisión"
        />
        <MetricCard
          title="Tráfico Leads (7d)"
          value={totalLeads7d}
          icon={UserPlus}
          variant="brand"
          description="capturados"
        />
        <MetricCard
          title="Fallas WABA (7d)"
          value={totalFailed7d}
          icon={Activity}
          variant={totalFailed7d > 0 ? "default" : "emerald"}
          description="errores outbound"
        />
      </div>

      {/* Widgets secundarios */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cuentas en Riesgo */}
        <Card variant="elevated" className="flex flex-col">
          <CardHeader className="bg-slate-50/50 flex-row items-center justify-between py-4 px-6">
            <CardTitle className="text-base">Cuentas en Riesgo</CardTitle>
            <Badge variant="danger">Requiere Atención</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 flex-1 p-0">
            {riskAccounts.map((org) => (
              <div key={org.id} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{org.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Última msg:{" "}
                    {org.lastActivityAt ? formatRelativeTime(org.lastActivityAt) : "Sin histórico"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <HealthBadge status={org.health} />
                  <Link
                    href={`/platform/organizations?search=${org.slug}`}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-brand-600 transition"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            ))}
            {riskAccounts.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                Todos los tenants operan con normalidad.
              </div>
            )}
          </CardContent>
          <div className="border-t bg-slate-50/50 px-6 py-3">
            <Link
              href="/platform/organizations"
              className="text-xs font-bold text-slate-600 flex items-center gap-1.5 hover:text-brand-600 transition"
            >
              Ver inventario completo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Seguimiento de Altas */}
        <Card variant="elevated" className="flex flex-col">
          <CardHeader className="bg-slate-50/50 flex-row items-center justify-between py-4 px-6">
            <CardTitle className="text-base">Seguimiento de Altas</CardTitle>
            <Badge variant="info">Pendientes</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 flex-1 p-0">
            {onboardingAccounts.map((org) => (
              <div key={org.id} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{org.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{org.onboardingStatus}</p>
                </div>
                <div className="shrink-0">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/platform/organizations?search=${org.slug}`}>Gestionar</Link>
                  </Button>
                </div>
              </div>
            ))}
            {onboardingAccounts.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No hay cuentas pendientes de alta inicial.
              </div>
            )}
          </CardContent>
          <div className="border-t bg-slate-50/50 px-6 py-3">
            <Link
              href="/platform/onboarding"
              className="text-xs font-bold text-slate-600 flex items-center gap-1.5 hover:text-brand-600 transition"
            >
              Historial de invitaciones <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Rendimiento del Sistema */}
      <ImpactSection initial={impactMetrics} />
    </div>
  );
}
