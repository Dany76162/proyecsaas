"use client";

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
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

type ActiveTab = "upload" | "url";

// Convert a Google Drive share URL to a direct-access URL.
// Works for "Anyone with the link" public files.
function convertDriveUrl(input: string): string {
  // https://drive.google.com/file/d/{id}/view...
  const fileMatch = input.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  // https://drive.google.com/open?id={id}
  const openMatch = input.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  return input;
}

function isDriveUrl(input: string) {
  return input.includes("drive.google.com");
}

export function PropertyImageGallery({ orgSlug, propertyId, images }: PropertyImageGalleryProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [altInput, setAltInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isPendingUrl, startUrlTransition] = useTransition();
  const [isPendingAction, startActionTransition] = useTransition();

  async function handleUploadSuccess(result: any) {
    if (result.event === "success") {
      const info = result.info;
      const isFirst = images.length === 0;
      await addPropertyImageAction(orgSlug, {
        propertyId,
        url: info.secure_url,
        altText: info.original_filename || "Imagen de propiedad",
        isPrimary: isFirst,
      });
      router.refresh();
    }
  }

  function handleUrlAdd(e: React.FormEvent) {
    e.preventDefault();
    setUrlError(null);
    const resolved = convertDriveUrl(urlInput.trim());
    startUrlTransition(async () => {
      const result = await addPropertyImageAction(orgSlug, {
        propertyId,
        url: resolved,
        altText: altInput.trim() || undefined,
        isPrimary: images.length === 0,
      });
      if (result.success) {
        setUrlInput("");
        setAltInput("");
        router.refresh();
      } else {
        setUrlError(result.message ?? "Error al agregar imagen.");
      }
    });
  }

  function handleRemove(imageId: string) {
    startActionTransition(async () => {
      await removePropertyImageAction(orgSlug, { imageId, propertyId });
      router.refresh();
    });
  }

  function handleSetPrimary(imageId: string) {
    startActionTransition(async () => {
      await setPropertyImagePrimaryAction(orgSlug, { imageId, propertyId });
      router.refresh();
    });
  }

  const isBusy = isPendingUrl || isPendingAction;

  return (
    <div className="space-y-5">
      {/* â”€â”€ Image grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className={`group relative overflow-hidden rounded-2xl border bg-slate-100 ${
                img.isPrimary
                  ? "border-brand-400 ring-2 ring-brand-200"
                  : "border-slate-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.altText ?? "Imagen de propiedad"}
                className="h-32 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='128' viewBox='0 0 200 128'%3E%3Crect width='200' height='128' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='11' fill='%2394a3b8'%3ENo disponible%3C/text%3E%3C/svg%3E";
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
                    disabled={isBusy}
                    onClick={() => handleSetPrimary(img.id)}
                    className="flex-1 rounded-lg bg-white/90 py-1 text-[10px] font-semibold text-slate-800 transition hover:bg-white disabled:opacity-50"
                  >
                    Principal
                  </button>
                )}
                <button
                  type="button"
                  disabled={isBusy}
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
        <p className="text-sm text-slate-400">Sin imágenes todavía. Subí la primera desde abajo.</p>
      )}

      {/* â”€â”€ Tab switcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "upload"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Subir archivo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("url")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "url"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          URL / Google Drive
        </button>
      </div>

      {/* â”€â”€ Upload tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "upload" && (
        <div className="space-y-3">
          <CldUploadWidget
            uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
            onSuccess={handleUploadSuccess}
            options={{
              maxFiles: 8,
              clientAllowedFormats: ["jpg", "png", "webp", "jpeg"],
              maxFileSize: 4000000, // 4MB
            }}
          >
            {({ open }) => (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => open()}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-sm font-medium text-slate-600">
                  Hacé click para seleccionar imágenes
                </span>
                <span className="text-xs text-slate-400">
                  JPG, PNG, WEBP Â· máx. 4 MB por imagen Â· hasta 8 a la vez
                </span>
              </button>
            )}
          </CldUploadWidget>
          <p className="text-xs text-slate-400">
            Funciona desde PC y celular. Las imágenes se suben al CDN de Cloudinary y quedan vinculadas
            a esta propiedad.
          </p>
        </div>
      )}

      {/* â”€â”€ URL / Drive tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "url" && (
        <div className="space-y-3">
          {urlError && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {urlError}
            </p>
          )}
          <form onSubmit={handleUrlAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                URL de imagen o link de Google Drive
              </label>
              <input
                required
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://ejemplo.com/foto.jpg  ó  https://drive.google.com/file/d/â€¦"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Descripción (opcional)
              </label>
              <input
                type="text"
                value={altInput}
                onChange={(e) => setAltInput(e.target.value)}
                placeholder="Ej. Living"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={isBusy || !urlInput.trim()}
              className="shrink-0 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
            >
              {isPendingUrl ? "Agregandoâ€¦" : "Agregar"}
            </button>
          </form>
          {urlInput && isDriveUrl(urlInput) && (
            <p className="text-xs text-emerald-600">
              Link de Google Drive detectado â€” se convertirá automáticamente a URL directa.
              El archivo debe estar compartido como "Cualquiera con el enlace".
            </p>
          )}
          <p className="text-xs text-slate-400">
            Pegá la URL de una imagen alojada externamente, o un link compartido de Google Drive.
          </p>
        </div>
      )}
    </div>
  );
}
