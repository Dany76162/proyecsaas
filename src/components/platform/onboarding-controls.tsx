"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearOrganizationMembershipsAction, generateInitialAdminInviteAction } from "@/modules/platform/actions";

export function OnboardingControls({ 
  orgSlug, 
  orgName,
  hasUsers
}: { 
  orgSlug: string;
  orgName: string;
  hasUsers: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [cleanModalOpen, setCleanModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Clean form
  const [confirmText, setConfirmText] = useState("");
  const [cleanError, setCleanError] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState("");

  const handleClean = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== orgName) {
      setCleanError("El texto no coincide. Debes escribir el nombre exacto.");
      return;
    }

    startTransition(async () => {
      setCleanError("");
      const res = await clearOrganizationMembershipsAction(orgSlug);
      if (res.success) {
        setCleanModalOpen(false);
        setConfirmText("");
        router.refresh();
      } else {
        setCleanError(res.message);
      }
    });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setInviteError("");
      const res = await generateInitialAdminInviteAction(orgSlug, {
        email: inviteEmail,
        fullName: inviteName,
      });

      if (res.success && res.data?.inviteUrl) {
        setInviteUrl(res.data.inviteUrl);
        router.refresh();
      } else {
        setInviteError(res.message);
      }
    });
  };

  const copyInvite = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      alert("Enlace copiado al portapapeles.");
    }
  };

  return (
    <div className="flex gap-2">
      {hasUsers ? (
        <button
          onClick={() => setCleanModalOpen(true)}
          className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 uppercase tracking-wide"
        >
          Limpiar Org
        </button>
      ) : (
        <button
          onClick={() => setInviteModalOpen(true)}
          className="rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 uppercase tracking-wide"
        >
          Crear 1º Acceso
        </button>
      )}

      {/* CLEAN MODAL */}
      {cleanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Desvincular usuarios</h2>
            <p className="mt-2 text-sm text-slate-600">
              Vas a remover <strong>todos los accesos humanos</strong> de la inmobiliaria "{orgName}". 
              Esto es irreversible, aunque los usuarios globales y los datos operativos permanecerán intactos.
            </p>
            
            <form onSubmit={handleClean} className="mt-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Escribe el nombre de la inmobiliaria para confirmar:
              </label>
              <input
                required
                type="text"
                placeholder={orgName}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              
              {cleanError && <p className="mt-2 text-sm text-red-600">{cleanError}</p>}
              
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCleanModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || confirmText !== orgName}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? "Limpiando..." : "Confirmar limpieza"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Generar Primer Acceso</h2>
            <p className="mt-2 text-sm text-slate-600">
              Creá el administrador inicial (Titular) para <strong>{orgName}</strong>. 
            </p>
            
            {!inviteUrl ? (
              <form onSubmit={handleInvite} className="mt-4">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
                    <input
                      required
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Correo electrónico</label>
                    <input
                      required
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                
                {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
                
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isPending ? "Generando..." : "Crear enlace"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="break-all text-sm font-medium text-emerald-900">{inviteUrl}</p>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={copyInvite}
                    className="flex-1 rounded-lg bg-emerald-600 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Copiar Enlace
                  </button>
                  <button
                    onClick={() => {
                        setInviteUrl(null);
                        setInviteModalOpen(false);
                    }}
                    className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
