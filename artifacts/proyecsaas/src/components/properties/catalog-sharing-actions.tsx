"use client";

import { useState } from "react";
import { Copy, Check, MessageSquare, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type CatalogSharingActionsProps = {
  orgSlug: string;
  orgName: string;
};

export function CatalogSharingActions({ orgSlug, orgName }: CatalogSharingActionsProps) {
  const [copied, setCopied] = useState(false);

  // En un entorno Vercel/Railway real o localhost, esto construye la URL completa
  const getCatalogUrl = () => {
    if (typeof window === "undefined") return `/${orgSlug}/catalog`;
    return `${window.location.origin}/${orgSlug}/catalog`;
  };

  const catalogUrl = getCatalogUrl();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err);
    }
  };

  const handleWhatsAppShare = () => {
    const message = `Hola, te comparto nuestro catálogo de propiedades disponibles para que puedas ver más opciones: ${catalogUrl}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Botón original: Ver catálogo */}
      <Link
        href={`/${orgSlug}/catalog`}
        target="_blank"
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-soft"
      >
        <ExternalLink className="h-4 w-4" />
        <span className="hidden sm:inline">Ver catálogo</span>
      </Link>

      {/* Botón: Copiar Link */}
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition shadow-soft",
          copied 
            ? "border-green-200 bg-green-50 text-green-700" 
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        )}
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        {copied ? "¡Copiado!" : "Copiar link"}
      </button>

      {/* Botón: WhatsApp */}
      <button
        type="button"
        onClick={handleWhatsAppShare}
        className="flex items-center gap-2 rounded-2xl border border-green-600 bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 shadow-soft shadow-green-200/50"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>
    </div>
  );
}
