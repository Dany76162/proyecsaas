"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearOrganizationMembershipsAction, generateInitialAdminInviteAction } from "@/modules/platform/actions";
import { MoreVertical, Copy, UserX, UserPlus, X } from "lucide-react";

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

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg focus:outline-none">
          <div className="py-1">
            {hasUsers ? (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setCleanModalOpen(true);
                }}
                className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <UserX className="h-4 w-4" />
                <span>Limpiar Org</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setInviteModalOpen(true);
                }}
                className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
              >
                <UserPlus className="h-4 w-4" />
                <span>Crear 1º Acceso</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* CLEAN MODAL */}
      {cleanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 shadow-2xl backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl overflow-hidden">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Desvincular usuarios</h2>
            <p className="mt-2 text-sm text-slate-600">
              Vas a remover <strong>todos los accesos humanos</strong> de la inmobiliaria "{orgName}". 
              Esto es irreversible, aunque los usuarios globales y los datos operativos permanecerán intactos.
            </p>
            
            <form onSubmit={handleClean} className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Escribe el nombre de la inmobiliaria para confirmar:
              </label>
              <input
                required
                type="text"
                placeholder={orgName}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              
              {cleanError && <p className="mt-2 text-sm font-medium text-red-600">{cleanError}</p>}
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCleanModalOpen(false)}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || confirmText !== orgName}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Primer Acceso (Onboarding)</h2>
              <button onClick={() => setInviteModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="mt-2 text-sm text-slate-600">
              Creá el administrador inicial (Titular) para <strong>{orgName}</strong>. 
            </p>
            
            {!inviteUrl ? (
              <form onSubmit={handleInvite} className="mt-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nombre completo</label>
                    <input
                      required
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Correo electrónico</label>
                    <input
                      required
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                
                {inviteError && <p className="mt-3 text-sm font-medium text-red-600">{inviteError}</p>}
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isPending ? "Generando link encriptado..." : "Generar URL de acceso temporal"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">URL Lista</p>
                <div className="flex items-center rounded-xl border-2 border-emerald-100 bg-emerald-50 p-1">
                  <p className="flex-1 truncate px-3 py-2 text-sm font-medium text-emerald-900">{inviteUrl}</p>
                  <button
                    onClick={copyInvite}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-200 text-emerald-800 hover:bg-emerald-300 transition"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-6 flex">
                  <button
                    onClick={() => {
                        setInviteUrl(null);
                        setInviteModalOpen(false);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Hecho
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
