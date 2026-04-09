"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Building2, Copy, Check, MessageCircle } from "lucide-react";
import { quickOnboardOrgAction } from "@/modules/platform/actions";

export function CreateOrgDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form fields
  const [orgName, setOrgName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [error, setError] = useState("");

  // Result state
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setOrgName("");
    setOwnerEmail("");
    setOwnerPhone("");
    setError("");
    setInviteUrl(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await quickOnboardOrgAction({ orgName, ownerEmail });
      if (res.success && res.data?.inviteUrl) {
        setInviteUrl(res.data.inviteUrl as string);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildWhatsAppUrl = () => {
    if (!inviteUrl) return "#";
    const phone = ownerPhone.replace(/\D/g, "");
    const text = `¡Hola! Te envío el acceso a tu panel de gestión en Raíces Pilot.\n\nIngresá con este link y creá tu contraseña:\n${inviteUrl}\n\nEl link es válido por 7 días.`;
    const encoded = encodeURIComponent(text);
    return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 sm:w-auto sm:justify-start"
      >
        <Building2 className="h-4 w-4" />
        Nueva Inmobiliaria
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Nueva Inmobiliaria</h2>
                  <p className="text-xs text-slate-500">Se genera el acceso automáticamente</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!inviteUrl ? (
              /* ── Formulario ── */
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Nombre de la inmobiliaria <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ej: Raíces Pilar"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Email del titular <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="titular@ejemplo.com"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-slate-400">El titular usará este email para ingresar.</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    WhatsApp del titular
                    <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional, para compartir el link)</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition">
                    <span className="mr-2 text-slate-400 select-none">+</span>
                    <input
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="549XXXXXXXXXX"
                      className="flex-1 outline-none bg-transparent"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Código de país + número. Ej: 549341XXXXXXX</p>
                </div>

                {error && (
                  <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !orgName.trim() || !ownerEmail.trim()}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    {isPending ? "Creando acceso..." : "Crear y generar link"}
                  </button>
                </div>
              </form>
            ) : (
              /* ── Resultado: link listo ── */
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-800">
                    ¡Listo! Inmobiliaria creada y link de acceso generado.
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-700">
                    Válido por 7 días. El titular crea su contraseña al entrar.
                  </p>
                </div>

                {/* Link con botón copiar */}
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Link de acceso
                  </p>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <p className="flex-1 truncate px-2 text-sm font-mono text-slate-700">
                      {inviteUrl}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                        copied
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1ebe5c]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {ownerPhone ? "Enviar por WhatsApp" : "Compartir por WhatsApp"}
                  </a>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
