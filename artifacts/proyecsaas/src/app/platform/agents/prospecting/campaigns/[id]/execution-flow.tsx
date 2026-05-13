"use client";

import { useState } from "react";
import { 
  Play, Send, RefreshCw, CheckCircle2, 
  AlertCircle, Loader2, Sparkles, Mail, ShieldCheck,
  ShieldAlert, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  addRecipientsToCampaignAction, 
  sendTestEmailAction, 
  runCampaignBatchAction 
} from "@/modules/prospecting/campaign-actions";
import { cn } from "@/lib/utils";

type Props = {
  campaignId: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  eligibleCount: number;
  isEmailSendEnabled: boolean;
  isBulkEnabled: boolean;
};

export default function CampaignExecutionFlow({ 
  campaignId, status, totalRecipients, sentCount, 
  failedCount, skippedCount, eligibleCount,
  isEmailSendEnabled, isBulkEnabled
}: Props) {
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

  const [isPopulating, setIsPopulating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [batchResult, setBatchResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePopulate = async () => {
    setIsPopulating(true);
    try {
      const res = await addRecipientsToCampaignAction(campaignId, []); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPopulating(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setIsTestLoading(true);
    setTestResult(null);
    try {
      const res = await sendTestEmailAction(campaignId, testEmail);
      if (res.success) {
        setTestResult({ success: true, message: "Email de prueba enviado." });
      } else {
        setTestResult({ success: false, message: res.error || "Error al enviar prueba." });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleRunBatch = async () => {
    if (confirmText !== "ENVIAR") return;
    setIsRunning(true);
    setError(null);
    try {
      const res = await runCampaignBatchAction(campaignId, confirmText);
      setBatchResult(res);
      setConfirmText("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const isSent = status === "SENT";
  const hasPending = totalRecipients > sentCount + skippedCount;

  return (
    <div className="space-y-8">
       {/* Phase 1: Population */}
       {totalRecipients === 0 && (
         <div className="p-6 bg-brand-50 border border-brand-100 rounded-3xl flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center text-brand-600">
               <Users className="h-6 w-6" />
            </div>
            <div>
               <h4 className="text-lg font-black text-slate-900">Preparar Destinatarios</h4>
               <p className="text-sm font-medium text-slate-600 mt-1 max-w-sm">
                  Se detectaron {eligibleCount} prospectos aprobados aptos para esta campaña.
               </p>
            </div>
            <Button 
              onClick={handlePopulate} 
              disabled={isPopulating || eligibleCount === 0}
              className="bg-brand-600 hover:bg-brand-700 text-white font-black px-10 h-12 rounded-xl shadow-lg shadow-brand-100 transition-all active:scale-95"
            >
               {isPopulating ? <Loader2 className="animate-spin h-5 w-5" /> : "Vincular Prospectos"}
            </Button>
         </div>
       )}

       {/* Phase 2: Test & Validation */}
       {totalRecipients > 0 && !isSent && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Paso 1: Validación</h4>
               <p className="text-sm font-bold text-slate-900">Envía un email de prueba para revisar el diseño y etiquetas.</p>
               <div className="flex gap-2">
                  <Input 
                    placeholder="tu@email.com" 
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleSendTest}
                    disabled={isTestLoading || !testEmail}
                    className="h-11 font-bold border-slate-200"
                  >
                    {isTestLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Enviar prueba"}
                  </Button>
               </div>
               {testResult && (
                 <div className={cn("p-3 rounded-xl border text-[11px] font-bold flex items-center gap-2", 
                   testResult.success ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700")}>
                    {testResult.success ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {testResult.message}
                 </div>
               )}
            </div>

            <div className="space-y-4">
               <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Paso 2: Ejecución</h4>
               {!isBulkEnabled ? (
                 <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex gap-3">
                    <ShieldAlert className="h-5 w-5 text-slate-400 shrink-0" />
                    <div>
                       <p className="text-[11px] font-bold text-slate-600">Envío masivo desactivado</p>
                       <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                          El envío por lotes debe ser habilitado por un administrador de sistemas.
                       </p>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-900">Escribe ENVIAR para confirmar el envío por lotes.</p>
                    <div className="flex gap-2">
                       <Input 
                         placeholder="Escribir ENVIAR" 
                         value={confirmText}
                         onChange={(e) => setConfirmText(e.target.value)}
                         className="h-11 rounded-xl uppercase font-black tracking-widest"
                       />
                       <Button 
                         onClick={handleRunBatch}
                         disabled={isRunning || confirmText !== "ENVIAR" || !hasPending}
                         className="h-11 px-6 bg-slate-900 hover:bg-black font-black rounded-xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
                       >
                         {isRunning ? <Loader2 className="animate-spin h-4 w-4" /> : <><Play className="mr-2 h-4 w-4" /> Iniciar Lote</>}
                       </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold">
                       Límite actual: 20 emails por ejecución.
                    </p>
                 </div>
               )}
            </div>
         </div>
       )}

       {/* Execution Feedback */}
       {batchResult && (
          <div className="p-6 bg-slate-900 rounded-3xl text-white flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400">
                   <RefreshCw className={cn("h-5 w-5", isRunning && "animate-spin")} />
                </div>
                <div>
                   <p className="text-sm font-black tracking-wide">Resultados de la ejecución</p>
                   <p className="text-xs font-bold text-slate-400">
                      Enviados: {batchResult.sent} • Errores: {batchResult.failed} • Restantes: {batchResult.remaining}
                   </p>
                </div>
             </div>
             {batchResult.remaining > 0 ? (
               <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-white font-bold h-9 rounded-lg" onClick={() => setBatchResult(null)}>
                  Cerrar y actualizar
               </Button>
             ) : (
               <Badge className="bg-brand-500 text-white font-black uppercase">Campaña Completa</Badge>
             )}
          </div>
       )}

       {error && (
         <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-xs font-bold">{error}</p>
         </div>
       )}

       {/* General Status Info */}
       <div className="pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Destinatarios</p>
             <p className="text-2xl font-black text-slate-900">{totalRecipients}</p>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enviados</p>
             <p className="text-2xl font-black text-emerald-600">{sentCount}</p>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Omitidos/Fallidos</p>
             <p className="text-2xl font-black text-red-500">{skippedCount + failedCount}</p>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pendientes</p>
             <p className="text-2xl font-black text-amber-500">{totalRecipients - sentCount - skippedCount - failedCount}</p>
          </div>
       </div>

       {/* Flags Warning */}
       {!isEmailSendEnabled && (
         <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex gap-3 items-center">
            <ShieldCheck className="h-5 w-5 text-slate-400" />
            <p className="text-[11px] font-bold text-slate-500">
               Modo de Simulación: El envío real a la API de email está desactivado en la configuración del servidor.
            </p>
         </div>
       )}
    </div>
  );
}
