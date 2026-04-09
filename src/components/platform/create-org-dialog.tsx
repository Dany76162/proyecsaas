"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Building2 } from "lucide-react";
import { createOrganizationAction } from "@/modules/platform/actions";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function CreateOrgDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [city, setCity] = useState("");
  const [planLabel, setPlanLabel] = useState("");
  const [error, setError] = useState("");

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugManual) setSlug(slugify(v));
  };

  const handleSlugChange = (v: string) => {
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugManual(true);
  };

  const resetForm = () => {
    setName(""); setSlug(""); setSlugManual(false);
    setCity(""); setPlanLabel(""); setError("");
  };

  const handleClose = () => { resetForm(); setOpen(false); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await createOrganizationAction({ name, slug, city: city || undefined, planLabel: planLabel || undefined });
      if (res.success) {
        handleClose();
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        <Building2 className="h-4 w-4" />
        Nueva Inmobiliaria
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nueva Inmobiliaria</h2>
              <button onClick={handleClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Creá el tenant. El slug es permanente e identifica al workspace.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nombre de la inmobiliaria <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Raíces Pilar"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Slug del workspace <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900">
                  <span className="select-none text-slate-400 mr-1">/</span>
                  <input
                    required
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="raices-pilar"
                    className="flex-1 outline-none bg-transparent"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">Solo minúsculas, números y guiones. No se puede cambiar después.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ciudad</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ej: Pilar"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Plan</label>
                  <input
                    type="text"
                    value={planLabel}
                    onChange={(e) => setPlanLabel(e.target.value)}
                    placeholder="Ej: Starter"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !name || !slug}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {isPending ? "Creando..." : "Crear inmobiliaria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
