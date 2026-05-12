import { listAgentLogs } from "@/modules/agents/service";

export default async function PlatformAgentsLogsPage() {
  const logs = await listAgentLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Logs de AgentOS</h1>
        <p className="text-sm text-slate-500">Revisa el historial de ejecuciones y errores del MVP de agentes.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 text-xs uppercase tracking-[0.2em] text-slate-500">Ãšltimos eventos</div>
        <div className="divide-y divide-slate-200">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{log.level}</p>
                <p className="text-sm text-slate-600">{log.message}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>{new Date(log.timestamp).toLocaleString()}</div>
                {log.runId ? <div>Run: {log.runId}</div> : null}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">No hay logs disponibles.</div>
          )}
        </div>
      </div>
    </div>
  );
}
