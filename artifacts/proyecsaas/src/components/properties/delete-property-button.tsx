"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
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

  function handleDeleteClick(e: React.MouseEvent) {
    // Prevent the parent Link from navigating
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setShowConfirm(true);
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
    setError(null);
  }

  function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const result = await deletePropertyAction(orgSlug, { propertyId });
      if (result.success) {
        setShowConfirm(false);
        router.refresh();
      } else {
        setError(result.message ?? "Error al eliminar.");
      }
    });
  }

  return (
    <>
      {/* Trash icon button */}
      <button
        type="button"
        onClick={handleDeleteClick}
        aria-label="Eliminar propiedad"
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 active:scale-95"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Confirmation dialog — full-screen overlay */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <div
            className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              ¿Eliminar propiedad?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Estás por eliminar{" "}
              <span className="font-semibold text-slate-800">
                &quot;{propertyTitle}&quot;
              </span>
              . Esta acción es permanente y no se puede deshacer.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Las imágenes y visitas se eliminarán. Los leads y conversaciones
              asociados se conservarán sin referencia a esta propiedad.
            </p>

            {error && (
              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
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
        </div>
      )}
    </>
  );
}
