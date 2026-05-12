"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, MessageSquare, QrCode } from "lucide-react";

type CaptureLinkActionsProps = {
  waLink: string | null;
  qrUrl: string | null;
};

export function CaptureLinkActions({ waLink, qrUrl }: CaptureLinkActionsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!waLink) return;

    try {
      await navigator.clipboard.writeText(waLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Enlace listo para compartir
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={waLink ?? "Canal de plataforma no configurado todavia"}
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!waLink}
            className={`inline-flex shrink-0 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
              copied
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            }`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={waLink ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <MessageSquare className="h-4 w-4" />
          Abrir enlace
        </a>
        <a
          href={qrUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <QrCode className="h-4 w-4" />
          Ver QR
        </a>
        <a
          href={waLink ? `https://wa.me/?text=${encodeURIComponent(waLink)}` : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <ExternalLink className="h-4 w-4" />
          Compartir por WhatsApp
        </a>
      </div>
    </div>
  );
}
