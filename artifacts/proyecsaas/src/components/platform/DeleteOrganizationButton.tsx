"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { deleteOrganizationPermanentlyAction } from "@/modules/platform/actions";

type DeleteOrganizationButtonProps = {
  orgSlug: string;
  orgName: string;
  isTrashed: boolean;
  isPlatformOrg?: boolean;
};

export function DeleteOrganizationButton({
  orgSlug,
  orgName,
  isTrashed,
  isPlatformOrg = false,
}: DeleteOrganizationButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetState() {
    setShowConfirm(false);
    setConfirmSlug("");
    setError("");
  }

  function handleConfirm() {
    setError("");

    startTransition(async () => {
      const result = await deleteOrganizationPermanentlyAction(orgSlug);

      if (result.success) {
        resetState();
        router.refresh();
        return;
      }

      setError(result.message ?? "No se pudo eliminar la organización.");
    });
  }

  if (isPlatformOrg) {
    return null;
  }

  if (!isTrashed) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={() => {
          setError("");
          setShowConfirm(true);
        }}
        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Eliminar
      </button>

      {showConfirm ? (
        <div className="w-[min(360px,calc(100vw-3rem))] rounded-2xl border border-red-200 bg-white p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900">
                Eliminar definitivamente
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Vas a borrar por completo la inmobiliaria{" "}
                <span className="font-semibold text-slate-900">&quot;{orgName}&quot;</span> y sus
                datos asociados. Esta acción no se puede deshacer.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Para confirmar, escribí el slug exacto:
                <span className="ml-1 font-semibold text-slate-700">{orgSlug}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={confirmSlug}
              onChange={(event) => setConfirmSlug(event.target.value)}
              placeholder={orgSlug}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />

            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
              Se eliminan membresías, invitaciones, leads, conversaciones, mensajes,
              propiedades, visitas, disponibilidad, notificaciones, automatizaciones, canales
              de WhatsApp, registros comerciales, suscripción y agentes IA asociados.
            </div>

            {error ? (
              <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={resetState}
              disabled={isPending}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending || confirmSlug !== orgSlug}
              className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eliminando...
                </span>
              ) : (
                "Eliminar definitivamente"
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
