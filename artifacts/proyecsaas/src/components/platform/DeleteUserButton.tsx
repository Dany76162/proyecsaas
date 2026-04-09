"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash, Loader2 } from "lucide-react";

import { deleteUserCompletely } from "@/app/platform/settings/actions/settings-actions";

type DeleteUserButtonProps = {
  userId: string;
  userLabel: string;
  onDeleted?: (userId: string) => void;
};

export function DeleteUserButton({ userId, userLabel, onDeleted }: DeleteUserButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(`¿Eliminar definitivamente a ${userLabel}?`);

    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await deleteUserCompletely(userId);

      if (!result.success) {
        setError(result.error ?? "No se pudo eliminar el usuario.");
        return;
      }

      onDeleted?.(userId);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-40"
        title="Eliminar definitivamente"
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
        Eliminar
      </button>

      {error ? <p className="max-w-56 text-right text-[10px] font-medium text-red-500">{error}</p> : null}
    </div>
  );
}
