"use client";

import { useState } from "react";
import type { MetaChannelStatus } from "@/server/whatsapp/platform-channel-status";

type Props = {
  orgSlug: string;
  orgName: string;
  platformPhone: string | null;
  metaStatus: MetaChannelStatus;
};

// ─── Status helpers ───────────────────────────────────────────────────────────

function PhoneStatusBadge({ phone }: { phone: string | null }) {
  if (phone) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Número configurado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
      Número pendiente
    </span>
  );
}

function MetaBadge({ status }: { status: MetaChannelStatus }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Canal Meta activo
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        Configuración parcial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
      Canal no configurado
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WhatsAppConnectionForm({
  orgSlug,
  orgName,
  platformPhone,
  metaStatus,
}: Props) {
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
      // silent
    }
  }

  // ── Status panel ─────────────────────────────────────────────────────────────

  const fullyActive = !!platformPhone && metaStatus === "connected";

  return (
    <div className="space-y-5">

      {/* ── Estado del canal ─────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${
        fullyActive
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-slate-200 bg-slate-50/60"
      }`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Canal administrado por la plataforma</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              El número oficial de WhatsApp y la conexión con Meta Cloud API son gestionados
              centralmente por el superadmin. No necesitás hacer ninguna configuración adicional.
            </p>
          </div>
          {fullyActive ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Canal activo
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              En configuración
            </span>
          )}
        </div>

        {/* Sub-estados: número + Meta */}
        <div className="mt-4 flex flex-wrap gap-2">
          <PhoneStatusBadge phone={platformPhone} />
          <MetaBadge status={metaStatus} />
        </div>
      </div>

      {/* ── Número no configurado ────────────────────────────────────────────── */}
      {!platformPhone && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <p className="text-sm font-semibold text-amber-900">Número de plataforma pendiente</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            El superadmin aún no configuró el número de WhatsApp de la plataforma. Sin este número
            no es posible generar el enlace ni el código QR. Contactalo para activar este canal.
          </p>
        </div>
      )}

      {/* ── Meta no conectado (pero número OK) ──────────────────────────────── */}
      {platformPhone && metaStatus !== "connected" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <p className="text-sm font-semibold text-amber-900">
            {metaStatus === "partial"
              ? "Conexión con Meta incompleta"
              : "Canal Meta no conectado"}
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            {metaStatus === "partial"
              ? "La integración con Meta Cloud API está configurada parcialmente. El superadmin debe completar las credenciales (Phone Number ID, Access Token y Organization ID)."
              : "La plataforma aún no está conectada a Meta Cloud API. Los mensajes entrantes no se procesarán hasta que el superadmin complete la integración."}
          </p>
          <p className="mt-3 text-sm leading-6 text-amber-800">
            Tu enlace y código QR están disponibles, pero los mensajes no llegarán hasta que el canal
            Meta esté activo.
          </p>
        </div>
      )}

      {/* ── QR + enlace (solo si hay número, independiente del estado Meta) ─── */}
      {platformPhone && (
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
      )}

      {/* ── Cómo funciona (solo cuando está completamente activo) ────────────── */}
      {fullyActive && (
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
      )}
    </div>
  );
}
