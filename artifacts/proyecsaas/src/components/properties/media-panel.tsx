"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Check, ImagePlus, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { removePropertyMediaBatchAction } from "@/modules/properties/actions";
import type { PropertyImageItem, PropertyPanoramaItem } from "@/modules/properties/types";
import { CameraCaptureModal } from "./camera-capture-modal";
import { MediaUploadModal, type MediaCategory, type UploadedMediaPayload } from "./media-upload-modal";

type MediaPanelProps = {
  orgSlug: string;
  propertyId: string;
  images: PropertyImageItem[];
  panoramas: PropertyPanoramaItem[];
  activeCategory: MediaCategory;
  activePanoramaId: string | null;
  onCategoryChange: (category: MediaCategory) => void;
  onPanoramaSelect: (panoramaId: string) => void;
  onMediaUploaded: (payload: UploadedMediaPayload) => void;
  onMediaDeleted: (imageIds: string[], panoramaIds: string[]) => void;
  onSaveChanges: () => void;
};

const categories: { value: MediaCategory; label: string }[] = [
  { value: "PANORAMA", label: "360° / Panorámica" },
  { value: "REAL", label: "Fotos reales" },
  { value: "RENDER", label: "Render" },
  { value: "PROGRESS", label: "Cámara" },
];

export function MediaPanel({
  orgSlug,
  propertyId,
  images,
  panoramas,
  activeCategory,
  activePanoramaId,
  onCategoryChange,
  onPanoramaSelect,
  onMediaUploaded,
  onMediaDeleted,
  onSaveChanges,
}: MediaPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [selectedPanoramaIds, setSelectedPanoramaIds] = useState<string[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredImages = images.filter((image) => image.category === activeCategory);
  const selectedCount = selectedImageIds.length + selectedPanoramaIds.length;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setSelectedFile(file);
    setIsModalOpen(true);
  }

  function handleUploaded(payload: UploadedMediaPayload) {
    onMediaUploaded(payload);
    setSelectedFile(null);
  }

  function findPanoramaForImage(image: PropertyImageItem) {
    return image.category === "PANORAMA" ? panoramas.find((panorama) => panorama.url === image.url) ?? null : null;
  }

  function clearSelection() {
    setSelectedImageIds([]);
    setSelectedPanoramaIds([]);
    setIsSelecting(false);
    setDeleteError(null);
  }

  function toggleSelection(image?: PropertyImageItem, panorama?: PropertyPanoramaItem) {
    if (image) {
      setSelectedImageIds((current) =>
        current.includes(image.id) ? current.filter((id) => id !== image.id) : [...current, image.id],
      );
    }
    if (panorama) {
      setSelectedPanoramaIds((current) =>
        current.includes(panorama.id) ? current.filter((id) => id !== panorama.id) : [...current, panorama.id],
      );
    }
  }

  function deleteMedia(imageIds: string[], panoramaIds: string[]) {
    if (imageIds.length === 0 && panoramaIds.length === 0) return;
    setDeleteError(null);

    startTransition(async () => {
      const result = await removePropertyMediaBatchAction(orgSlug, {
        propertyId,
        imageIds,
        panoramaIds,
      });

      if (!result.success) {
        setDeleteError(result.message ?? "No se pudieron eliminar los medios.");
        return;
      }

      onMediaDeleted(imageIds, panoramaIds);
      clearSelection();
    });
  }

  function handleDeleteImage(image: PropertyImageItem) {
    if (!window.confirm("Eliminar esta imagen?")) return;
    const panorama = findPanoramaForImage(image);
    deleteMedia([image.id], panorama ? [panorama.id] : []);
  }

  function handleDeletePanorama(panorama: PropertyPanoramaItem) {
    if (!window.confirm("Eliminar esta escena 360?")) return;
    deleteMedia([], [panorama.id]);
  }

  function handleDeleteSelected() {
    if (selectedCount === 0) return;
    const plural = selectedCount === 1 ? "" : "s";
    if (!window.confirm(`Eliminar ${selectedCount} medio${plural} seleccionado${plural}?`)) return;
    deleteMedia(selectedImageIds, selectedPanoramaIds);
  }

  return (
    <aside className="flex h-full w-full flex-col border-l border-white/[0.08] bg-[#111118] text-white/85 lg:w-[280px] lg:shrink-0">
      <div className="border-b border-white/[0.08] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Medios</h2>
          <Button type="button" size="sm" onClick={onSaveChanges} className="h-8 gap-1.5 px-3 text-[11px]">
            <Save className="h-3.5 w-3.5" />
            Guardar cambios
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => {
                onCategoryChange(category.value);
                if (category.value === "PROGRESS") {
                  setIsCameraOpen(true);
                }
              }}
              className={`min-h-9 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold leading-tight transition ${
                activeCategory === category.value
                  ? "bg-white text-slate-950"
                  : "text-white/60 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {category.value === "PROGRESS" ? <Camera className="h-3.5 w-3.5" /> : null}
                {category.label}
              </span>
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 w-full gap-2">
          <ImagePlus className="h-4 w-4" />
          Subir imagen
        </Button>

        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (isSelecting ? clearSelection() : setIsSelecting(true))}
            className="flex-1 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white"
          >
            {isSelecting ? <X className="mr-1.5 h-3.5 w-3.5" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
            {isSelecting ? "Cancelar" : "Seleccionar"}
          </Button>
          {isSelecting && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={selectedCount === 0 || isPending}
              className="flex-1"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Eliminar {selectedCount || ""}
            </Button>
          )}
        </div>

        {deleteError && (
          <p className="mt-2 rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-100">
            {deleteError}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-2">
          {filteredImages.map((image) => {
            const panorama = findPanoramaForImage(image);
            const isActive = activeCategory === "PANORAMA" && panorama?.id === activePanoramaId;
            const isSelected = selectedImageIds.includes(image.id) || (panorama ? selectedPanoramaIds.includes(panorama.id) : false);
            return (
              <div
                key={image.id}
                className={`group relative h-[72px] w-[72px] overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.05] transition hover:ring-2 hover:ring-brand-400 ${
                  isActive || isSelected ? "ring-2 ring-brand-400" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isSelecting) {
                      if (panorama) {
                        toggleSelection(undefined, panorama);
                      } else {
                        toggleSelection(image);
                      }
                      return;
                    }
                    if (panorama) onPanoramaSelect(panorama.id);
                  }}
                  className="h-full w-full"
                  title={image.altText ?? "Imagen de propiedad"}
                >
                  <img src={image.url} alt={image.altText ?? "Imagen de propiedad"} className="h-full w-full object-cover" />
                </button>

                {image.isPrimary && (
                  <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    P
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-1 bottom-1 rounded bg-brand-500 px-1 py-0.5 text-[9px] font-bold text-white">
                    ACTIVA
                  </span>
                )}
                {isSelecting ? (
                  <span
                    className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded border ${
                      isSelected ? "border-brand-300 bg-brand-500 text-white" : "border-white/40 bg-black/45 text-transparent"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(image)}
                    disabled={isPending}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white opacity-0 shadow transition hover:bg-red-700 group-hover:opacity-100"
                    title="Eliminar imagen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {filteredImages.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/[0.12] px-3 py-8 text-center text-sm text-white/45">
            Sin imágenes en esta categoría.
          </div>
        )}
      </div>

      {panoramas.length > 0 && (
        <div className="border-t border-white/[0.08] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">Escenas 360°</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {panoramas.map((panorama) => {
              const isActive = panorama.id === activePanoramaId;
              const isSelected = selectedPanoramaIds.includes(panorama.id);
              return (
                <div
                  key={panorama.id}
                  className={`group relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.05] transition hover:ring-2 hover:ring-brand-400 ${
                    isActive || isSelected ? "ring-2 ring-brand-400" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isSelecting) {
                        toggleSelection(undefined, panorama);
                        return;
                      }
                      onPanoramaSelect(panorama.id);
                    }}
                    className="h-full w-full"
                    title={panorama.label ?? "Escena 360°"}
                  >
                    <img src={panorama.url} alt={panorama.label ?? "Escena 360°"} className="h-full w-full object-cover" />
                  </button>
                  {isActive && (
                    <span className="absolute inset-x-1 bottom-1 rounded bg-brand-500 px-1 py-0.5 text-[9px] font-bold text-white">
                      ACTIVA
                    </span>
                  )}
                  {isSelecting ? (
                    <span
                      className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded border ${
                        isSelected ? "border-brand-300 bg-brand-500 text-white" : "border-white/40 bg-black/45 text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDeletePanorama(panorama)}
                      disabled={isPending}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white opacity-0 shadow transition hover:bg-red-700 group-hover:opacity-100"
                      title="Eliminar escena 360"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <MediaUploadModal
        open={isModalOpen}
        orgSlug={orgSlug}
        propertyId={propertyId}
        file={selectedFile}
        defaultCategory={activeCategory}
        onOpenChange={setIsModalOpen}
        onUploaded={handleUploaded}
      />
      <CameraCaptureModal
        open={isCameraOpen}
        orgSlug={orgSlug}
        propertyId={propertyId}
        onOpenChange={setIsCameraOpen}
        onCaptured={handleUploaded}
      />
    </aside>
  );
}
