"use client";

import { useState } from "react";
import Link from "next/link";
import type { MetaChannelStatus } from "@/server/whatsapp/platform-channel-status";

type Props = {
  orgSlug: string;
  orgName: string;
  platformPhone: string | null;
  metaStatus: MetaChannelStatus;
  tenantChannels?: any[];
  connectionRequests?: any[];
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
  tenantChannels = [],
  connectionRequests = [],
}: Props) {
  const [copied, setCopied] = useState(false);

  // ── Priority Logic ───────────────────────────────────────────────────────────
  const activeTenantChannel = 
    tenantChannels.find((ch) => ch.isPrimary && ch.status === "ACTIVE") ||
    tenantChannels.find((ch) => ch.status === "ACTIVE");

  const hasOwnChannel = !!activeTenantChannel;
  const isPlatformFallback = !hasOwnChannel && !!platformPhone;
  const hasPendingRequest = !hasOwnChannel && connectionRequests.some(r => r.status === "PENDING" || r.status === "IN_REVIEW");

  // Determine which number to use for QR/Link
  // For Evolution API channels, derive phone from phoneNumberId (format: "evolution_<phone>") as fallback
  const activeTenantPhone = activeTenantChannel?.displayPhoneNumber ||
    (activeTenantChannel?.phoneNumberId?.startsWith("evolution_")
      ? activeTenantChannel.phoneNumberId.replace(/^evolution_/, "")
      : null);
  const activeNumber = hasOwnChannel ? activeTenantPhone : platformPhone;
  
  // Prefilled text: if platform fallback, MUST include [ref:slug]
  const routingCode = `[ref:${orgSlug}]`;
  const prefilledText = isPlatformFallback 
    ? `${routingCode} Hola, me interesan sus propiedades.`
    : `Hola, me interesan sus propiedades de ${orgName}.`;

  const waLink = activeNumber
    ? `https://wa.me/${activeNumber.replace(/\D/g, '')}?text=${encodeURIComponent(prefilledText)}`
    : null;

  const qrSrc = waLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(waLink)}&margin=10`
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

  // ── Status flags ─────────────────────────────────────────────────────────────
  const platformFullyActive = !!platformPhone && metaStatus === "connected";

  return (
    <div className="space-y-6">

      {/* ── CASE A: Own active channel ────────────────────────────────────────── */}
      {hasOwnChannel && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-bold text-emerald-900">Canal exclusivo y personalizado activo</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-800 font-medium">
                Tu inmobiliaria está operando con su propia línea exclusiva de WhatsApp Business. Todas las consultas de tus clientes y las respuestas automáticas de tu Agente IA se procesan directamente desde tu propio número, reforzando la identidad de tu marca.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
              Marca Propia
            </span>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-white/50 border border-emerald-100 inline-block">
            <p className="text-sm font-mono font-bold text-emerald-950">
              {(() => {
                const phone = activeTenantChannel.displayPhoneNumber ||
                  (activeTenantChannel.phoneNumberId?.startsWith("evolution_")
                    ? activeTenantChannel.phoneNumberId.replace(/^evolution_/, "")
                    : null);
                return phone ? `📱 +${phone.replace(/\D/g, "")}` : "📱 Canal activo — número pendiente de sincronización";
              })()}
            </p>
          </div>
        </div>
      )}

      {/* ── CASE B: Platform fallback ────────────────────────────────────────── */}
      {isPlatformFallback && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <p className="text-sm font-bold text-blue-900">Canal rápido compartido (Línea Oficial)</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-blue-800 font-medium">
                Estás utilizando la línea oficial compartida de la plataforma (<b>+{platformPhone}</b>). Este canal es 100% gratuito y está listo para recibir consultas de inmediato sin configuraciones.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-blue-700 bg-white/40 rounded-xl p-3 border border-blue-100/50">
                💡 <b>¿Cómo se enrutan los mensajes?</b> Al compartir el catálogo, el sistema antepone un código único como <code>[ref:{orgSlug}]</code> al inicio del mensaje del cliente. Nuestro sistema inteligente lo lee de forma invisible para la IA y deriva la oportunidad a tu panel de control de forma automática.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
              Compartido
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/${orgSlug}/settings/integrations/whatsapp`} className="text-xs font-bold text-blue-800 hover:underline flex items-center gap-1">
              🚀 Conectar mi número propio (QR o Meta) →
            </Link>
          </div>
        </div>
      )}

      {/* ── CASE C: Pending request ───────────────────────────────────────────── */}
      {hasPendingRequest && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <div className="flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <p className="text-sm font-bold text-amber-900">Solicitud de conexión pendiente</p>
              <p className="mt-0.5 text-sm text-amber-800">
                Estamos procesando tu solicitud para conectar tu propio número. Mientras tanto, podés seguir usando el canal compartido.
              </p>
            </div>
          </div>
          <Link href={`/${orgSlug}/settings/integrations/whatsapp`} className="mt-3 inline-block text-xs font-bold text-amber-700 hover:underline">
            Ver estado de solicitud
          </Link>
        </div>
      )}

      {/* ── CASE D: No channel active ─────────────────────────────────────────── */}
      {!activeNumber && !hasOwnChannel && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-xl mb-4">⚠️</div>
          <p className="text-sm font-bold text-rose-900">No hay un canal de WhatsApp activo</p>
          <p className="mt-1 text-sm text-rose-800">
            Necesitás configurar al menos un canal para generar tu enlace de captación.
          </p>
          <Link href={`/${orgSlug}/settings/integrations/whatsapp`} className="mt-4 inline-block rounded-full bg-rose-600 px-6 py-2 text-sm font-bold text-white hover:bg-rose-700 transition">
            Configurar WhatsApp
          </Link>
        </div>
      )}

      {/* ── QR + Link Section ────────────────────────────────────────────────── */}
      {activeNumber && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-bold text-slate-950">Tu código QR de Captación</p>
              <p className="mt-1 text-xs text-slate-500">
                Escaneá este código para probar el flujo de entrada.
              </p>
            </div>
            <div className="flex gap-2">
               <Link href={`/${orgSlug}/settings/integrations/whatsapp`} className="text-xs font-bold text-slate-500 hover:text-slate-700 underline">
                Gestionar canales
              </Link>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
            {/* QR code */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex-shrink-0 rounded-[2rem] border-4 border-white bg-white p-4 shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc!}
                  alt={`Código QR de WhatsApp para ${orgName}`}
                  width={200}
                  height={200}
                  className="block"
                />
              </div>
              <a href={qrSrc!} download={`qr-whatsapp-${orgSlug}.png`} className="text-xs font-bold text-brand-600 hover:underline">
                Descargar QR (PNG)
              </a>
            </div>

            {/* Link + copy */}
            <div className="min-w-0 space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Enlace para compartir
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={waLink!}
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-shrink-0 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none"
                  >
                    {copied ? "¡Copiado!" : "Copiar enlace"}
                  </button>
                </div>
              </div>

              {isPlatformFallback && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Código de identificación necesario
                  </label>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2">
                      {routingCode}
                    </p>
                    <p className="text-xs text-slate-400 max-w-[240px]">
                      Como usás el canal compartido, este código permite que los mensajes lleguen a tu panel.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-900">Uso recomendado:</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Pegalo en la Bio de Instagram, en el botón de WhatsApp de tu web o en tus anuncios de Meta Ads.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
