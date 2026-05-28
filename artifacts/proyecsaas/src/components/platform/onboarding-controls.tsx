"use client";

import Link from "next/link";
import { useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  clearOrganizationMembershipsAction,
  generateInitialAdminInviteAction,
  deactivateOrganizationAction,
  reactivateOrganizationAction,
  setOrgAgentQuotaAction,
  resetUserPasswordAction,
  moveOrganizationToTrashAction,
  restoreOrganizationFromTrashAction,
  deleteOrganizationPermanentlyAction,
} from "@/modules/platform/actions";
import { MoreVertical, Copy, UserX, UserPlus, X, AlertTriangle, PowerOff, Bot, Power, Key, ArchiveX, ArchiveRestore, Trash2, ChevronDown } from "lucide-react";

type MenuCoords = { top: number; right: number };

export function OnboardingControls({
  orgSlug,
  orgName,
  ownerEmail,
  hasUsers,
  isActive,
  maxAiAgents,
  aiAgentCount,
  agentQuotaNote,
  isTrashed,
  isPlatformOrg,
}: {
  orgSlug: string;
  orgName: string;
  ownerEmail: string | null;
  hasUsers: boolean;
  isActive: boolean;
  maxAiAgents: number | null;
  aiAgentCount: number;
  agentQuotaNote?: string | null;
  isTrashed: boolean;
  isPlatformOrg: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dropdown state (all screens)
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [cleanModalOpen, setCleanModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Clean form
  const [confirmText, setConfirmText] = useState("");
  const [cleanError, setCleanError] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  // Reactivate modal
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);

  // Deactivate form
  const [deactivateConfirmText, setDeactivateConfirmText] = useState("");
  const [deactivateError, setDeactivateError] = useState("");

  // Agent quota form
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaValue, setQuotaValue] = useState(maxAiAgents ?? 1);
  const [quotaNote, setQuotaNote] = useState(agentQuotaNote ?? "");
  const [quotaError, setQuotaError] = useState("");
  const [quotaSuccess, setQuotaSuccess] = useState("");

  // Reset password state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [resetError, setResetError] = useState("");
  const [resetCopied, setResetCopied] = useState(false);

  // Trash & Delete states
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [trashConfirmSlug, setTrashConfirmSlug] = useState("");
  const [trashError, setTrashError] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Click-outside: close dropdown when clicking neither trigger nor dropdown
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Toggle dropdown â€” calculate viewport-relative coords from trigger button
  const handleToggle = () => {
    if (!menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setMenuOpen((prev) => !prev);
  };

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

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deactivateConfirmText !== orgName) {
      setDeactivateError("El texto no coincide. Debes escribir el nombre exacto.");
      return;
    }
    startTransition(async () => {
      setDeactivateError("");
      const res = await deactivateOrganizationAction(orgSlug);
      if (res.success) {
        setDeactivateModalOpen(false);
        setDeactivateConfirmText("");
        router.refresh();
      } else {
        setDeactivateError(res.message);
      }
    });
  };

  const handleReactivate = () => {
    startTransition(async () => {
      const res = await reactivateOrganizationAction(orgSlug);
      if (res.success) {
        setReactivateModalOpen(false);
        router.refresh();
      }
    });
  };

  const copyInvite = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    }
  };

  const copyReset = () => {
    if (resetUrl) {
      navigator.clipboard.writeText(resetUrl);
      setResetCopied(true);
      setTimeout(() => setResetCopied(false), 2500);
    }
  };

  const handleTrashToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trashConfirmSlug !== orgSlug) {
      setTrashError("El slug no coincide. Debes escribir el slug exacto.");
      return;
    }
    startTransition(async () => {
      setTrashError("");
      const result = isTrashed
        ? await restoreOrganizationFromTrashAction(orgSlug)
        : await moveOrganizationToTrashAction(orgSlug);

      if (result.success) {
        setTrashModalOpen(false);
        setTrashConfirmSlug("");
        router.refresh();
      } else {
        setTrashError(result.message ?? "No se pudo completar la acción.");
      }
    });
  };

  const handleDeletePermanent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmSlug !== orgSlug) {
      setDeleteError("El slug no coincide. Debes escribir el slug exacto.");
      return;
    }
    startTransition(async () => {
      setDeleteError("");
      const result = await deleteOrganizationPermanentlyAction(orgSlug);

      if (result.success) {
        setDeleteModalOpen(false);
        setDeleteConfirmSlug("");
        router.refresh();
      } else {
        setDeleteError(result.message ?? "No se pudo eliminar la organización.");
      }
    });
  };

  const handleQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuotaError("");
    setQuotaSuccess("");
    startTransition(async () => {
      const res = await setOrgAgentQuotaAction(orgSlug, quotaValue, quotaNote);
      if (res.success) {
        setQuotaSuccess(res.message ?? "Cuota actualizada.");
        router.refresh();
      } else {
        setQuotaError(res.message);
      }
    });
  };

  const handleReset = async () => {
    if (!ownerEmail) return;
    startTransition(async () => {
      setResetError("");
      const res = await resetUserPasswordAction(orgSlug, ownerEmail);
      if (res.success && res.data?.inviteUrl) {
        setResetUrl(res.data.inviteUrl);
        router.refresh();
      } else {
        setResetError(res.message);
      }
    });
  };

  // â”€â”€â”€ Portal dropdown (mobile / tablet) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Rendered at document.body to escape overflow:hidden / overflow-x:auto
  // clipping from the table container. Uses position:fixed + viewport coords.
  const dropdownPortal =
    menuOpen && menuCoords
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: menuCoords.top,
              right: menuCoords.right,
              zIndex: 9999,
            }}
            className="w-56 origin-top-right rounded-xl border border-slate-200/60 bg-white shadow-enterprise py-1"
          >
            {/* Onboarding actions */}
            <div className="py-1">
              {hasUsers ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setCleanModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50"
                >
                  <UserX className="h-4 w-4" />
                  <span>Limpiar accesos</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setInviteModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Crear 1º Acceso</span>
                </button>
              )}

              {hasUsers && ownerEmail && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setResetUrl(null);
                    setResetError("");
                    setResetModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-[13px] font-semibold text-brand-700 hover:bg-brand-50"
                >
                  <Key className="h-4 w-4" />
                  <span>Reiniciar Clave</span>
                </button>
              )}
            </div>

            {/* Suspender / Reactivar */}
            <div className="border-t border-slate-100 py-1">
              {isActive ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setDeactivateModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-[13px] font-bold text-red-700 hover:bg-red-50 transition-colors"
                >
                  <PowerOff className="h-4 w-4 shrink-0" />
                  <span>Suspender</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setReactivateModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-[13px] font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <Power className="h-4 w-4 shrink-0" />
                  <span>Reactivar</span>
                </button>
              )}
            </div>

            {/* Agentes IA */}
            <div className="border-t border-slate-100 py-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setQuotaValue(maxAiAgents ?? 1);
                  setQuotaError("");
                  setQuotaSuccess("");
                  setQuotaModalOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Bot className="h-4 w-4 text-brand-600" />
                <span>Agentes IA ({aiAgentCount}/{maxAiAgents})</span>
              </button>
            </div>

            {/* Soporte técnico (excepcional) */}
            <div className="border-t border-slate-100 py-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setSupportModalOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-[13px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Soporte técnico</span>
              </button>
            </div>

            {/* Papelera / Eliminar Acciones */}
            <div className="border-t border-slate-100 py-1">
              {isTrashed ? (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setTrashConfirmSlug("");
                      setTrashError("");
                      setTrashModalOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-[13px] font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <ArchiveRestore className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Restaurar cliente</span>
                  </button>

                  {!isPlatformOrg && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteConfirmSlug("");
                        setDeleteError("");
                        setDeleteModalOpen(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-[13px] font-black text-red-650 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 shrink-0 text-red-600" />
                      <span>Eliminar físico</span>
                    </button>
                  )}
                </>
              ) : (
                !isPlatformOrg && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setTrashConfirmSlug("");
                      setTrashError("");
                      setTrashModalOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-[13px] font-bold text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <ArchiveX className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Mover a papelera</span>
                  </button>
                )
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="inline-block">
      {/* TRIGGER BUTTON FOR THE DROPDOWN ON ALL SCREENS */}
      <div className="flex items-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          className="inline-flex w-full items-center justify-center gap-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition shadow-sm h-8 whitespace-nowrap"
        >
          <span>Más acciones</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>

      {dropdownPortal}

      {/* â”€â”€ SUPPORT MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-200/60 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Acceso de Soporte Técnico</h3>
                <p className="text-xs text-slate-500">{orgName}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-700">
              Estás por acceder al <strong>workspace privado</strong> de este cliente como operador
              de soporte de plataforma.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Esta acción es de carácter excepcional. Solo debe usarse para resolver incidencias
              técnicas.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <Link
                href={`/${orgSlug}`}
                onClick={() => setSupportModalOpen(false)}
                className="rounded-lg bg-amber-500 py-2.5 text-center text-sm font-bold text-white transition hover:bg-amber-600 shadow-sm shadow-amber-500/20"
              >
                Confirmar acceso
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ CLEAN MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {cleanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white p-6 shadow-2xl overflow-hidden">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Desvincular usuarios
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Vas a remover <strong>todos los accesos humanos</strong> de la inmobiliaria &ldquo;
              {orgName}&rdquo;. Esto es irreversible, aunque los usuarios globales y los datos
              operativos permanecerán intactos.
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
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />

              {cleanError && (
                <p className="mt-2 text-sm font-medium text-red-600">{cleanError}</p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCleanModalOpen(false)}
                  className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || confirmText !== orgName}
                  className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 shadow-sm shadow-red-500/20 disabled:opacity-50"
                >
                  {isPending ? "Limpiando..." : "Confirmar limpieza"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ INVITE MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Primer Acceso (Alta)</h2>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
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
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Nombre completo
                    </label>
                    <input
                      required
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Correo electrónico
                    </label>
                    <input
                      required
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {inviteError && (
                  <p className="mt-3 text-sm font-medium text-red-600">{inviteError}</p>
                )}

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isPending ? "Generando link..." : "Generar URL de acceso"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                  URL Lista
                </p>
                <div className="flex items-center rounded-xl border-2 border-emerald-100 bg-emerald-50 p-1">
                  <p className="flex-1 truncate px-3 py-2 text-sm font-medium text-emerald-900">
                    {inviteUrl}
                  </p>
                  <button
                    onClick={copyInvite}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-200 text-emerald-800 hover:bg-emerald-300 transition"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setInviteUrl(null);
                      setInviteModalOpen(false);
                    }}
                    className="w-full rounded-xl border border-slate-200 py-2.5 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Hecho
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ AGENT QUOTA MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {quotaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 border border-brand-100">
                  <Bot className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Cuota de Agentes IA</h3>
                  <p className="text-xs text-slate-500">{orgName}</p>
                </div>
              </div>
              <button onClick={() => setQuotaModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">{aiAgentCount}</span> agente{aiAgentCount !== 1 ? "s" : ""} creado{aiAgentCount !== 1 ? "s" : ""} Â· cuota actual:{" "}
                <span className="font-semibold">{maxAiAgents}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">El plan mensual incluye 1 agente. Cada agente adicional tiene costo extra.</p>
              {agentQuotaNote && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Último registro</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{agentQuotaNote}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleQuota} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Agentes habilitados (máximo)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={quotaValue}
                  onChange={(e) => setQuotaValue(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Motivo / nota de facturación
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Factura #42 â€” $15/mes â€” Marzo 2026"
                  value={quotaNote}
                  onChange={(e) => setQuotaNote(e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                <p className="mt-1 text-xs text-slate-400">Opcional. Se guarda con fecha y hora automáticos.</p>
              </div>

              {quotaError && <p className="text-sm font-medium text-red-600">{quotaError}</p>}
              {quotaSuccess && <p className="text-sm font-medium text-emerald-600">{quotaSuccess}</p>}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setQuotaModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || quotaValue === maxAiAgents}
                  className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 shadow-sm shadow-brand-500/20 disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Confirmar cuota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ REACTIVATE MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {reactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-200/60 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
                <Power className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Reactivar Cuenta</h2>
                <p className="text-xs text-slate-500">{orgName}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">
                Vas a restaurar el acceso completo al workspace.
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Todos los usuarios con membresía activa podrán ingresar nuevamente.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReactivateModalOpen(false)}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleReactivate}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
              >
                {isPending ? "Reactivando..." : "Confirmar reactivación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ DEACTIVATE MODAL â€” Baja de cliente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {deactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 border border-red-100">
                <PowerOff className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Dar de baja</h2>
                <p className="text-xs text-slate-500">{orgName}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Esta acción desactivará permanentemente el acceso al workspace.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-red-700 list-disc list-inside">
                <li>Los usuarios de esta inmobiliaria no podrán ingresar</li>
                <li>Los datos quedarán archivados pero inaccesibles</li>
                <li>La automatización IA dejará de procesar esta cuenta</li>
              </ul>
            </div>

            <form onSubmit={handleDeactivate} className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Escribe el nombre exacto de la inmobiliaria para confirmar la baja:
              </label>
              <input
                required
                type="text"
                placeholder={orgName}
                value={deactivateConfirmText}
                onChange={(e) => setDeactivateConfirmText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />

              {deactivateError && (
                <p className="mt-2 text-sm font-medium text-red-600">{deactivateError}</p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeactivateModalOpen(false);
                    setDeactivateConfirmText("");
                    setDeactivateError("");
                  }}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || deactivateConfirmText !== orgName}
                  className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 shadow-sm shadow-red-500/20 disabled:opacity-50"
                >
                  {isPending ? "Desactivando..." : "Confirmar baja definitiva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ────────────────────────────────────────── */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Reiniciar Clave</h2>
              <button
                onClick={() => setResetModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              Vas a generar un nuevo enlace de acceso para <strong>{ownerEmail}</strong>. 
              La clave actual dejará de funcionar hasta que el usuario establezca una nueva.
            </p>

            {!resetUrl ? (
              <div className="mt-6 space-y-4">
                {resetError && (
                  <p className="text-sm font-medium text-red-600">{resetError}</p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isPending}
                    className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 shadow-sm shadow-brand-500/20 disabled:opacity-50"
                  >
                    {isPending ? "Generando..." : "Confirmar y Generar Link"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 mb-2">
                  Nuevo Enlace de Acceso
                </p>
                <div className="flex items-center rounded-xl border-2 border-brand-100 bg-brand-50 p-1">
                  <p className="flex-1 truncate px-3 py-2 text-sm font-medium text-brand-900">
                    {resetUrl}
                  </p>
                  <button
                    onClick={copyReset}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-200 text-brand-800 hover:bg-brand-300 transition"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                {resetCopied && (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">¡Enlace copiado al portapapeles!</p>
                )}
                <p className="mt-3 text-[11px] text-slate-500">
                  Copiá este link y enviaselo al cliente por WhatsApp. 
                  Tiene validez por 48 horas.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setResetModalOpen(false)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRASH MODAL ────────────────────────────────────────────────── */}
      {trashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isTrashed ? "bg-emerald-100" : "bg-amber-100"}`}>
                <AlertTriangle className={`h-5 w-5 ${isTrashed ? "text-emerald-600" : "text-amber-600"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {isTrashed ? "Restaurar cliente" : "Mover a papelera"}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-655 font-medium">
                  {isTrashed
                    ? `La inmobiliaria "${orgName}" volverá a estar disponible en el panel y recuperará su acceso operativo.`
                    : `La inmobiliaria "${orgName}" saldrá de operación normal y podrá restaurarse más adelante desde la papelera.`}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500 font-semibold">
                  Para confirmar, escribí el slug exacto: <span className="font-bold text-slate-800">{orgSlug}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleTrashToggle} className="mt-4 space-y-3">
              <input
                required
                type="text"
                value={trashConfirmSlug}
                onChange={(e) => setTrashConfirmSlug(e.target.value)}
                placeholder={orgSlug}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />

              {trashError && (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {trashError}
                </p>
              )}

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrashModalOpen(false);
                    setTrashConfirmSlug("");
                    setTrashError("");
                  }}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-705 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || trashConfirmSlug !== orgSlug}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 ${
                    isTrashed ? "bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/25" : "bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-500/25"
                  }`}
                >
                  {isPending ? "Procesando..." : isTrashed ? "Restaurar cliente" : "Mover a papelera"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ────────────────────────────────────────────────── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-105 border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Eliminar definitivamente
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-655 font-medium">
                  Vas a borrar por completo la inmobiliaria <span className="font-bold text-slate-900">"{orgName}"</span> y todos sus datos asociados. Esta acción es definitiva y no se puede deshacer.
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500 font-semibold">
                  Para confirmar, escribí el slug exacto: <span className="font-bold text-slate-800">{orgSlug}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleDeletePermanent} className="mt-4 space-y-3">
              <input
                required
                type="text"
                value={deleteConfirmSlug}
                onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                placeholder={orgSlug}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />

              <div className="rounded-xl border border-red-100 bg-red-50/50 p-3.5 text-[11px] leading-4 text-red-700 font-semibold">
                ⚠️ Se eliminarán permanentemente membresías, leads, propiedades, conversaciones, historial de mensajes, configuraciones IA y el canal de WhatsApp.
              </div>

              {deleteError && (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {deleteError}
                </p>
              )}

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteConfirmSlug("");
                    setDeleteError("");
                  }}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-705 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || deleteConfirmSlug !== orgSlug}
                  className="flex-1 rounded-xl bg-red-650 hover:bg-red-700 py-2.5 text-xs font-black text-white transition disabled:opacity-50 shadow-sm shadow-red-500/25 animate-pulse"
                >
                  {isPending ? "Eliminando..." : "Eliminar físico"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
