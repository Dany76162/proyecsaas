"use client";

import { useState } from "react";

type WhatsAppPlatformDisplayProps = {
  orgSlug: string;
  orgName: string;
  platformPhone: string | null;
};

export function WhatsAppConnectionForm({
  orgSlug,
  orgName,
  platformPhone,
}: WhatsAppPlatformDisplayProps) {
  const [copied, setCopied] = useState(false);

  const routingCode = `[ref:${orgSlug}]`;
  const prefilledText = `${routingCode} Hola, me interesan sus propiedades.`;
  const waLink = platformPhone
    ? `https://wa.me/${platformPhone}?text=${encodeURIComponent(prefilledText)}`
    : null;

  const qrSrc = waLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(waLink)}&margin=10`
    : null;

  async function handleCopy() {
    if (!waLink) return;
    try {
      await navigator.clipboard.writeText(waLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text from an input
    }
  }

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div>
          <p className="text-sm font-semibold text-slate-950">Canal administrado por la plataforma</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Tu número de WhatsApp está configurado y gestionado centralmente. No necesitás hacer
            ninguna configuración adicional.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Activo
        </span>
      </div>

      {platformPhone ? (
        <>
          {/* QR + link section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-sm font-semibold text-slate-950">Tu enlace de WhatsApp</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Compartí este enlace o código QR en tu sitio web, redes sociales o avisos. Cuando un
              cliente lo toque, se abrirá WhatsApp listo para escribirte.
            </p>

            <div className="mt-5 flex flex-wrap gap-6">
              {/* QR code */}
              <div className="flex-shrink-0 rounded-xl border border-slate-200 bg-white p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc!}
                  alt={`Código QR de WhatsApp para ${orgName}`}
                  width={180}
                  height={180}
                  className="block"
                />
              </div>

              {/* Link + copy */}
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Enlace para compartir
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={waLink!}
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
                    >
                      {copied ? "¡Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Código de identificación
                  </label>
                  <p className="mt-2 font-mono text-sm text-slate-700 bg-slate-100 rounded-xl px-3 py-2 inline-block">
                    {routingCode}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
            <p className="text-sm font-semibold text-blue-900">¿Cómo funciona?</p>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-blue-800 list-none">
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">1</span>
                Copiá el enlace de arriba y ponelo en tu sitio web o redes sociales como botón de WhatsApp.
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">2</span>
                Cuando un cliente lo toque, se abrirá WhatsApp con un mensaje pre-completado listo para enviar.
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">3</span>
                El sistema identifica automáticamente que el mensaje es para <strong>{orgName}</strong> y lo asigna a tu agente de IA.
              </li>
            </ol>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <p className="text-sm font-semibold text-amber-900">Número de plataforma pendiente</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            El superadmin aún no configuró el número de WhatsApp de la plataforma. Contactalo para
            activar este canal.
          </p>
        </div>
      )}
    </div>
  );
}
