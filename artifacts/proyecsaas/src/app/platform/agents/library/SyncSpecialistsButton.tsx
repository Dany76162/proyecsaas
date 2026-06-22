"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Loader2, CheckCheck } from "lucide-react";
import { ensureSpecialistAgentsAction } from "@/modules/agents/actions";

export default function SyncSpecialistsButton({ unsyncedCount }: { unsyncedCount: number }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const handleSync = () => {
    setMsg(null);
    startTransition(async () => {
      const result = await ensureSpecialistAgentsAction();
      setOk(result.success);
      setMsg(result.message);
    });
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">Sincronizar especialistas</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5 max-w-xl">
            Crea o actualiza los 6 especialistas read-only como agentes persistidos. No ejecuta acciones ni envía mensajes — es una sincronización manual de configuración.
            {unsyncedCount > 0 && (
              <span className="font-bold text-indigo-700"> {unsyncedCount} sin sincronizar.</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={isPending}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-indigo-700 active:scale-95 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {isPending ? "Sincronizando…" : "Sincronizar especialistas"}
        </button>
      </div>
      {msg && (
        <p className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${ok ? "text-emerald-700" : "text-red-700"}`}>
          {ok && <CheckCheck className="h-3.5 w-3.5" />}
          {msg}
        </p>
      )}
    </div>
  );
}
