"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Globe, ArrowRight, X, Loader2 } from "lucide-react";
import { createPropertyAction } from "@/modules/properties/actions";
import { updatePropertySourceAction } from "@/modules/organizations/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  // â”€â”€â”€ Manual creation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Sync from URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleSyncSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = (formData.get("sourceUrl") as string)?.trim();
    if (!url) return;

    setSyncStatus("loading");
    setSyncMessage(null);

    const saveRes = await updatePropertySourceAction(orgSlug, {
      propertySourceUrl: url,
      propertySourceType: "website",
    });

    if (!saveRes.success) {
      setSyncStatus("error");
      setSyncMessage(saveRes.message || "Error al guardar la fuente.");
      return;
    }

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

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="primary"
        className="rounded-full shadow-lg shadow-brand-500/20"
      >
        Cargar propiedad
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/40 px-6 py-4">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
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

            {/* â”€â”€ Mode Selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {mode === "selector" && (
              <div className="px-6 py-6 flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Selecciona el método de carga
                </p>

                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-brand-100 group-hover:text-brand-600">
                    <FileText className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">Carga manual</p>
                    <p className="text-xs text-slate-500 leading-relaxed">Ingresar datos ficha por ficha manualmente.</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-brand-500" />
                </button>

                <button
                  type="button"
                  onClick={() => setMode("import")}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-emerald-100 group-hover:text-emerald-600">
                    <Globe className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">Sincronizar web</p>
                    <p className="text-xs text-slate-500 leading-relaxed">Conectar con tu sitio inmobiliario actual.</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-emerald-500" />
                </button>

                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="ghost" onClick={handleClose} className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Cancelar operación
                  </Button>
                </div>
              </div>
            )}

            {/* â”€â”€ Manual form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {mode === "manual" && (
              <div className="px-6 py-6">
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Carga los datos principales. Al finalizar, podrás completar fotos y detalles técnicos en la ficha de propiedad.
                </p>

                {error && (
                  <div className="mb-4 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-600 border border-red-100">
                    {error}
                  </div>
                )}

                <form onSubmit={handleManualSubmit} className="flex flex-col gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Título comercial
                    </label>
                    <Input required name="title" placeholder="Ej. Depto 2 amb. luminoso con balcón" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dirección</label>
                    <Input required name="address" placeholder="Calle y número" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ciudad</label>
                      <Input required name="city" placeholder="Ej. CABA" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Precio (USD)</label>
                      <Input required type="number" min="0" name="priceCents" defaultValue="0" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setMode("selector")}
                      className="text-xs font-bold uppercase tracking-widest"
                    >
                      â† Volver
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending}
                      variant="primary"
                      className="min-w-[140px]"
                    >
                      {isPending ? "Procesando..." : "Crear propiedad"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* â”€â”€ Sync from URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {mode === "import" && (
              <div className="px-6 py-6">
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Nuestra IA escaneará tu sitio web para extraer las fichas automáticamente. Asegúrate de que sea una página de listado.
                </p>

                {syncStatus === "success" && (
                  <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-100">
                    {syncMessage}
                  </div>
                )}
                {syncStatus === "error" && (
                  <div className="mb-4 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-100">
                    {syncMessage}
                  </div>
                )}

                <form onSubmit={handleSyncSubmit} className="flex flex-col gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      URL del listado
                    </label>
                    <Input
                      required
                      name="sourceUrl"
                      type="url"
                      placeholder="https://tuweb.com/propiedades"
                      disabled={syncStatus === "loading" || syncStatus === "success"}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Soporta sitios inmobiliarios estándar y portales compatibles.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setMode("selector")}
                      disabled={syncStatus === "loading"}
                      className="text-xs font-bold uppercase tracking-widest"
                    >
                      â† Volver
                    </Button>
                    <Button
                      type="submit"
                      disabled={syncStatus === "loading" || syncStatus === "success"}
                      variant={syncStatus === "success" ? "success" : "primary"}
                      className="min-w-[180px]"
                    >
                      {syncStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {syncStatus === "loading" ? "Escaneando sitio..." : syncStatus === "success" ? "¡Importado!" : "Iniciar sincronización"}
                    </Button>
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
