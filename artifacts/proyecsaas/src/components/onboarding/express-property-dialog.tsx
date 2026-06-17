"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap, X, CheckCircle2, ArrowRight } from "lucide-react";
import { createExpressPropertyAction } from "@/app/[orgSlug]/(workspace)/onboarding/actions";

const OPERATIONS = ["Venta", "Alquiler"] as const;
const TYPES = ["Casa", "Departamento", "Lote", "Local", "Oficina", "Otro"] as const;

export function ExpressPropertyDialog({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  function open() {
    setError(null);
    setCreatedId(null);
    setIsOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      title: String(fd.get("title") ?? "").trim(),
      operationType: String(fd.get("operationType") ?? "").trim(),
      propertyType: String(fd.get("propertyType") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim(),
      priceUsd: parseFloat(String(fd.get("priceUsd") ?? "0").replace(/[^\d.]/g, "")) || 0,
    };

    startTransition(async () => {
      setError(null);
      const res = await createExpressPropertyAction(orgSlug, input);
      if (res.ok) {
        setCreatedId(res.propertyId);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-sm transition hover:bg-amber-600"
      >
        <Zap className="h-4 w-4" />
        Modo Express
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-amber-50/50 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
                <Zap className="h-5 w-5 text-amber-500" /> Carga Express
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createdId ? (
              <div className="px-6 py-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">¡Propiedad publicada!</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Ya está disponible y visible para que tu agente IA la ofrezca en las conversaciones.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <a
                    href={`/${orgSlug}/properties/${createdId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800"
                  >
                    Completar fotos y detalles <ArrowRight className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 transition hover:bg-slate-50"
                  >
                    Seguir con la puesta en marcha
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-6">
                <p className="mb-5 text-xs leading-relaxed text-slate-500">
                  Lo mínimo para que la IA tenga algo que ofrecer. Se publica al instante; las fotos
                  y el resto los cargás después.
                </p>

                {error && (
                  <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs font-semibold text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Título comercial</label>
                    <input
                      required
                      name="title"
                      placeholder="Ej. Depto 2 amb. luminoso con balcón"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operación</label>
                      <select
                        name="operationType"
                        required
                        defaultValue=""
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                      >
                        <option value="" disabled>Elegí…</option>
                        {OPERATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo</label>
                      <select
                        name="propertyType"
                        required
                        defaultValue=""
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                      >
                        <option value="" disabled>Elegí…</option>
                        {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ciudad / zona</label>
                      <input
                        required
                        name="city"
                        placeholder="Ej. CABA"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Precio (USD)</label>
                      <input
                        required
                        type="number"
                        min="0"
                        name="priceUsd"
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-amber-600 disabled:opacity-60"
                  >
                    <Zap className="h-4 w-4" />
                    {isPending ? "Publicando…" : "Publicar propiedad"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
