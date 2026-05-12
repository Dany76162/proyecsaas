"use client";

import { Printer } from "lucide-react";

export function PrintManualButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Imprimir manual
    </button>
  );
}
