"use client";

import { useState, useTransition } from "react";
import { UserPlus, CalendarCheck, MessageCircle, Bot, Loader2 } from "lucide-react";
import { getImpactMetrics, type ImpactMetrics, type ImpactPeriod } from "./analytics-actions";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

const PERIODS: { value: ImpactPeriod; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "Este mes" },
  { value: "365d", label: "Este año" },
];

function AgentBadge({ status }: { status: "ACTIVE" | "PAUSED" | "DRAFT" | null }) {
  if (!status) return <span className="text-xs text-slate-400">Sin agente</span>;
  if (status === "ACTIVE")
    return (
      <Badge variant="success">
        <span className="mr-1.5 h-1 w-1 rounded-full bg-emerald-500" />
        Activo
      </Badge>
    );
  if (status === "PAUSED")
    return (
      <Badge variant="warning">
        <span className="mr-1.5 h-1 w-1 rounded-full bg-amber-500" />
        Pausado
      </Badge>
    );
  return (
    <Badge variant="neutral">
      <span className="mr-1.5 h-1 w-1 rounded-full bg-slate-400" />
      Borrador
    </Badge>
  );
}

export default function ImpactSection({ initial }: { initial: ImpactMetrics }) {
  const [period, setPeriod] = useState<ImpactPeriod>("7d");
  const [data, setData] = useState<ImpactMetrics>(initial);
  const [showAll, setShowAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handlePeriod = (p: ImpactPeriod) => {
    if (p === period) return;
    setPeriod(p);
    startTransition(async () => {
      const result = await getImpactMetrics(p);
      setData(result);
    });
  };

  const displayedOrgs = showAll ? data.byOrg : data.byOrg.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Rendimiento del Sistema</h2>
          <p className="text-sm text-slate-500">
            Actividad real de cada inmobiliaria y estado de los agentes IA.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handlePeriod(p.value)}
              disabled={isPending}
              className={cn(
                "h-8 px-4 text-[10px]",
                period === p.value && "bg-white shadow-sm border border-slate-200"
              )}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 z-20 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}
        <MetricCard
          title="Leads"
          value={data.totals.leads}
          icon={UserPlus}
          variant="brand"
          description="capturados"
        />
        <MetricCard
          title="Visitas"
          value={data.totals.visits}
          icon={CalendarCheck}
          variant="emerald"
          description="concretadas"
        />
        <MetricCard
          title="Conversaciones"
          value={data.totals.conversations}
          icon={MessageCircle}
          variant="brand"
          description="iniciadas"
        />
      </div>

      {/* Per-org table */}
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader className="bg-slate-50/50 flex-row items-center gap-2 py-4">
          <Bot className="h-4 w-4 text-slate-400" />
          <CardTitle className="text-xs uppercase tracking-widest">Detalle por Inmobiliaria</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">Inmobiliaria</TableHead>
              <TableHead className="px-4 text-center">Leads</TableHead>
              <TableHead className="px-4 text-center">Visitas</TableHead>
              <TableHead className="px-4 text-center">Convs.</TableHead>
              <TableHead className="px-6">Agente IA</TableHead>
              <TableHead className="px-4">WhatsApp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedOrgs.map((row) => (
              <TableRow key={row.orgId}>
                <TableCell className="px-6 py-4 font-bold text-slate-800">{row.orgName}</TableCell>
                <TableCell className="px-4 py-4 text-center">
                  <span className={cn(
                    "font-bold",
                    row.leads > 0 ? "text-brand-600" : "text-slate-300"
                  )}>
                    {row.leads}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4 text-center">
                  <span className={cn(
                    "font-bold",
                    row.visits > 0 ? "text-emerald-600" : "text-slate-300"
                  )}>
                    {row.visits}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4 text-center">
                  <span className={cn(
                    "font-bold",
                    row.conversations > 0 ? "text-brand-600" : "text-slate-300"
                  )}>
                    {row.conversations}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <AgentBadge status={row.agentStatus} />
                    {row.agentName && (
                      <span className="text-[11px] font-medium text-slate-400">{row.agentName}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 text-xs text-slate-500 font-mono">
                  {row.whatsappPhone ?? "No configurado"}
                </TableCell>
              </TableRow>
            ))}
            {data.byOrg.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                  Sin organizaciones activas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {data.byOrg.length > 10 && (
          <div className="border-t bg-slate-50/50 px-6 py-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-xs font-bold text-slate-600 hover:text-brand-600"
            >
              {showAll ? "Mostrar menos" : `Ver todas las inmobiliarias (${data.byOrg.length})`}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
