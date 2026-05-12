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
} from "@/modules/platform/actions";
import { MoreVertical, Copy, UserX, UserPlus, X, AlertTriangle, PowerOff, Bot, Power, Key } from "lucide-react";

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
}: {
  orgSlug: string;
  orgName: string;
  ownerEmail: string | null;
  hasUsers: boolean;
  isActive: boolean;
  maxAiAgents: number | null;
  aiAgentCount: number;
  agentQuotaNote?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dropdown state (mobile / tablet only)
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
      alert("Enlace copiado al portapapeles.");
    }
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
            className="w-56 origin-top-right rounded-xl border border-slate-200/60 bg-white shadow-enterprise"
          >
            {/* Onboarding actions */}
            <div className="py-1">
              {hasUsers ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setCleanModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] font-semibold text-red-600 hover:bg-red-50"
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
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Crear 1Âº Acceso</span>
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
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] font-semibold text-brand-700 hover:bg-brand-50"
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
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] font-bold text-red-700 hover:bg-red-50 transition-colors"
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
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
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
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Bot className="h-4 w-4 text-brand-600" />
                <span>Agentes IA ({aiAgentCount}/{maxAiAgents})</span>
              </button>
            </div>

            {/* Soporte tÃ©cnico (excepcional) */}
            <div className="border-t border-slate-100 py-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setSupportModalOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Soporte tÃ©cnico</span>
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="inline-block">
      {/* â”€â”€ DESKTOP: acciones inline visibles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* hidden on mobile/tablet, shown as stacked action links on lg+ */}
      <div className="hidden lg:flex flex-col items-end gap-0.5">
        {/* AcciÃ³n principal de onboarding */}
        {hasUsers ? (
          <button
            type="button"
            onClick={() => setCleanModalOpen(true)}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            Limpiar accesos
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap"
          >
            Crear 1Âº Acceso
          </button>
        )}

        {/* Reiniciar Clave â€” solo si hay usuario */}
        {hasUsers && ownerEmail && (
          <button
            type="button"
            onClick={() => {
              setResetUrl(null);
              setResetError("");
              setResetModalOpen(true);
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-brand-600 hover:bg-brand-50 transition-colors whitespace-nowrap"
          >
            Reiniciar Clave
          </button>
        )}

        {/* Suspender / Reactivar */}
        {isActive ? (
          <button
            type="button"
            onClick={() => setDeactivateModalOpen(true)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <PowerOff className="h-3 w-3" />
            Suspender
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setReactivateModalOpen(true)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors whitespace-nowrap border border-emerald-200"
          >
            <Power className="h-3 w-3" />
            Reactivar
          </button>
        )}

        {/* Agentes IA â€” secundaria */}
        <button
          type="button"
          onClick={() => {
            setQuotaValue(maxAiAgents ?? 1);
            setQuotaNote("");
            setQuotaError("");
            setQuotaSuccess("");
            setQuotaModalOpen(true);
          }}
          className="rounded-lg px-3 py-1.5 text-sm font-bold text-brand-700 hover:bg-brand-50 transition-colors whitespace-nowrap"
        >
          <Bot className="inline h-3.5 w-3.5 mr-1" />
          Agentes ({aiAgentCount}/{maxAiAgents})
        </button>

        {/* Soporte tÃ©cnico â€” terciaria, apenas visible */}
        <button
          type="button"
          onClick={() => setSupportModalOpen(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
        >
          Soporte
        </button>
      </div>

      {/* â”€â”€ MOBILE / TABLET: menÃº â‹® â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex lg:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition"
        >
          <MoreVertical className="h-4 w-4" />
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
                <h3 className="font-bold text-slate-900">Acceso de Soporte TÃ©cnico</h3>
                <p className="text-xs text-slate-500">{orgName}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-700">
              EstÃ¡s por acceder al <strong>workspace privado</strong> de este cliente como operador
              de soporte de plataforma.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Esta acciÃ³n es de carÃ¡cter excepcional. Solo debe usarse para resolver incidencias
              tÃ©cnicas.
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
              operativos permanecerÃ¡n intactos.
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
              CreÃ¡ el administrador inicial (Titular) para <strong>{orgName}</strong>.
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
                      Correo electrÃ³nico
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
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ãšltimo registro</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{agentQuotaNote}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleQuota} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Agentes habilitados (mÃ¡ximo)
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
                  Motivo / nota de facturaciÃ³n
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Factura #42 â€” $15/mes â€” Marzo 2026"
                  value={quotaNote}
                  onChange={(e) => setQuotaNote(e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                <p className="mt-1 text-xs text-slate-400">Opcional. Se guarda con fecha y hora automÃ¡ticos.</p>
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
                Todos los usuarios con membresÃ­a activa podrÃ¡n ingresar nuevamente.
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
                {isPending ? "Reactivando..." : "Confirmar reactivaciÃ³n"}
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
                Esta acciÃ³n desactivarÃ¡ permanentemente el acceso al workspace.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-red-700 list-disc list-inside">
                <li>Los usuarios de esta inmobiliaria no podrÃ¡n ingresar</li>
                <li>Los datos quedarÃ¡n archivados pero inaccesibles</li>
                <li>La automatizaciÃ³n IA dejarÃ¡ de procesar esta cuenta</li>
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

      {/* â”€â”€ RESET PASSWORD MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              La clave actual dejarÃ¡ de funcionar hasta que el usuario establezca una nueva.
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
                    onClick={() => {
                      navigator.clipboard.writeText(resetUrl);
                      alert("Enlace copiado.");
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-200 text-brand-800 hover:bg-brand-300 transition"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  CopiÃ¡ este link y enviaselo al cliente por WhatsApp. 
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
    </div>
  );
}
