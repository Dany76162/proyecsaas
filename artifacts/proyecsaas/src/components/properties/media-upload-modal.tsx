"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { upsertPropertyMediaAction } from "@/modules/properties/actions";

export type MediaCategory = "PANORAMA" | "REAL" | "RENDER" | "PROGRESS";
export type UploadCategory = MediaCategory | "FLOOR_PLAN";

export type UploadedMediaPayload = {
  url: string;
  category: MediaCategory;
  title: string;
  direction?: DirectionValue;
};

export type DirectionValue = "N" | "NE" | "E" | "SE" | "S" | "SO" | "O" | "NO" | "CENTER";

type MediaUploadModalProps = {
  open: boolean;
  orgSlug: string;
  propertyId: string;
  file: File | null;
  defaultCategory: MediaCategory;
  onOpenChange: (open: boolean) => void;
  onUploaded: (payload: UploadedMediaPayload) => void;
};

export const categoryLabels: Record<MediaCategory, string> = {
  PANORAMA: "360° / Panorámica",
  REAL: "Fotos reales",
  RENDER: "Render",
  PROGRESS: "Avance de obra",
};

const folderByCategory: Record<UploadCategory, string> = {
  PANORAMA: "panoramas360",
  REAL: "property-images",
  RENDER: "property-renders",
  PROGRESS: "property-progress",
  FLOOR_PLAN: "property-floor-plans",
};

const maxUploadSizeByCategory: Record<UploadCategory, number> = {
  PANORAMA: 512 * 1024 * 1024,
  REAL: 25 * 1024 * 1024,
  RENDER: 25 * 1024 * 1024,
  PROGRESS: 25 * 1024 * 1024,
  FLOOR_PLAN: 50 * 1024 * 1024,
};

const directions: { value: DirectionValue; label: string }[] = [
  { value: "NO", label: "NO" },
  { value: "N", label: "N" },
  { value: "NE", label: "NE" },
  { value: "O", label: "O" },
  { value: "CENTER", label: "•" },
  { value: "E", label: "E" },
  { value: "SO", label: "SO" },
  { value: "S", label: "S" },
  { value: "SE", label: "SE" },
];

function getFileTitle(file: File | null) {
  if (!file) return "";
  return file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

export async function uploadToPropertyMedia(
  file: File,
  category: UploadCategory,
  orgSlug: string,
  propertyId: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  const folder = folderByCategory[category];

  // 1. Obtener firma del servidor
  let signRes: Response;
  try {
    signRes = await fetch("/api/cloudinary-sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });
  } catch (error: any) {
    throw new Error(`Error de red al conectar con /api/cloudinary-sign: ${error.message || error}`);
  }

  if (!signRes.ok) {
    let errMsg = "Error al obtener la firma de Cloudinary";
    try {
      const errData = await signRes.json();
      if (errData && errData.error) errMsg = errData.error;
    } catch {}
    throw new Error(`Cloudinary sign failed (Status ${signRes.status}): ${errMsg}`);
  }

  const { signature, timestamp, apiKey, cloudName } = await signRes.json();

  if (!signature || !apiKey || !cloudName) {
    throw new Error("La API de firma no devolvió los parámetros requeridos (signature, apiKey o cloudName).");
  }

  // 2. Subir a Cloudinary con firma (soporta archivos grandes)
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url);
        } catch {
          reject(new Error("No se pudo interpretar la respuesta de Cloudinary."));
        }
      } else {
        reject(new Error(`Cloudinary Upload Error (Status ${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Error de red al subir a Cloudinary."));
    xhr.send(formData);
  });
}

async function compressImageIfNeeded(file: File, category: UploadCategory): Promise<File> {
  const maxSize = 8 * 1024 * 1024; // 8MB
  if (file.size <= maxSize || !file.type.startsWith("image/")) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const maxDimension = category === "PANORAMA" ? 4096 : 2048;

        if (category === "PANORAMA") {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file); // fallback
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          0.85,
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function MediaUploadModal({
  open,
  orgSlug,
  propertyId,
  file,
  defaultCategory,
  onOpenChange,
  onUploaded,
}: MediaUploadModalProps) {
  const initialTitle = useMemo(() => getFileTitle(file), [file]);
  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState<MediaCategory>(defaultCategory);
  const [direction, setDirection] = useState<DirectionValue>("CENTER");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(initialTitle);
    setCategory(defaultCategory);
    setDirection("CENTER");
    setProgress(0);
    setError(null);
  }, [initialTitle, defaultCategory, open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isSaving = isPending || progress > 0;

  function handleClose(nextOpen: boolean) {
    if (!isSaving) onOpenChange(nextOpen);
  }

  function handleSave() {
    if (!file || !title.trim()) return;
    setError(null);

    const maxUploadSize = maxUploadSizeByCategory[category];
    if (file.size > maxUploadSize) {
      setError(`La imagen supera el maximo permitido de ${formatMegabytes(maxUploadSize)}.`);
      return;
    }

    setProgress(1);

    startTransition(async () => {
      try {
        const fileToUpload = await compressImageIfNeeded(file, category);
        const url = await uploadToPropertyMedia(fileToUpload, category, orgSlug, propertyId, setProgress);
        const payload: UploadedMediaPayload = {
          url,
          category,
          title: title.trim(),
          direction: category === "PANORAMA" ? direction : undefined,
        };

        const result = await upsertPropertyMediaAction(orgSlug, propertyId, payload);
        if (!result.success) {
          throw new Error(result.message ?? "No se pudo guardar el medio.");
        }

        onUploaded(payload);
        setProgress(0);
        onOpenChange(false);
      } catch (uploadError: any) {
        setProgress(0);
        setError(uploadError.message ?? "No se pudo subir la imagen.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-white/10 bg-[#111118] text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Subir imagen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {previewUrl && (
            <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
              <img
                src={previewUrl}
                alt={title || file?.name || "Imagen seleccionada"}
                className="h-48 w-full object-cover"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/55">
              Título
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25"
              placeholder="Ej. Living principal"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/55">
              Categoría
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as MediaCategory)}
              className="w-full rounded-lg border border-white/10 bg-[#191922] px-3 py-2 text-sm text-white outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25"
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {category === "PANORAMA" && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/55">
                Dirección de toma
              </label>
              <div className="grid w-full grid-cols-3 gap-2">
                {directions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDirection(item.value)}
                    className={`h-11 rounded-lg border text-sm font-semibold transition ${
                      direction === item.value
                        ? "border-brand-400 bg-brand-500 text-white ring-2 ring-brand-400/35"
                        : "border-white/10 bg-white/[0.04] text-white/75 hover:border-brand-400/70 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {progress > 0 && (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                <span>{file?.name}</span>
                <span className="font-semibold text-white">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={isSaving}
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            Ahora no
          </Button>
          <Button type="button" onClick={handleSave} disabled={!file || !title.trim() || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar imagen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
