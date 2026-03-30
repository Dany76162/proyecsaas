"use client";

import { useState, useTransition } from "react";
import {
  addPropertyImageAction,
  removePropertyImageAction,
  setPropertyImagePrimaryAction,
} from "@/modules/properties/actions";
import type { PropertyImageItem } from "@/modules/properties/types";

interface PropertyImageGalleryProps {
  orgSlug: string;
  propertyId: string;
  images: PropertyImageItem[];
}

export function PropertyImageGallery({ orgSlug, propertyId, images }: PropertyImageGalleryProps) {
  const [isPending, startTransition] = useTransition();
  const [urlInput, setUrlInput] = useState("");
  const [altInput, setAltInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addPropertyImageAction(orgSlug, {
        propertyId,
        url: urlInput.trim(),
        altText: altInput.trim() || undefined,
        isPrimary: images.length === 0,
      });
      if (result.success) {
        setUrlInput("");
        setAltInput("");
      } else {
        setError(result.message ?? "Error al agregar imagen.");
      }
    });
  }

  function handleRemove(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removePropertyImageAction(orgSlug, { imageId, propertyId });
      if (!result.success) {
        setError(result.message ?? "Error al eliminar.");
      }
    });
  }

  function handleSetPrimary(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setPropertyImagePrimaryAction(orgSlug, { imageId, propertyId });
      if (!result.success) {
        setError(result.message ?? "Error.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Image grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.id}
              className={`group relative overflow-hidden rounded-2xl border bg-slate-100 ${img.isPrimary ? "border-brand-400 ring-2 ring-brand-200" : "border-slate-200"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.altText ?? "Imagen de propiedad"}
                className="h-36 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='144' viewBox='0 0 200 144'%3E%3Crect width='200' height='144' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='12' fill='%2394a3b8'%3EImagen no disponible%3C/text%3E%3C/svg%3E";
                }}
              />
              {img.isPrimary && (
                <span className="absolute left-2 top-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                  Principal
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-slate-900/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.isPrimary && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSetPrimary(img.id)}
                    className="flex-1 rounded-lg bg-white/90 py-1 text-[10px] font-semibold text-slate-800 transition hover:bg-white disabled:opacity-50"
                  >
                    Principal
                  </button>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRemove(img.id)}
                  className="flex-1 rounded-lg bg-red-500/90 py-1 text-[10px] font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Sin imágenes cargadas. Agregá la primera URL.</p>
      )}

      {/* Add image form */}
      {error && (
        <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
      <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">URL de imagen</label>
          <input
            required
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://ejemplo.com/foto.jpg"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Descripción (opcional)
          </label>
          <input
            type="text"
            value={altInput}
            onChange={(e) => setAltInput(e.target.value)}
            placeholder="Ej. Dormitorio principal"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !urlInput.trim()}
          className="shrink-0 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
        >
          {isPending ? "Agregando..." : "Agregar"}
        </button>
      </form>
      <p className="text-xs text-slate-400">
        La primera imagen agregada se marca como principal automáticamente. Pasá el cursor sobre una imagen para cambiarla o eliminarla.
      </p>
    </div>
  );
}
