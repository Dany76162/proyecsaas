"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPropertyAction } from "@/modules/properties/actions";

export function CreatePropertyDialog({ orgSlug }: { orgSlug: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleOpen() {
    setError(null);
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      priceCents: Math.round(parseFloat(String(formData.get("priceCents") ?? "0").replace(/[,.](?=(\d{3})+(?!\d))/g, "")) * 100) || 0,
    };

    startTransition(async () => {
      setError(null);
      const result = await createPropertyAction(orgSlug, data);

      if (result.success && result.data?.propertyId) {
        router.push(`/${orgSlug}/properties/${result.data.propertyId}?success=property-created`);
      } else {
        setError(result.message || "Error al guardar la propiedad.");
      }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        Cargar propiedad
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Alta rápida de propiedad
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Cargá los datos mínimos para crear la propiedad. Al guardar, vas directo a la ficha
              completa para agregar precio, descripción, características, fotos y más.
            </p>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nombre / Título comercial
                </label>
                <input
                  required
                  name="title"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  placeholder="Ej. Departamento luminoso en Palermo"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Dirección
                </label>
                <input
                  required
                  name="address"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  placeholder="Ej. Av. Santa Fe 1234"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Ciudad
                </label>
                <input
                  required
                  name="city"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  placeholder="Ej. Buenos Aires"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Precio inicial{" "}
                  <span className="font-normal text-slate-400">(podés ajustarlo después)</span>
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  name="priceCents"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  defaultValue="0"
                />
              </div>

              <div className="mt-3 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
                >
                  {isPending ? "Creando..." : "Crear y completar ficha →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
