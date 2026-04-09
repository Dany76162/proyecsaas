"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Globe, ArrowRight, X, Loader2 } from "lucide-react";
import { createPropertyAction } from "@/modules/properties/actions";
import { updatePropertySourceAction } from "@/modules/organizations/actions";
import { cn } from "@/lib/utils";

type Mode = "selector" | "manual" | "import";

export function CreatePropertyDialog({ orgSlug }: { orgSlug: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("selector");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const router = useRouter();

  function handleOpen() {
    setError(null);
    setMode("selector");
    setSyncStatus("idle");
    setSyncMessage(null);
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  // ─── Manual creation ───────────────────────────────────────────────────────
  async function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      priceCents:
        Math.round(
          parseFloat(
            String(formData.get("priceCents") ?? "0").replace(
              /[,.](?=(\d{3})+(?!\d))/g,
              ""
            )
          ) * 100
        ) || 0,
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

  // ─── Sync from URL (Reusing Organization logic) ───────────────────────────
  async function handleSyncSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = (formData.get("sourceUrl") as string)?.trim();
    if (!url) return;

    setSyncStatus("loading");
    setSyncMessage(null);

    // 1. REUSE: Save the URL to the organization first (always overwrite as requested)
    const saveRes = await updatePropertySourceAction(orgSlug, {
      propertySourceUrl: url,
      propertySourceType: "website",
    });

    if (!saveRes.success) {
      setSyncStatus("error");
      setSyncMessage(saveRes.message || "Error al guardar la configuración de la fuente.");
      return;
    }

    // 2. REUSE: Trigger the sync API (now it will read the URL from DB)
    try {
      const res = await fetch("/api/properties/sync-from-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setSyncStatus("success");
        setSyncMessage(`Sincronización exitosa: ${json.total} propiedades procesadas.`);
        setTimeout(() => {
          router.refresh();
          handleClose();
        }, 2500);
      } else {
        setSyncStatus("error");
        setSyncMessage(json.error ?? "Error al sincronizar propiedades.");
      }
    } catch {
      setSyncStatus("error");
      setSyncMessage("Error de red al conectar con el servidor.");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500";

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
          <div className="w-full max-w-md rounded-[1.5rem] bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {mode === "selector" && "Agregar propiedades"}
                {mode === "manual" && "Alta manual"}
                {mode === "import" && "Sincronizar desde web"}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Mode Selector ─────────────────────────────────────────── */}
            {mode === "selector" && (
              <div className="px-6 py-5 flex flex-col gap-3">
                <p className="text-sm text-slate-500 mb-1">
                  ¿Cómo querés agregar propiedades al catálogo?
                </p>

                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-400 hover:bg-brand-50/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-brand-100 group-hover:text-brand-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">Carga manual</p>
                    <p className="text-sm text-slate-500">Creá una propiedad desde cero ingresando los datos</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-brand-500" />
                </button>

                <button
                  type="button"
                  onClick={() => setMode("import")}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-emerald-100 group-hover:text-emerald-600">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">Sincronizar desde web</p>
                    <p className="text-sm text-slate-500">Traé automáticamente las fichas de tu sitio actual</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-emerald-500" />
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* ── Manual form ────────────────────────────────────────────── */}
            {mode === "manual" && (
              <div className="px-6 py-5">
                <p className="text-sm text-slate-500">
                  Cargá los datos mínimos. Al guardar, vas directo a la ficha completa para agregar precio, fotos y más.
                </p>

                {error && (
                  <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                    {error}
                  </div>
                )}

                <form onSubmit={handleManualSubmit} className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Nombre / Título comercial
                    </label>
                    <input required name="title" className={inputClass} placeholder="Ej. Departamento luminoso en Palermo" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Dirección</label>
                    <input required name="address" className={inputClass} placeholder="Ej. Av. Santa Fe 1234" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Ciudad</label>
                    <input required name="city" className={inputClass} placeholder="Ej. Buenos Aires" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Precio inicial{" "}
                      <span className="font-normal text-slate-400">(podés ajustarlo después)</span>
                    </label>
                    <input required type="number" min="0" name="priceCents" className={inputClass} defaultValue="0" />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() => setMode("selector")}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
                    >
                      ← Volver
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
                    >
                      {isPending ? "Creando..." : "Crear y completar →"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Sync from URL ──────────────────────────────────────────── */}
            {mode === "import" && (
              <div className="px-6 py-5">
                <p className="text-sm text-slate-500">
                  Ingresá la URL de tu web inmobiliaria. El sistema sincronizará las propiedades y las guardará en tu catálogo.
                </p>

                {syncStatus === "success" && (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-100">
                    ✅ {syncMessage}
                  </div>
                )}
                {syncStatus === "error" && (
                  <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                    ❌ {syncMessage}
                  </div>
                )}

                <form onSubmit={handleSyncSubmit} className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      URL de la fuente (página de listado)
                    </label>
                    <input
                      required
                      name="sourceUrl"
                      type="url"
                      className={inputClass}
                      placeholder="https://tu-inmobiliaria.com/propiedades"
                      disabled={syncStatus === "loading" || syncStatus === "success"}
                    />
                    <p className="mt-1.5 text-xs text-slate-400">
                      Se actualizará como tu fuente oficial de propiedades.
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() => setMode("selector")}
                      disabled={syncStatus === "loading"}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      ← Volver
                    </button>
                    <button
                      type="submit"
                      disabled={syncStatus === "loading" || syncStatus === "success"}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50",
                        syncStatus === "success"
                          ? "bg-emerald-500"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      )}
                    >
                      {syncStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {syncStatus === "loading" ? "Sincronizando..." : syncStatus === "success" ? "¡Listo!" : "Sincronizar propiedades →"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
