"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAgent } from "@/modules/agents/actions";

interface DeleteAgentButtonProps {
  orgSlug: string;
  agentId: string;
  agentName: string;
}

export function DeleteAgentButton({ orgSlug, agentId, agentName }: DeleteAgentButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteAgent(orgSlug, agentId);
        toast.success(`Agente "${agentName}" eliminado correctamente.`);
        router.push(`/${orgSlug}/agents`);
      } catch (err: any) {
        toast.error(err?.message || "No se pudo eliminar el agente.");
        setShowConfirm(false);
      }
    });
  }

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
      >
        Eliminar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
      <span className="text-xs font-semibold text-rose-700">¿Eliminar agente?</span>
      <button
        type="button"
        onClick={() => setShowConfirm(false)}
        disabled={isPending}
        className="text-xs font-bold text-slate-500 hover:text-slate-700 transition disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className="flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        Confirmar
      </button>
    </div>
  );
}
