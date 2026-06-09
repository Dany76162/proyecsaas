"use client";

import { useState, useTransition } from "react";
import { Cpu, Zap, ClipboardCopy, CheckCheck, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { activateDirectorAgentAction, requestOperativeDiagnosisAction } from "@/modules/agents/actions";
import { cn } from "@/lib/utils";
import type { DirectorAgentStatus } from "@/modules/agents/service";

export default function DirectorPanelClient({ initialStatus }: { initialStatus: DirectorAgentStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isActivating, startActivate] = useTransition();
  const [isDiagnosing, startDiagnose] = useTransition();

  const handleActivate = () => {
    setErrorMsg(null);
    startActivate(async () => {
      const result = await activateDirectorAgentAction();
      if (result.success) {
        setStatus((prev) => ({
          ...prev,
          exists: true,
          isActive: true,
          agentId: result.agentId ?? prev.agentId,
          autonomyLevel: prev.autonomyLevel ?? "REQUIRE_APPROVAL",
          isPaused: prev.isPaused ?? false,
        }));
      } else {
        setErrorMsg("No se pudo activar el Director Operativo IA.");
      }
    });
  };

  const handleDiagnose = () => {
    setDiagnosis(null);
    setErrorMsg(null);
    setIsQuotaError(false);
    startDiagnose(async () => {
      const result = await requestOperativeDiagnosisAction();
      if (result.success && result.diagnosis) {
        setDiagnosis(result.diagnosis);
        setStatus((prev) => ({ ...prev, lastDiagnosisAt: new Date().toISOString() }));
      } else {
        setErrorMsg(result.error ?? "No se pudo generar el diagnóstico.");
        setIsQuotaError(result.isQuotaError ?? false);
      }
    });
  };

  const handleCopy = async () => {
    if (!diagnosis) return;
    try {
      await navigator.clipboard.writeText(diagnosis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard no disponible
    }
  };

  const isPending = isActivating || isDiagnosing;

  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Director Operativo IA</h2>
            <p className="text-xs text-slate-500 font-medium">
              Agente orquestador en modo{" "}
              <span className="font-bold text-indigo-600">SUPERVISADO (HITL)</span>
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 shrink-0">
          {status.exists && status.isActive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 uppercase tracking-widest">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Activo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 uppercase tracking-widest">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Inactivo
            </span>
          )}
          {status.isPaused && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 uppercase tracking-widest">
              Pausado
            </span>
          )}
        </div>
      </div>

      {/* Meta info */}
      {status.exists && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="rounded-xl bg-white border border-slate-100 px-4 py-3">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">Autonomía</p>
            <p className="font-black text-slate-800">{status.autonomyLevel ?? "—"}</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-100 px-4 py-3">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">Tipo</p>
            <p className="font-black text-slate-800">ORCHESTRATOR</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-100 px-4 py-3 col-span-2 sm:col-span-1">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">Último diagnóstico</p>
            <p className="font-black text-slate-800" suppressHydrationWarning>
              {status.lastDiagnosisAt
                ? new Date(status.lastDiagnosisAt).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Nunca"}
            </p>
          </div>
        </div>
      )}

      {/* HITL warning */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <ShieldCheck className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
          <span className="font-black">Modo Supervisado (HITL).</span> El agente solo diagnostica y sugiere. Ninguna acción se ejecuta de forma autónoma. El operador humano debe revisar y aprobar cada recomendación antes de proceder.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!status.exists || !status.isActive ? (
          <button
            type="button"
            onClick={handleActivate}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {isActivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Activar Director IA
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDiagnose}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {isDiagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
            {isDiagnosing ? "Generando diagnóstico..." : "Solicitar diagnóstico operativo"}
          </button>
        )}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 animate-in fade-in duration-300">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="text-xs text-red-800">
            {isQuotaError && (
              <span className="font-black mr-1 text-[10px] uppercase tracking-wider bg-red-100 px-1.5 py-0.5 rounded">
                Cuota agotada
              </span>
            )}
            <span className="font-medium">{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Diagnosis output */}
      {diagnosis && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">
              Diagnóstico Operativo
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                copied
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5">
            <pre className="whitespace-pre-wrap text-xs text-slate-700 font-mono leading-relaxed">
              {diagnosis}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
