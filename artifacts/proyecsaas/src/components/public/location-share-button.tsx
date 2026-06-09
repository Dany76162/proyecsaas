"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

interface LocationShareButtonProps {
  url: string;
  className?: string;
}

export default function LocationShareButton({ url, className }: LocationShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback para entornos sin Clipboard API
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Si falla silenciosamente, no hacemos nada (el usuario ya tiene el link visible)
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        "inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition bg-slate-700/60 border border-slate-600/50 px-3 py-1.5 rounded-full"
      }
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          Link copiado
        </>
      ) : (
        <>
          <Link2 className="h-3.5 w-3.5" />
          Copiar ubicación
        </>
      )}
    </button>
  );
}
