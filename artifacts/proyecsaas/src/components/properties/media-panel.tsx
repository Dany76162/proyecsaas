"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Camera, Check, Compass, FileUp, ImagePlus, MapPinned, Save, Trash2, Video, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  removePropertyMediaBatchAction,
  setPropertyFloorPlanAction,
  updatePanoramaSettingsAction,
  setPropertyImagePrimaryAction,
} from "@/modules/properties/actions";
import type { PropertyImageItem, PropertyPanoramaItem } from "@/modules/properties/types";
import { CameraCaptureModal } from "./camera-capture-modal";
import { ContinuousScannerModal } from "./continuous-scanner-modal";
import { Video360RecorderModal } from "./video-360-recorder-modal";
import {
  MediaUploadModal,
  type MediaCategory,
  type UploadedMediaPayload,
  uploadToPropertyMedia,
} from "./media-upload-modal";

type MediaPanelProps = {
  orgSlug: string;
  propertyId: string;
  images: PropertyImageItem[];
  panoramas: PropertyPanoramaItem[];
  floorPlanUrl: string | null;
  activeCategory: MediaCategory;
  activePanoramaId: string | null;
  onCategoryChange: (category: MediaCategory) => void;
  onPanoramaSelect: (panoramaId: string) => void;
  onMediaUploaded: (payload: UploadedMediaPayload) => void;
  onMediaDeleted: (imageIds: string[], panoramaIds: string[]) => void;
  onFloorPlanUpdated: (url: string | null) => void;
  onSaveChanges: () => void;
  isEditingHotspot?: boolean;
  onStartEditHotspot?: (panoramaId: string) => void;
};

const categories: { value: MediaCategory; label: string }[] = [
  { value: "PANORAMA", label: "360° / Panorámica" },
  { value: "REAL", label: "Fotos reales" },
  { value: "RENDER", label: "Render" },
  { value: "PROGRESS", label: "Cámara" },
];

function sceneToPlane(positionX: number, positionY: number) {
  return {
    left: Math.max(8, Math.min(92, 50 + positionX * 6)),
    top: Math.max(8, Math.min(92, 50 + positionY * 6)),
  };
}

function planeToScene(left: number, top: number) {
  return {
    positionX: Number(((left - 50) / 6).toFixed(2)),
    positionY: Number(((top - 50) / 6).toFixed(2)),
  };
}

function getDemoScenePosition(index: number, total: number) {
  const columns = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(total))));
  const row = Math.floor(index / columns);
  const column = index % columns;

  return {
    positionX: (column - (columns - 1) / 2) * 3,
    positionY: (row - 0.5) * 2.4,
    positionZ: 0,
    floor: 0,
  };
}

function numberOrZero(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isPdfUrl(url: string | null) {
  return Boolean(url?.toLowerCase().split("?")[0]?.endsWith(".pdf"));
}

export function MediaPanel({
  orgSlug,
  propertyId,
  images,
  panoramas,
  floorPlanUrl,
  activeCategory,
  activePanoramaId,
  onCategoryChange,
  onPanoramaSelect,
  onMediaUploaded,
  onMediaDeleted,
  onFloorPlanUpdated,
  onSaveChanges,
  isEditingHotspot = false,
  onStartEditHotspot,
}: MediaPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isVideo360Open, setIsVideo360Open] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [selectedPanoramaIds, setSelectedPanoramaIds] = useState<string[]>([]);
  const [spatialDraft, setSpatialDraft] = useState({
    roomName: "",
    floor: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    connections: [] as string[],
  });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [spatialMessage, setSpatialMessage] = useState<string | null>(null);
  const [floorPlanMessage, setFloorPlanMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSpatialPending, startSpatialTransition] = useTransition();
  const [isFloorPlanPending, startFloorPlanTransition] = useTransition();

  const filteredImages = images.filter((image) => image.category === activeCategory);
  const selectedCount = selectedImageIds.length + selectedPanoramaIds.length;
  const activePanorama = panoramas.find((panorama) => panorama.id === activePanoramaId) ?? null;

  useEffect(() => {
    if (!activePanorama) return;

    setSpatialDraft({
      roomName: activePanorama.roomName ?? activePanorama.label ?? "",
      floor: numberOrZero(activePanorama.floor),
      positionX: numberOrZero(activePanorama.positionX),
      positionY: numberOrZero(activePanorama.positionY),
      positionZ: numberOrZero(activePanorama.positionZ),
      connections: activePanorama.connections ?? [],
    });
    setSpatialMessage(null);
  }, [activePanorama]);

  function handleSetPrimary(image: PropertyImageItem) {
    if (image.category === "PANORAMA") return;
    setDeleteError(null);
    startTransition(async () => {
      try {
        const result = await setPropertyImagePrimaryAction(orgSlug, {
          propertyId,
          imageId: image.id,
        });
        if (!result.success) {
          setDeleteError(result.message ?? "No se pudo establecer la portada.");
          return;
        }
        onSaveChanges();
      } catch (error: any) {
        setDeleteError(error.message ?? "Error al establecer la portada.");
      }
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setSelectedFile(file);
    setIsModalOpen(true);
  }

  function handleFilesSelected(files: File[]) {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setIsModalOpen(true);
    }
  }

  function handleUploaded(payload: UploadedMediaPayload) {
    onMediaUploaded(payload);
    setSelectedFile(null);
  }

  function handleFloorPlanChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    setFloorPlanMessage(null);
    startFloorPlanTransition(async () => {
      try {
        const url = await uploadToPropertyMedia(file, "FLOOR_PLAN", orgSlug, propertyId, () => {});
        const result = await setPropertyFloorPlanAction(orgSlug, { propertyId, url });
        if (!result.success) {
          throw new Error(result.message ?? "No se pudo guardar el plano.");
        }
        onFloorPlanUpdated(url);
        setFloorPlanMessage("Plano cargado como referencia.");
        onSaveChanges();
      } catch (error: any) {
        setFloorPlanMessage(error.message ?? "No se pudo subir el plano.");
      }
    });
  }

  function removeFloorPlan() {
    setFloorPlanMessage(null);
    startFloorPlanTransition(async () => {
      const result = await setPropertyFloorPlanAction(orgSlug, { propertyId, url: null });
      if (!result.success) {
        setFloorPlanMessage(result.message ?? "No se pudo quitar el plano.");
        return;
      }
      onFloorPlanUpdated(null);
      setFloorPlanMessage("Plano quitado.");
      onSaveChanges();
    });
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
    const panorama = findPanoramaForImage(image);
    deleteMedia([image.id], panorama ? [panorama.id] : []);
    toast.success("Imagen eliminada.");
  }

  function handleDeletePanorama(panorama: PropertyPanoramaItem) {
    deleteMedia([], [panorama.id]);
    toast.success("Escena 360° eliminada.");
  }

  function handleDeleteSelected() {
    if (selectedCount === 0) return;
    deleteMedia(selectedImageIds, selectedPanoramaIds);
    const plural = selectedCount === 1 ? "" : "s";
    toast.success(`${selectedCount} medio${plural} eliminado${plural}.`);
  }

  function toggleConnection(panoramaId: string) {
    setSpatialDraft((current) => ({
      ...current,
      connections: current.connections.includes(panoramaId)
        ? current.connections.filter((id) => id !== panoramaId)
        : [...current.connections, panoramaId],
    }));
  }

  function saveSpatialSettings() {
    if (!activePanorama) return;
    setSpatialMessage(null);

    startSpatialTransition(async () => {
      const result = await updatePanoramaSettingsAction(orgSlug, {
        propertyId,
        panoramaId: activePanorama.id,
        label: activePanorama.label ?? spatialDraft.roomName,
        roomName: spatialDraft.roomName.trim() || null,
        floor: spatialDraft.floor,
        positionX: spatialDraft.positionX,
        positionY: spatialDraft.positionY,
        positionZ: spatialDraft.positionZ,
        connections: spatialDraft.connections,
      });

      setSpatialMessage(result.success ? "Escena espacial guardada." : result.message ?? "No se pudo guardar.");
      if (result.success) onSaveChanges();
    });
  }

  function updatePositionFromPointer(target: HTMLElement, event: React.PointerEvent) {
    const rect = target.getBoundingClientRect();
    const left = ((event.clientX - rect.left) / rect.width) * 100;
    const top = ((event.clientY - rect.top) / rect.height) * 100;
    const nextPosition = planeToScene(left, top);
    setSpatialDraft((current) => ({ ...current, ...nextPosition }));
  }

  function applyDemoLayout() {
    if (panoramas.length === 0) return;
    setSpatialMessage(null);

    startSpatialTransition(async () => {
      const results = await Promise.all(
        panoramas.map((panorama, index) => {
          const position = getDemoScenePosition(index, panoramas.length);
          const connections = [
            panoramas[index - 1]?.id,
            panoramas[index + 1]?.id,
          ].filter((id): id is string => Boolean(id));

          return updatePanoramaSettingsAction(orgSlug, {
            propertyId,
            panoramaId: panorama.id,
            label: panorama.label ?? `Escena ${index + 1}`,
            roomName: panorama.roomName ?? panorama.label ?? `Ambiente ${index + 1}`,
            floor: position.floor,
            positionX: position.positionX,
            positionY: position.positionY,
            positionZ: position.positionZ,
            connections,
          });
        }),
      );

      const failed = results.find((result) => !result.success);
      setSpatialMessage(failed ? failed.message ?? "No se pudo crear el plano demo." : "Plano demo aplicado.");
      if (!failed) onSaveChanges();
    });
  }


  return (
    <aside
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50') }}
      onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50') }}
      onDrop={(e) => {
        e.preventDefault()
        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50')
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
        if (files.length > 0) handleFilesSelected(files)
      }}
      className="flex h-full w-full flex-col border-l border-white/[0.08] bg-[#111118] text-white/85 lg:w-[280px] lg:shrink-0"
    >
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
        <input
          ref={floorPlanInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,image/vnd.dxf,application/dxf,.dxf"
          className="hidden"
          onChange={handleFloorPlanChange}
        />
        <Button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 w-full gap-2">
          <ImagePlus className="h-4 w-4" />
          Subir imagen
        </Button>
        {activeCategory === "PANORAMA" && (
          <div className="mt-2 space-y-2">
            <Button
              type="button"
              onClick={() => setIsVideo360Open(true)}
              className="w-full gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            >
              <Video className="h-4 w-4" />
              Grabar giro 360 desde celular
            </Button>
            <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-medium leading-normal text-cyan-50/75">
              Este modo crea una panorámica navegable con celular. No reemplaza una cámara 360 profesional.
            </p>
            <Button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="w-full gap-2 bg-brand-600 hover:bg-brand-700"
            >
              <Camera className="h-4 w-4" />
              Escanear con celular (Experimental)
            </Button>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => floorPlanInputRef.current?.click()}
          disabled={isFloorPlanPending}
          className="mt-2 w-full bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white"
        >
          <FileUp className="mr-2 h-4 w-4" />
          {floorPlanUrl ? "Cambiar plano PDF/imagen" : "Subir plano PDF/imagen"}
        </Button>
        {floorPlanUrl && (
          <Button
            type="button"
            variant="ghost"
            onClick={removeFloorPlan}
            disabled={isFloorPlanPending}
            className="mt-2 w-full bg-white/[0.03] text-xs text-white/55 hover:bg-white/[0.08] hover:text-white"
          >
            Quitar plano
          </Button>
        )}
        {floorPlanMessage && <p className="mt-2 text-xs text-white/55">{floorPlanMessage}</p>}
        {panoramas.length === 0 && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
            <p className="text-[10px] font-semibold text-white/50 leading-normal">
              Para iniciar un tour 360°, subí imágenes panorámicas reales generadas con una cámara profesional.
            </p>
          </div>
        )}

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
                  <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[8px] font-extrabold text-white tracking-widest uppercase shadow">
                    PORTADA
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
                  <>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image)}
                      disabled={isPending}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white opacity-0 shadow transition hover:bg-red-700 group-hover:opacity-100"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {!image.isPrimary && image.category !== "PANORAMA" && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(image)}
                        disabled={isPending}
                        className="absolute bottom-1 inset-x-1 flex h-6 items-center justify-center rounded bg-blue-600 text-[8px] font-extrabold uppercase tracking-widest text-white opacity-0 shadow transition hover:bg-blue-700 group-hover:opacity-100"
                        title="Usar como portada"
                      >
                        Usar Portada
                      </button>
                    )}
                  </>
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
                    <>
                      {(() => {
                        const panIndex = panoramas.findIndex((p) => p.id === panorama.id);
                        const hasNext = panIndex !== -1 && panIndex < panoramas.length - 1;
                        if (!hasNext) return null;
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartEditHotspot?.(panorama.id);
                            }}
                            className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-white opacity-0 shadow transition hover:bg-brand-700 group-hover:opacity-100"
                            title="Posicionar hotspot"
                          >
                            <Compass className="h-3.5 w-3.5" />
                          </button>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => handleDeletePanorama(panorama)}
                        disabled={isPending}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white opacity-0 shadow transition hover:bg-red-700 group-hover:opacity-100"
                        title="Eliminar escena 360"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activePanorama && (
        <div className="border-t border-white/[0.08] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/50">
              <MapPinned className="h-3.5 w-3.5" />
              Plano del tour
            </h3>
            <div className="flex items-center gap-1.5">
              {(() => {
                const activeIndex = panoramas.findIndex((p) => p.id === activePanorama.id);
                const hasNextScene = activeIndex !== -1 && activeIndex < panoramas.length - 1;
                if (!hasNextScene) return null;
                return (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onStartEditHotspot?.(activePanorama.id)}
                    className={`h-7 px-2.5 text-[10px] gap-1 font-medium transition duration-300 ${
                      isEditingHotspot
                        ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                        : "bg-brand-500 text-white hover:bg-brand-600 hover:shadow-[0_0_12px_rgba(59,130,246,0.45)]"
                    }`}
                  >
                    <Compass className="h-3 w-3" />
                    {isEditingHotspot ? "Editando..." : "Hotspot"}
                  </Button>
                );
              })()}
              <Button
                type="button"
                size="sm"
                onClick={saveSpatialSettings}
                disabled={isSpatialPending}
                className="h-7 px-2 text-[10px]"
              >
                Guardar
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div
              data-spatial-plane
              className="relative h-44 overflow-hidden rounded-lg border border-white/10 bg-[#080b12]"
              onPointerDown={(event) => {
                if (event.target !== event.currentTarget) return;
                updatePositionFromPointer(event.currentTarget, event);
              }}
              onPointerMove={(event) => {
                if (event.buttons !== 1) return;
                updatePositionFromPointer(event.currentTarget, event);
              }}
            >
              {floorPlanUrl && (
                <div className="pointer-events-none absolute inset-0 bg-white">
                  {isPdfUrl(floorPlanUrl) ? (
                    <object
                      data={`${floorPlanUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      type="application/pdf"
                      className="h-full w-full opacity-45"
                    />
                  ) : (
                    <img
                      src={floorPlanUrl}
                      alt="Plano de la propiedad"
                      className="h-full w-full object-contain opacity-55"
                    />
                  )}
                </div>
              )}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="absolute inset-x-4 top-1/2 h-px bg-white/15" />
              <div className="absolute inset-y-4 left-1/2 w-px bg-white/15" />

              {panoramas.map((panorama) => {
                const isActive = panorama.id === activePanorama.id;
                const position = isActive
                  ? sceneToPlane(spatialDraft.positionX, spatialDraft.positionY)
                  : sceneToPlane(panorama.positionX, panorama.positionY);
                const connections = isActive ? spatialDraft.connections : panorama.connections;

                return (
                  <div key={panorama.id}>
                    {connections.map((connectionId) => {
                      const connected = panoramas.find((item) => item.id === connectionId);
                      if (!connected) return null;

                      const connectedPosition = connected.id === activePanorama.id
                        ? sceneToPlane(spatialDraft.positionX, spatialDraft.positionY)
                        : sceneToPlane(connected.positionX, connected.positionY);
                      const x1 = position.left;
                      const y1 = position.top;
                      const x2 = connectedPosition.left;
                      const y2 = connectedPosition.top;
                      const length = Math.hypot(x2 - x1, y2 - y1);
                      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

                      return (
                        <span
                          key={`${panorama.id}-${connectionId}`}
                          className="absolute h-px origin-left bg-cyan-300/45"
                          style={{
                            left: `${x1}%`,
                            top: `${y1}%`,
                            width: `${length}%`,
                            transform: `rotate(${angle}deg)`,
                          }}
                        />
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => onPanoramaSelect(panorama.id)}
                      onPointerDown={(event) => {
                        if (!isActive) return;
                        event.preventDefault();
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        const plane = event.currentTarget.closest("[data-spatial-plane]");
                        if (plane instanceof HTMLElement) updatePositionFromPointer(plane, event);
                      }}
                      onPointerMove={(event) => {
                        if (!isActive || event.buttons !== 1) return;
                        const plane = event.currentTarget.closest("[data-spatial-plane]");
                        if (!(plane instanceof HTMLElement)) return;
                        updatePositionFromPointer(plane, event);
                      }}
                      className={`absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-bold transition hover:scale-110 ${
                        isActive
                          ? "border-white bg-brand-500 text-white shadow-[0_0_18px_rgba(59,130,246,0.85)]"
                          : "border-white/30 bg-white/15 text-white/70"
                      }`}
                      style={{ left: `${position.left}%`, top: `${position.top}%` }}
                      title={panorama.roomName ?? panorama.label ?? "Escena"}
                    >
                      {panoramas.findIndex((item) => item.id === panorama.id) + 1}
                    </button>
                  </div>
                );
              })}

              <div
                className="pointer-events-none absolute inset-0"
                onPointerMove={(event) => {
                  if (event.buttons !== 1) return;
                  updatePositionFromPointer(event.currentTarget, event);
                }}
              />
            </div>

            <div className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Orden y Preferencia</p>
              
              <Button
                type="button"
                onClick={async () => {
                  setSpatialMessage(null);
                  startSpatialTransition(async () => {
                    try {
                      const result = await updatePanoramaSettingsAction(orgSlug, {
                        propertyId,
                        panoramaId: activePanorama.id,
                        sortOrder: 0,
                      });
                      if (result.success) {
                        setSpatialMessage("★ Escena marcada como inicial.");
                        onSaveChanges();
                      } else {
                        setSpatialMessage(result.message ?? "Error al guardar.");
                      }
                    } catch (e: any) {
                      setSpatialMessage(e.message || "Error al actualizar.");
                    }
                  });
                }}
                disabled={isSpatialPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white h-9 gap-1.5 rounded-lg shadow-md"
              >
                ★ Establecer como Inicial
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    const currentIndex = panoramas.findIndex(p => p.id === activePanorama.id);
                    if (currentIndex <= 0) return;
                    const prevPanorama = panoramas[currentIndex - 1];
                    
                    startSpatialTransition(async () => {
                      await updatePanoramaSettingsAction(orgSlug, {
                        propertyId,
                        panoramaId: activePanorama.id,
                        sortOrder: currentIndex - 1,
                      });
                      await updatePanoramaSettingsAction(orgSlug, {
                        propertyId,
                        panoramaId: prevPanorama.id,
                        sortOrder: currentIndex,
                      });
                      onSaveChanges();
                    });
                  }}
                  disabled={isSpatialPending || panoramas.findIndex(p => p.id === activePanorama.id) === 0}
                  className="flex-1 bg-white/[0.04] text-[10px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white h-8"
                >
                  ◀ Mover atrás
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    const currentIndex = panoramas.findIndex(p => p.id === activePanorama.id);
                    if (currentIndex === -1 || currentIndex >= panoramas.length - 1) return;
                    const nextPanorama = panoramas[currentIndex + 1];
                    
                    startSpatialTransition(async () => {
                      await updatePanoramaSettingsAction(orgSlug, {
                        propertyId,
                        panoramaId: activePanorama.id,
                        sortOrder: currentIndex + 1,
                      });
                      await updatePanoramaSettingsAction(orgSlug, {
                        propertyId,
                        panoramaId: nextPanorama.id,
                        sortOrder: currentIndex,
                      });
                      onSaveChanges();
                    });
                  }}
                  disabled={isSpatialPending || panoramas.findIndex(p => p.id === activePanorama.id) === panoramas.length - 1}
                  className="flex-1 bg-white/[0.04] text-[10px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white h-8"
                >
                  Mover adelante ▶
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={applyDemoLayout}
              disabled={isSpatialPending}
              className="w-full bg-white/[0.04] text-xs text-white/75 hover:bg-white/[0.08] hover:text-white"
            >
              Crear plano demo con escenas actuales
            </Button>

            <input
              value={spatialDraft.roomName}
              onChange={(event) => setSpatialDraft((current) => ({ ...current, roomName: event.target.value }))}
              className="w-full rounded-md border border-white/10 bg-white/[0.06] px-2 py-1.5 text-xs text-white outline-none focus:border-brand-400"
              placeholder="Ambiente, ej. Living"
            />

            <div className="grid grid-cols-3 gap-2">
              {[
                ["Piso", "floor"],
                ["X", "positionX"],
                ["Y", "positionY"],
              ].map(([label, key]) => (
                <label key={key} className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
                  {label}
                  <input
                    type="number"
                    step={key === "floor" ? 1 : 0.5}
                    value={spatialDraft[key as "floor" | "positionX" | "positionY"]}
                    onChange={(event) =>
                      setSpatialDraft((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.06] px-2 py-1.5 text-xs text-white outline-none focus:border-brand-400"
                  />
                </label>
              ))}
            </div>

            <label className="block text-[10px] font-semibold uppercase tracking-wide text-white/45">
              Altura Z
              <input
                type="number"
                step={0.5}
                value={spatialDraft.positionZ}
                onChange={(event) => setSpatialDraft((current) => ({ ...current, positionZ: Number(event.target.value) }))}
                className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.06] px-2 py-1.5 text-xs text-white outline-none focus:border-brand-400"
              />
            </label>

            {panoramas.length > 1 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/45">Conecta con</p>
                <div className="flex flex-wrap gap-1.5">
                  {panoramas
                    .filter((panorama) => panorama.id !== activePanorama.id)
                    .map((panorama) => (
                      <button
                        key={panorama.id}
                        type="button"
                        onClick={() => toggleConnection(panorama.id)}
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition ${
                          spatialDraft.connections.includes(panorama.id)
                            ? "border-brand-300 bg-brand-500 text-white"
                            : "border-white/10 bg-white/[0.04] text-white/55 hover:text-white"
                        }`}
                      >
                        {panorama.roomName ?? panorama.label ?? "Escena"}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {spatialMessage && <p className="text-xs text-white/55">{spatialMessage}</p>}
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
      <Video360RecorderModal
        open={isVideo360Open}
        orgSlug={orgSlug}
        propertyId={propertyId}
        onOpenChange={setIsVideo360Open}
        onCaptured={handleUploaded}
        onUsePhotoFlow={() => setIsCameraOpen(true)}
      />
      {typeof window !== "undefined" && typeof (window as any).ImageCapture !== "undefined" ? (
        <ContinuousScannerModal
          open={isCameraOpen}
          orgSlug={orgSlug}
          propertyId={propertyId}
          onOpenChange={setIsCameraOpen}
          onCaptured={handleUploaded}
        />
      ) : (
        <CameraCaptureModal
          open={isCameraOpen}
          orgSlug={orgSlug}
          propertyId={propertyId}
          onOpenChange={setIsCameraOpen}
          onCaptured={handleUploaded}
        />
      )}
    </aside>
  );
}
