"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export function SharePropertyButton({
  orgSlug,
  propertyId,
}: {
  orgSlug: string;
  propertyId: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/catalogo/${orgSlug}/${propertyId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-green-600">Link copiado</span>
        </>
      ) : (
        <>
          <Link2 className="h-4 w-4" />
          Compartir propiedad
        </>
      )}
    </button>
  );
}
