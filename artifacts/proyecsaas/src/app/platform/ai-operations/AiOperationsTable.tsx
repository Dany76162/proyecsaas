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

import { cn } from "@/lib/utils";
import { type TenantAiHealth } from "./actions";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

type TenantAiHealthStatus = TenantAiHealth["healthStatus"];

export function AiOperationsTable({ data }: { data: TenantAiHealth[] }) {
  const stats = useMemo(() => {
    return {
      total: data.length,
      upsell: data.filter((d) => d.healthStatus === "READY_UPSELL").length,
      atascados: data.filter((d) => d.healthStatus === "ATASCADO").length,
      incomplete: data.filter((d) => d.healthStatus === "ONBOARDING_INCOMPLETE").length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard icon={Building2} title="Total de clientes" value={stats.total} />
        <MetricCard
          icon={TrendingUp}
          title="Oportunidad comercial"
          value={stats.upsell}
          trend={{ value: "Venta", label: "comercial", type: "positive" }}
          variant="brand"
        />
        <MetricCard
          icon={AlertCircle}
          title="Derivaciones atascadas"
          value={stats.atascados}
          trend={{ value: "Atascado", label: "fricción", type: "negative" }}
        />
        <MetricCard
          icon={Clock}
          title="Configuración incompleta"
          value={stats.incomplete}
          trend={{ value: "Pendiente", label: "configuración", type: "neutral" }}
        />
      </div>

      <Card variant="elevated" className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">Inmobiliaria</TableHead>
              <TableHead className="text-center">Salud IA</TableHead>
              <TableHead className="text-center">Conexión</TableHead>
              <TableHead className="text-right">Tráfico (7d)</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Derivaciones</TableHead>
              <TableHead className="text-right px-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.orgId}>
                <TableCell className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{row.orgName}</span>
                    <span className="mt-0.5 text-xs text-slate-400">{row.planLabel}</span>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <HealthBadge status={row.healthStatus} />
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center" title={`WhatsApp: ${row.whatsappStatus}`}>
                      <MessageSquare
                        className={cn(
                          "h-4 w-4",
                          row.whatsappStatus === "ACTIVE"
                            ? "text-emerald-500"
                            : "text-slate-300",
                        )}
                      />
                    </div>
                    <div className="flex flex-col items-center" title={`Agente IA: ${row.aiStatus}`}>
                      <Bot
                        className={cn(
                          "h-4 w-4",
                          row.aiStatus === "ACTIVE"
                            ? "text-brand-500"
                            : "text-slate-300",
                        )}
                      />
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-slate-900">{row.metrics.inbounds}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">recibidos</span>
                  </div>
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  <Badge variant="success">
                    {row.metrics.leadsCaptados}
                  </Badge>
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  <Badge
                    variant={row.metrics.conversacionesDerivadas > 0 ? "warning" : "neutral"}
                  >
                    {row.metrics.conversacionesDerivadas}
                  </Badge>
                </TableCell>

                <TableCell className="text-right px-6">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/platform/organizations/${row.orgId}`}>
                      Revisar
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  No hay organizaciones para analizar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function HealthBadge({ status }: { status: TenantAiHealthStatus }) {
  switch (status) {
    case "HEALTHY":
      return (
        <Badge variant="success">
          <CheckCircle2 className="mr-1.5 h-3 w-3" />
          Operando
        </Badge>
      );

    case "READY_UPSELL":
      return (
        <Badge variant="brand">
          <TrendingUp className="mr-1.5 h-3 w-3" />
          Comercial
        </Badge>
      );

    case "ATASCADO":
      return (
        <Badge variant="danger">
          <AlertCircle className="mr-1.5 h-3 w-3" />
          Fricción
        </Badge>
      );

    case "ONBOARDING_INCOMPLETE":
      return (
        <Badge variant="warning">
          <Clock className="mr-1.5 h-3 w-3" />
          Config. incompleta
        </Badge>
      );

    case "ZERO_TRAFFIC":
      return (
        <Badge variant="neutral">
          <XCircle className="mr-1.5 h-3 w-3" />
          Sin tráfico
        </Badge>
      );

    default:
      return null;
  }
}
