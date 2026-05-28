"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { exportAgentLogsAction } from "@/modules/agents/governance-actions";

export default function LogExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setErrorText(null);
    setSuccessText(null);
    try {
      const data = await exportAgentLogsAction();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agentos-audit-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessText("Auditoría exportada correctamente.");
      setTimeout(() => setSuccessText(null), 4000);
    } catch (err: any) {
      setErrorText("No se pudo exportar la auditoría. Intentá nuevamente.");
      setTimeout(() => setErrorText(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {errorText && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-700 border border-red-150 rounded-xl animate-in fade-in slide-in-from-right-2 duration-300">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{errorText}</span>
        </div>
      )}

      {successText && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-xl animate-in fade-in slide-in-from-right-2 duration-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{successText}</span>
        </div>
      )}

      <Button 
        variant="outline" 
        onClick={handleExport} 
        disabled={isExporting}
        className="border-slate-200 font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl shadow-sm hover:shadow-md transition-all"
      >
        {isExporting ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Exportar Auditoría
      </Button>
    </div>
  );
}
