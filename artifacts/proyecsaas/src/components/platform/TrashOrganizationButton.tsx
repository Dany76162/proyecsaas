"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, ArchiveX, AlertTriangle, Loader2 } from "lucide-react";

import {
  moveOrganizationToTrashAction,
  restoreOrganizationFromTrashAction,
} from "@/modules/platform/actions";

type TrashOrganizationButtonProps = {
  orgSlug: string;
  orgName: string;
  isTrashed: boolean;
  isPlatformOrg?: boolean;
};

export function TrashOrganizationButton({
  orgSlug,
  orgName,
  isTrashed,
  isPlatformOrg = false,
}: TrashOrganizationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetState() {
    setOpen(false);
    setConfirmSlug("");
    setError("");
  }

  function handleConfirm() {
    setError("");

    startTransition(async () => {
      const result = isTrashed
        ? await restoreOrganizationFromTrashAction(orgSlug)
        : await moveOrganizationToTrashAction(orgSlug);

      if (result.success) {
        resetState();
        router.refresh();
        return;
      }

      setError(result.message ?? "No se pudo completar la acción.");
    });
  }

  if (isPlatformOrg) {
    return (
      <span className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300">
        Protegida
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          isTrashed
            ? "text-emerald-700 hover:bg-emerald-50"
            : "text-amber-700 hover:bg-amber-50"
        }`}
      >
        {isTrashed ? <ArchiveRestore className="h-3.5 w-3.5" /> : <ArchiveX className="h-3.5 w-3.5" />}
        {isTrashed ? "Restaurar" : "Mover a papelera"}
      </button>

      {open ? (
        <div className="w-[min(360px,calc(100vw-3rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isTrashed ? "bg-emerald-100" : "bg-amber-100"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${isTrashed ? "text-emerald-600" : "text-amber-600"}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900">
                {isTrashed ? "Restaurar organización" : "Mover a papelera"}
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {isTrashed
                  ? `La inmobiliaria "${orgName}" volverá a estar disponible en el panel y recuperará su acceso operativo.`
                  : `La inmobiliaria "${orgName}" saldrá de operación normal y podrá restaurarse más adelante desde la papelera.`}
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
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            />

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
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${
                isTrashed ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isTrashed ? "Restaurando..." : "Enviando..."}
                </span>
              ) : isTrashed ? (
                "Restaurar"
              ) : (
                "Mover a papelera"
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
