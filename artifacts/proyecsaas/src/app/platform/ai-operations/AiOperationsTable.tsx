"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  MessageSquare,
  Bot,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  XCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type TenantAiHealth } from "./actions";
import { cn } from "@/lib/utils";

type TenantAiHealthStatus = TenantAiHealth["healthStatus"];

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  trend?: "positive" | "negative" | "neutral";
};

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export function AiOperationsTable({ data }: { data: TenantAiHealth[] }) {
  const stats = useMemo(() => {
    return {
      total: data.length,
      upsell: data.filter((d) => d.healthStatus === "READY_UPSELL").length,
      atascados: data.filter((d) => d.healthStatus === "ATASCADO").length,
      incomplete: data.filter(
        (d) => d.healthStatus === "ONBOARDING_INCOMPLETE",
      ).length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon={Building2} label="Total Tenants" value={stats.total} />
        <StatCard
          icon={TrendingUp}
          label="Ready for Upsell"
          value={stats.upsell}
          trend="positive"
        />
        <StatCard
          icon={AlertCircle}
          label="Handoffs Atascados"
          value={stats.atascados}
          trend="negative"
        />
        <StatCard
          icon={Clock}
          label="Setup Incompleto"
          value={stats.incomplete}
          trend="neutral"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/5 bg-white/5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Inmobiliaria</th>
                <th className="px-6 py-4 text-center">Salud IA</th>
                <th className="px-6 py-4 text-center">Conexión</th>
                <th className="px-6 py-4 text-right">Tráfico (7d)</th>
                <th className="px-6 py-4 text-right">Leads</th>
                <th className="px-6 py-4 text-right">Handoffs</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((row) => (
                <tr
                  key={row.orgId}
                  className="transition-colors hover:bg-white/5"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">
                        {row.orgName}
                      </span>
                      <span className="mt-0.5 text-xs text-slate-500">
                        {row.planLabel}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <HealthBadge status={row.healthStatus} />
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <div
                        className="flex flex-col items-center"
                        title={`WhatsApp: ${row.whatsappStatus}`}
                      >
                        <MessageSquare
                          className={cn(
                            "h-4 w-4",
                            row.whatsappStatus === "ACTIVE"
                              ? "text-emerald-400"
                              : "text-slate-600",
                          )}
                        />
                      </div>
                      <div
                        className="flex flex-col items-center"
                        title={`IA Agent: ${row.aiStatus}`}
                      >
                        <Bot
                          className={cn(
                            "h-4 w-4",
                            row.aiStatus === "ACTIVE"
                              ? "text-violet-400"
                              : "text-slate-600",
                          )}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right tabular-nums">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-white">
                        {row.metrics.inbounds}
                      </span>
                      <span className="text-xs text-slate-500">recibidos</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right tabular-nums">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-400">
                      {row.metrics.leadsCaptados}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right tabular-nums">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                        row.metrics.conversacionesDerivadas > 0
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-white/5 text-slate-400",
                      )}
                    >
                      {row.metrics.conversacionesDerivadas}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/platform/organizations/${row.orgId}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
                    >
                      Audit
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}

              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No hay organizaciones para analizar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            trend === "positive" && "bg-emerald-500/20 text-emerald-400",
            trend === "negative" && "bg-rose-500/20 text-rose-400",
            trend === "neutral" && "bg-amber-500/20 text-amber-400",
            !trend && "bg-slate-800 text-slate-400",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function HealthBadge({ status }: { status: TenantAiHealthStatus }) {
  switch (status) {
    case "HEALTHY":
      return (
        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="mr-1.5 h-3 w-3" />
          Operando
        </Badge>
      );

    case "READY_UPSELL":
      return (
        <Badge className="animate-pulse border-violet-500/20 bg-violet-500/10 text-violet-400">
          <TrendingUp className="mr-1.5 h-3 w-3" />
          Up-sell
        </Badge>
      );

    case "ATASCADO":
      return (
        <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-400">
          <AlertCircle className="mr-1.5 h-3 w-3" />
          Fricción
        </Badge>
      );

    case "ONBOARDING_INCOMPLETE":
      return (
        <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400">
          <Clock className="mr-1.5 h-3 w-3" />
          Setup inc.
        </Badge>
      );

    case "ZERO_TRAFFIC":
      return (
        <Badge className="border-slate-500/20 bg-slate-500/10 text-slate-400">
          <XCircle className="mr-1.5 h-3 w-3" />
          Sin tráfico
        </Badge>
      );

    default:
      return null;
  }
}

function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  );
}