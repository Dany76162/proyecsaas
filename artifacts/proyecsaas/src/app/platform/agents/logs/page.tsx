import { listAgentLogs } from "@/modules/agents/service";
import { AgentLogLevel } from "@prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AlertCircle, Info, AlertTriangle, Clock, Terminal } from "lucide-react";
import LogExportButton from "./LogExportButton";

const LEVEL_CONFIG: Record<AgentLogLevel, { label: string; className: string; icon: any }> = {
  INFO: { label: "Info", className: "text-blue-600 bg-blue-50 border-blue-100", icon: Info },
  WARN: { label: "Advertencia", className: "text-amber-600 bg-amber-50 border-amber-100", icon: AlertTriangle },
  ERROR: { label: "Error", className: "text-red-600 bg-red-50 border-red-100", icon: AlertCircle },
};

export default async function PlatformAgentsLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ level?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const currentLevel = resolvedParams.level as AgentLogLevel | undefined;
  
  const logs = await listAgentLogs(
    resolvedParams.level === "ALL" ? undefined : currentLevel
  );

  const filters = [
    { label: "Todos", value: "ALL" },
    { label: "Info", value: AgentLogLevel.INFO },
    { label: "Advertencias", value: AgentLogLevel.WARN },
    { label: "Error", value: AgentLogLevel.ERROR },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-slate-400">
           <Terminal className="h-5 w-5" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bitácora de Auditoría</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase">Logs Operativos</h1>
        <p className="text-sm font-medium text-slate-500">Historial técnico de ejecuciones, decisiones y eventos de AgentOS.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1.5 w-fit">
          {filters.map((filter) => {
            const isActive = resolvedParams.level === filter.value || (!resolvedParams.level && filter.value === "ALL");
            return (
              <Link
                key={filter.value}
                href={`/platform/agents/logs?level=${filter.value}`}
                className={cn(
                  "rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all",
                  isActive 
                    ? "bg-white text-slate-900 shadow-sm shadow-slate-200" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        <LogExportButton />
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {logs.map((log) => {
            const config = LEVEL_CONFIG[log.level];
            const Icon = config.icon;
            return (
              <div key={log.id} className="group flex flex-col gap-4 px-8 py-6 sm:flex-row sm:items-start sm:justify-between hover:bg-slate-50/30 transition-all">
                <div className="flex gap-4">
                  <div className={cn("mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border", config.className)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-black uppercase tracking-wider", config.className.split(' ')[0])}>
                        {config.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300">•</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 leading-relaxed">{log.message}</p>
                    {log.run && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          <span className="uppercase tracking-widest text-slate-300">Agente:</span>
                          <span className="text-slate-600">{log.run.agent?.name ?? "IA"}</span>
                        </div>
                        {log.run.task && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <span className="uppercase tracking-widest text-slate-300">Tarea:</span>
                            <span className="text-slate-600">{log.run.task.title}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-slate-400 sm:pt-1">
                   <Clock className="h-3 w-3 opacity-50" />
                   {new Date(log.timestamp).toLocaleDateString()}
                </div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="rounded-full bg-slate-50 p-4">
                <Terminal className="h-8 w-8 text-slate-200" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">No hay eventos registrados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
