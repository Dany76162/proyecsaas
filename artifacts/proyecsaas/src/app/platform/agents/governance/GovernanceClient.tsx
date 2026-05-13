"use client";

import { useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  AlertTriangle, 
  PauseCircle, 
  PlayCircle, 
  Settings2, 
  Activity,
  BarChart3,
  ShieldAlert,
  Info,
  CheckCircle2
} from "lucide-react";
import { updateGovernancePolicyAction } from "@/modules/agents/governance-actions";
import { AgentGovernanceOverview } from "@/modules/agents/governance-service";
import { AgentAutonomyLevel } from "@prisma/client";
import { cn } from "@/lib/utils";

export default function GovernanceClient({ initialOverview }: { initialOverview: AgentGovernanceOverview[] }) {
  const [overview, setOverview] = useState(initialOverview);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleTogglePause = async (agentId: string, currentPaused: boolean) => {
    setIsUpdating(agentId);
    try {
      await updateGovernancePolicyAction(agentId, { isPaused: !currentPaused });
      // Update local state for immediate feedback
      setOverview(prev => prev.map(a => 
        a.agentId === agentId ? { ...a, policy: { ...a.policy, isPaused: !currentPaused }, isBlocked: !currentPaused } : a
      ));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Gobernanza Operativa</h1>
            <p className="text-slate-500">Control de límites, autonomía y seguridad de AgentOS (Budget Guard).</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Agentes Auditados", value: overview.length, icon: ShieldCheck, color: "text-blue-600" },
          { label: "Alertas Activas", value: overview.filter(a => a.isNearLimit).length, icon: AlertTriangle, color: "text-amber-500" },
          { label: "Bloqueados/Pausados", value: overview.filter(a => a.isBlocked).length, icon: ShieldAlert, color: "text-red-500" },
          { label: "Nivel de Autonomía", value: "H-i-T-L", icon: Activity, color: "text-emerald-500" },
        ].map((stat, i) => (
          <AppCard key={i} className="border-slate-200">
            <div className="p-4 flex items-center gap-4">
              <div className={cn("p-2 rounded-lg bg-slate-50", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                <p className="text-xl font-black text-slate-900">{stat.value}</p>
              </div>
            </div>
          </AppCard>
        ))}
      </div>

      <div className="grid gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            Estado de Límites por Agente
          </h2>
          
          <div className="grid gap-6 lg:grid-cols-2">
            {overview.map((agent) => (
              <AppCard key={agent.agentId} className={cn(
                "overflow-hidden transition-all duration-300 border-slate-200",
                agent.isBlocked ? "border-red-200 bg-red-50/10" : "hover:border-slate-300"
              )}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm",
                        agent.isBlocked ? "bg-red-600 text-white" : "bg-slate-900 text-white"
                      )}>
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{agent.name}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {agent.policy.autonomyLevel}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant={agent.policy.isPaused ? "success" : "outline"}
                      size="sm"
                      onClick={() => handleTogglePause(agent.agentId, agent.policy.isPaused)}
                      disabled={isUpdating === agent.agentId}
                      className={cn(
                        "font-black uppercase tracking-widest text-[10px] h-8 px-4 rounded-lg",
                        agent.policy.isPaused ? "bg-emerald-600 hover:bg-emerald-700" : "text-red-600 hover:bg-red-50 border-red-100"
                      )}
                    >
                      {agent.policy.isPaused ? (
                        <><PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Reactivar</>
                      ) : (
                        <><PauseCircle className="h-3.5 w-3.5 mr-1.5" /> Pausar</>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-slate-400">Tareas Hoy</span>
                        <span className={agent.tasksToday >= (agent.policy.maxTasksPerDay || 0) ? "text-red-600" : "text-slate-600"}>
                          {agent.tasksToday} / {agent.policy.maxTasksPerDay || "∞"}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            agent.tasksToday >= (agent.policy.maxTasksPerDay || 0) ? "bg-red-500" : "bg-brand-500"
                          )}
                          style={{ width: `${Math.min(100, (agent.tasksToday / (agent.policy.maxTasksPerDay || 10)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-slate-400">Runs Hoy</span>
                        <span className={agent.runsToday >= (agent.policy.maxRunsPerDay || 0) ? "text-red-600" : "text-slate-600"}>
                          {agent.runsToday} / {agent.policy.maxRunsPerDay || "∞"}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            agent.runsToday >= (agent.policy.maxRunsPerDay || 0) ? "bg-red-500" : "bg-slate-700"
                          )}
                          style={{ width: `${Math.min(100, (agent.runsToday / (agent.policy.maxRunsPerDay || 50)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      agent.isBlocked ? "bg-red-500" : agent.isNearLimit ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {agent.isBlocked ? "Sistema Bloqueado" : agent.isNearLimit ? "Cerca del Límite" : "Operativo"}
                    </span>
                    <div className="ml-auto flex gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                         <Settings2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                </div>
              </AppCard>
            ))}
          </div>
        </div>

        <AppCard className="bg-slate-900 text-white overflow-hidden border-none shadow-2xl">
          <div className="p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="h-20 w-20 rounded-3xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-10 w-10 text-brand-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight mb-2">Filosofía de Gobernanza: Human-in-the-Loop</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                AgentOS no es una "caja negra". Cada acción está regulada por políticas de presupuesto y autonomía. 
                Los límites diarios evitan bucles infinitos y consumos inesperados de API, mientras que el nivel de 
                autonomía garantiza que ninguna publicación llegue a producción sin aprobación previa.
              </p>
            </div>
            <div className="ml-auto">
              <Button className="bg-white text-slate-950 hover:bg-slate-100 font-black uppercase tracking-widest text-xs px-6 h-12 rounded-2xl">
                Auditoría Global
              </Button>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
