"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-slate-800 transition"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
