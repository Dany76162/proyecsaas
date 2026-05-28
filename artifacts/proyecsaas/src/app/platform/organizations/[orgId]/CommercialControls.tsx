"use client";

import { useState, useTransition } from "react";
import { 
  registerPaymentAction, 
  grantLifetimeAction, 
  toggleAiStatusAction, 
  updateCommercialConfigAction
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
  const [showConfirmAiReactivate, setShowConfirmAiReactivate] = useState(false);

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
    if (
      newStatus === "ACTIVE" &&
      initialData.aiMonthlyConversationsUsed >= initialData.aiMonthlyConversationLimit
    ) {
      setShowConfirmAiReactivate(true);
      return;
    }
    executeToggleAiStatus(newStatus);
  };

  const executeToggleAiStatus = (newStatus: "ACTIVE" | "PAUSED" | "DISABLED") => {
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
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 items-center text-rose-800 text-sm font-semibold">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {showConfirmAiReactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Reactivar Inteligencia Artificial</h2>
                <p className="text-xs text-slate-500">Aviso de límite de cuota</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Este cliente ya superó su límite mensual de conversaciones ({initialData.aiMonthlyConversationsUsed}/{initialData.aiMonthlyConversationLimit}).
              </p>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Si reactivás la IA sin aumentar el límite de plan o reiniciar los consumos desde el panel de ajustes, la automatización puede volver a pausar el bot de forma automática de inmediato al procesar un nuevo mensaje.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmAiReactivate(false)}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowConfirmAiReactivate(false);
                  executeToggleAiStatus("ACTIVE");
                }}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-sm shadow-emerald-500/20"
              >
                {isPending ? "Reactivando..." : "Sí, reactivar IA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rápido Acceso a Operaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Registrar Pago */}
        <Card className="bg-white border border-slate-200/60 p-5 flex flex-col justify-between shadow-sm rounded-2xl">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              Registrar Ciclo de Pago
            </h4>
            <p className="text-xs text-slate-500 mb-4 font-semibold leading-relaxed">
              Registra el pago mensual de SaaS. Incrementa en +1 los ciclos mensuales hacia el Lifetime.
            </p>
          </div>
          <Button 
            onClick={handleRegisterPayment} 
            disabled={isPending || !!initialData.lifetimeGrantedAt}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 h-9 rounded-xl shadow-sm"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <PlusCircle className="w-4 h-4 mr-1" />}
            Registrar Pago Mensual
          </Button>
        </Card>

        {/* Otorgar Lifetime */}
        <Card className="bg-white border border-slate-200/60 p-5 flex flex-col justify-between relative overflow-hidden shadow-sm rounded-2xl">
          {isLifetimeEligible && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
          )}
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              Otorgar Licencia Vitalicia
            </h4>
            <p className="text-xs text-slate-500 mb-4 font-semibold leading-relaxed">
              Habilita de forma manual y permanente el CRM e Inmuebles. Requiere 12 meses pagos.
            </p>
          </div>
          {initialData.lifetimeGrantedAt ? (
            <div className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-xl uppercase tracking-wider">
              <CheckCircle className="w-4 h-4" /> Lifetime Concedida
            </div>
          ) : (
            <Button 
              onClick={handleGrantLifetime} 
              disabled={isPending}
              className={`w-full text-xs py-2 h-9 font-bold rounded-xl shadow-sm ${
                isLifetimeEligible 
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black border border-amber-400 animate-pulse" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200"
              }`}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {isLifetimeEligible ? "Confirmar Lifetime Ahora" : "Otorgar Lifetime"}
            </Button>
          )}
        </Card>

        {/* Alternar IA */}
        <Card className="bg-white border border-slate-200/60 p-5 flex flex-col justify-between shadow-sm rounded-2xl">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-violet-500" />
              Control de AgentOS IA
            </h4>
            <p className="text-xs text-slate-500 mb-4 font-semibold leading-relaxed">
              Pausa el bot de forma aislada sin afectar el CRM. Ideal por falta de saldo o límites.
            </p>
          </div>
          <div className="flex gap-2">
            {initialData.aiStatus === "ACTIVE" ? (
              <Button 
                onClick={() => handleToggleAiStatus("PAUSED")} 
                disabled={isPending}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold py-2 h-9 rounded-xl border border-rose-200 shadow-sm"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Pausar Agente IA
              </Button>
            ) : (
              <Button 
                onClick={() => handleToggleAiStatus("ACTIVE")} 
                disabled={isPending}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 h-9 rounded-xl shadow-sm"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Reactivar Agente IA
              </Button>
            )}
          </div>
        </Card>

        {/* Configuración Manual */}
        <Card className="bg-white border border-slate-200/60 p-5 flex flex-col justify-between shadow-sm rounded-2xl">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-blue-500" />
              Ajustes Comerciales
            </h4>
            <p className="text-xs text-slate-500 mb-4 font-semibold leading-relaxed">
              Edita de forma manual el plan asignado, límites de consumo de IA y cuotas de pago.
            </p>
          </div>
          <Button 
            onClick={() => setShowEditModal(true)} 
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 h-9 rounded-xl shadow-sm"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Editar Configuración
          </Button>
        </Card>
      </div>

      {/* Modal / Dialogo de Edición Manual */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="bg-white border border-slate-200 w-full max-w-lg p-6 shadow-2xl relative overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Ajustes Comerciales del Cliente
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-1">Plan Asignado</label>
                  <select 
                    value={planCode} 
                    onChange={(e) => setPlanCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="FOUNDER">Plan Fundador</option>
                    <option value="BASE">Plan Base futuro</option>
                    <option value="PRO">Plan Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                    <option value="CUSTOM">Customizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-1">Monto Mensual (ARS)</label>
                  <input 
                    type="text" 
                    value={planLabel} 
                    onChange={(e) => setPlanLabel(e.target.value)}
                    placeholder="Ej: $65.000 + impuestos"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-850 font-semibold focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-1">Estado CRM (Suscripción)</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="TRIALING">Trial (Prueba)</option>
                    <option value="ACTIVE">Activo</option>
                    <option value="PAST_DUE">Impago (Past Due)</option>
                    <option value="SUSPENDED">Suspendido</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-1">Ciclos Pagados (0 a 12)</label>
                  <input 
                    type="number" 
                    min={0}
                    max={12}
                    value={paidCycles} 
                    onChange={(e) => setPaidCycles(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-850 font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-1">Límite Conversaciones IA</label>
                  <input 
                    type="number" 
                    min={0}
                    value={monthlyLimit} 
                    onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-850 font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-1">Conversaciones Usadas</label>
                  <input 
                    type="number" 
                    min={0}
                    value={conversationsUsed} 
                    onChange={(e) => setConversationsUsed(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-850 font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-100 pt-4 mt-6">
                <Button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1 shadow-sm"
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
