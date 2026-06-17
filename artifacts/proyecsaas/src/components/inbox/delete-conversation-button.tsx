"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteConversationAction } from "@/modules/conversations/actions";

export function DeleteConversationButton({
  orgSlug,
  conversationId,
}: {
  orgSlug: string;
  conversationId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteConversationAction(orgSlug, conversationId);
      if (res.ok) {
        setConfirming(false);
        router.push(`/${orgSlug}/conversations`);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title="Eliminar conversación"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-rose-300 hover:text-rose-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Eliminar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5">
      <span className="text-xs font-semibold text-rose-700">¿Eliminar? Es permanente.</span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="text-xs font-bold text-slate-500 hover:text-slate-700"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-md bg-rose-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
      >
        {isPending ? "Eliminando…" : "Sí, eliminar"}
      </button>
      {error && <span className="text-[10px] text-rose-500">{error}</span>}
    </div>
  );
}
