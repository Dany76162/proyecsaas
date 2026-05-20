"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
import {
  addPropertyPanoramaAction,
  removePropertyPanoramaAction,
  updatePanoramaSettingsAction,
} from "@/modules/properties/actions";
import type { PropertyPanoramaItem } from "@/modules/properties/types";
import { PanoramaViewer } from "./panorama-viewer";

interface PanoramaUploadProps {
  orgSlug: string;
  propertyId: string;
  panoramas: PropertyPanoramaItem[];
}

type ActiveTab = "upload" | "url";

function convertDriveUrl(input: string): string {
  const fileMatch = input.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  const openMatch = input.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  return input;
}

function isDriveUrl(input: string) {
  return input.includes("drive.google.com");
}

export function PanoramaUpload({ orgSlug, propertyId, panoramas }: PanoramaUploadProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  
  const [isPendingUrl, startUrlTransition] = useTransition();
  const [isPendingAction, startActionTransition] = useTransition();

  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");

  async function handleUploadSuccess(result: any) {
    if (result.event === "success") {
      const info = result.info;
      await addPropertyPanoramaAction(orgSlug, {
        propertyId,
        url: info.secure_url,
        label: info.original_filename || "Escena 360",
      });
      router.refresh();
    }
  }

  function handleUrlAdd(e: React.FormEvent) {
    e.preventDefault();
    setUrlError(null);
    const resolved = convertDriveUrl(urlInput.trim());
    startUrlTransition(async () => {
      const result = await addPropertyPanoramaAction(orgSlug, {
        propertyId,
        url: resolved,
        label: labelInput.trim() || undefined,
      });
      if (result.success) {
        setUrlInput("");
        setLabelInput("");
        router.refresh();
      } else {
        setUrlError(result.message ?? "Error al agregar escena.");
      }
    });
  }

  function handleRemove(panoramaId: string) {
    if (!confirm("¿Seguro que querés eliminar esta escena 360°?")) return;
    startActionTransition(async () => {
      await removePropertyPanoramaAction(orgSlug, { panoramaId, propertyId });
      router.refresh();
    });
  }

  function handleSaveLabel(panoramaId: string) {
    startActionTransition(async () => {
      await updatePanoramaSettingsAction(orgSlug, {
        propertyId,
        panoramaId,
        label: editingLabelValue.trim() || undefined,
      });
      setEditingLabelId(null);
      router.refresh();
    });
  }

  const isBusy = isPendingUrl || isPendingAction;

  return (
    <div className="space-y-6">
      {panoramas.length > 0 && (
        <div className="space-y-4">
          <PanoramaViewer panoramas={panoramas} className="h-[400px]" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {panoramas.map((pano) => (
              <div key={pano.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  {editingLabelId === pano.id ? (
                    <div className="flex flex-1 gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingLabelValue}
                        onChange={(e) => setEditingLabelValue(e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveLabel(pano.id);
                          if (e.key === "Escape") setEditingLabelId(null);
                        }}
                      />
                      <button
                        onClick={() => handleSaveLabel(pano.id)}
                        disabled={isBusy}
                        className="rounded bg-brand-100 px-2 text-xs font-semibold text-brand-700 hover:bg-brand-200"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-between">
                      <span className="text-sm font-medium text-slate-800 line-clamp-1">
                        {pano.label || "Sin nombre"}
                      </span>
                      <button
                        onClick={() => {
                          setEditingLabelId(pano.id);
                          setEditingLabelValue(pano.label || "");
                        }}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs text-slate-400 truncate max-w-[150px]" title={pano.url}>
                    {pano.url.substring(0, 30)}...
                  </span>
                  <button
                    disabled={isBusy}
                    onClick={() => handleRemove(pano.id)}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {panoramas.length === 0 && (
        <p className="text-sm text-slate-400">No hay escenas 360° todavía. Subí una imagen equirectangular.</p>
      )}

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Subir archivo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("url")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "url" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          URL / Google Drive
        </button>
      </div>

      {activeTab === "upload" && (
        <div className="space-y-3">
          <CldUploadWidget
            uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
            onSuccess={handleUploadSuccess}
            options={{
              maxFiles: 5,
              clientAllowedFormats: ["jpg", "png", "webp", "jpeg"],
              maxFileSize: 16000000, // 16MB limit for 360 images
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
                  Hacé click para seleccionar imágenes panorámicas (equirectangulares)
                </span>
                <span className="text-xs text-slate-400">
                  JPG, PNG, WEBP · máx. 16 MB por imagen
                </span>
              </button>
            )}
          </CldUploadWidget>
        </div>
      )}

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
                URL de imagen 360 o link de Google Drive
              </label>
              <input
                required
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://ejemplo.com/panorama.jpg"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Nombre de escena
              </label>
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="Ej. Living"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={isBusy || !urlInput.trim()}
              className="shrink-0 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
            >
              {isPendingUrl ? "Agregando…" : "Agregar"}
            </button>
          </form>
          {urlInput && isDriveUrl(urlInput) && (
            <p className="text-xs text-emerald-600">
              Link de Google Drive detectado — se convertirá automáticamente a URL directa.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
