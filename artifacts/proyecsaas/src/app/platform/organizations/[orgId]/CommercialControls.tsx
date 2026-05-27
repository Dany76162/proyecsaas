"use client";

import { useState, useTransition } from "react";
import { 
  registerPaymentAction, 
  grantLifetimeAction, 
  toggleAiStatusAction, 
  updateCommercialConfigAction,
  OrgAuditData 
} from "./actions";
import { 
  Banknote, 
  ShieldCheck, 
  Bot, 
  Settings, 
  Loader2, 
  PlusCircle, 
  Sparkles, 
  Edit3, 
  X, 
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CommercialControls({ 
  orgId, 
  initialData 
}: { 
  orgId: string; 
  initialData: {
    status: string;
    planCode: string | null;
    paidCycles: number;
    aiStatus: string;
    aiMonthlyConversationLimit: number;
    aiMonthlyConversationsUsed: number;
    lifetimeGrantedAt: Date | null;
    planLabel: string | null;
  }
}) {
  const [isPending, startTransition] = useTransition();
  const [showEditModal, setShowEditModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states for customization
  const [planCode, setPlanCode] = useState<string>(initialData.planCode || "FOUNDER");
  const [planLabel, setPlanLabel] = useState<string>(initialData.planLabel || "");
  const [status, setStatus] = useState<string>(initialData.status);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(initialData.aiMonthlyConversationLimit);
  const [conversationsUsed, setConversationsUsed] = useState<number>(initialData.aiMonthlyConversationsUsed);
  const [paidCycles, setPaidCycles] = useState<number>(initialData.paidCycles);

  const handleRegisterPayment = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await registerPaymentAction(orgId);
      } catch (err: any) {
        setErrorMsg(err.message || "Error al registrar el pago");
      }
    });
  };

  const handleGrantLifetime = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await grantLifetimeAction(orgId);
      } catch (err: any) {
        setErrorMsg(err.message || "Error al otorgar la licencia vitalicia");
      }
    });
  };

  const handleToggleAiStatus = (newStatus: "ACTIVE" | "PAUSED" | "DISABLED") => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await toggleAiStatusAction(orgId, newStatus);
      } catch (err: any) {
        setErrorMsg(err.message || "Error al cambiar estado de IA");
      }
    });
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateCommercialConfigAction(orgId, {
          planCode: planCode === "null" ? null : planCode,
          planLabel: planLabel || undefined,
          status: status as any,
          monthlyLimit: Number(monthlyLimit),
          conversationsUsed: Number(conversationsUsed),
          paidCycles: Number(paidCycles)
        });
        setShowEditModal(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Error al guardar la configuración");
      }
    });
  };

  const isLifetimeEligible = initialData.paidCycles >= 12 && !initialData.lifetimeGrantedAt;

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 items-center text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Rápido Acceso a Operaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Registrar Pago */}
        <Card className="bg-slate-900 border border-white/5 p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
              <Banknote className="w-4 h-4 text-emerald-400" />
              Registrar Ciclo de Pago
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Registra el pago mensual de SaaS. Incrementa en +1 los ciclos mensuales hacia Lifetime.
            </p>
          </div>
          <Button 
            onClick={handleRegisterPayment} 
            disabled={isPending || !!initialData.lifetimeGrantedAt}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2 rounded-lg"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <PlusCircle className="w-4 h-4 mr-1" />}
            Registrar Pago Mensual
          </Button>
        </Card>

        {/* Otorgar Lifetime */}
        <Card className="bg-slate-900 border border-white/5 p-5 flex flex-col justify-between relative overflow-hidden">
          {isLifetimeEligible && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/15 rounded-full blur-xl pointer-events-none"></div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Otorgar Licencia Vitalicia
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Habilita de forma manual y permanente el CRM e Inmuebles. Requiere 12 meses pagos.
            </p>
          </div>
          {initialData.lifetimeGrantedAt ? (
            <div className="w-full bg-slate-800/80 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1 py-2 text-xs font-bold rounded-lg uppercase tracking-wider">
              <CheckCircle className="w-4 h-4" /> Lifetime Concedida
            </div>
          ) : (
            <Button 
              onClick={handleGrantLifetime} 
              disabled={isPending}
              className={`w-full text-xs py-2 font-medium rounded-lg ${
                isLifetimeEligible 
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-amber-400 animate-pulse" 
                  : "bg-slate-800 hover:bg-slate-700 text-slate-400"
              }`}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {isLifetimeEligible ? "Confirmar Lifetime Ahora" : "Otorgar Lifetime"}
            </Button>
          )}
        </Card>

        {/* Alternar IA */}
        <Card className="bg-slate-900 border border-white/5 p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-violet-400" />
              Control de AgentOS IA
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Pausa el bot de forma aislada sin afectar el CRM. Ideal por falta de saldo o límites.
            </p>
          </div>
          <div className="flex gap-2">
            {initialData.aiStatus === "ACTIVE" ? (
              <Button 
                onClick={() => handleToggleAiStatus("PAUSED")} 
                disabled={isPending}
                className="w-full bg-rose-900/60 hover:bg-rose-900/80 text-rose-200 text-xs font-medium py-2 rounded-lg border border-rose-500/20"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Pausar Agente IA
              </Button>
            ) : (
              <Button 
                onClick={() => handleToggleAiStatus("ACTIVE")} 
                disabled={isPending}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium py-2 rounded-lg"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Reactivar Agente IA
              </Button>
            )}
          </div>
        </Card>

        {/* Configuración Manual */}
        <Card className="bg-slate-900 border border-white/5 p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-blue-400" />
              Ajustes Comerciales
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Edita de forma manual el plan asignado, límites de consumo de IA y cuotas de pago.
            </p>
          </div>
          <Button 
            onClick={() => setShowEditModal(true)} 
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 rounded-lg"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Editar Configuración
          </Button>
        </Card>
      </div>

      {/* Modal / Dialogo de Edición Manual */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="bg-slate-900 border border-white/10 w-full max-w-lg p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                Ajustes Comerciales del Cliente
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Plan Asignado</label>
                  <select 
                    value={planCode} 
                    onChange={(e) => setPlanCode(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="FOUNDER">Plan Fundador</option>
                    <option value="BASE">Plan Base futuro</option>
                    <option value="PRO">Plan Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                    <option value="CUSTOM">Customizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Monto Mensual (ARS)</label>
                  <input 
                    type="text" 
                    value={planLabel} 
                    onChange={(e) => setPlanLabel(e.target.value)}
                    placeholder="Ej: $65.000 + impuestos"
                    className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Estado CRM (Suscripción)</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="TRIALING">Trial (Prueba)</option>
                    <option value="ACTIVE">Activo</option>
                    <option value="PAST_DUE">Impago (Past Due)</option>
                    <option value="SUSPENDED">Suspendido</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Ciclos Pagados (0 a 12)</label>
                  <input 
                    type="number" 
                    min={0}
                    max={12}
                    value={paidCycles} 
                    onChange={(e) => setPaidCycles(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Límite Conversaciones IA</label>
                  <input 
                    type="number" 
                    min={0}
                    value={monthlyLimit} 
                    onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Conversaciones Usadas</label>
                  <input 
                    type="number" 
                    min={0}
                    value={conversationsUsed} 
                    onChange={(e) => setConversationsUsed(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-white/10 pt-4 mt-6">
                <Button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs py-2 px-4 rounded-lg"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1"
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Guardar Ajustes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
