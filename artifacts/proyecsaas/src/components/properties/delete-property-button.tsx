"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { deletePropertyAction } from "@/modules/properties/actions";

interface DeletePropertyButtonProps {
  orgSlug: string;
  propertyId: string;
  propertyTitle: string;
}

export function DeletePropertyButton({
  orgSlug,
  propertyId,
  propertyTitle,
}: DeletePropertyButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function stopCardInteraction(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDeleteClick(e: React.MouseEvent) {
    stopCardInteraction(e);
    setError(null);
    setShowConfirm((current) => !current);
  }

  function handleCancel(e: React.MouseEvent) {
    stopCardInteraction(e);
    setShowConfirm(false);
    setError(null);
  }

  function handleConfirm(e: React.MouseEvent) {
    stopCardInteraction(e);
    setError(null);

    startTransition(async () => {
      const result = await deletePropertyAction(orgSlug, { propertyId });

      if (result.success) {
        setShowConfirm(false);
        router.refresh();
        return;
      }

      setError(result.message ?? "Error al eliminar.");
    });
  }

  return (
    <div
      className="relative z-20 flex flex-col items-end gap-3"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleDeleteClick}
        aria-label="Eliminar propiedad"
        aria-expanded={showConfirm}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:border-red-100 hover:bg-red-50 hover:text-red-600 active:scale-95"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {showConfirm ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`Eliminar ${propertyTitle}`}
          className="w-[min(320px,calc(100vw-4rem))] rounded-2xl border border-red-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-900">
                Eliminar propiedad
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Vas a eliminar{" "}
                <span className="font-semibold text-slate-800">
                  &quot;{propertyTitle}&quot;
                </span>
                . La accion es permanente.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Se borraran imagenes y visitas. Los leads y conversaciones se conservaran sin referencia.
              </p>
            </div>
          </div>

          {error ? (
            <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eliminando...
                </span>
              ) : (
                "Eliminar"
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
