"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, Expand, ImageOff, Smartphone, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { PanoramaViewer } from "@/components/properties/panorama-viewer";
import { updatePanoramaSettingsAction } from "@/modules/properties/actions";
import type { PropertyImageItem, PropertyPanoramaItem } from "@/modules/properties/types";
import { MediaPanel } from "./media-panel";
import type { MediaCategory, UploadedMediaPayload } from "./media-upload-modal";

type MediaManagerProps = {
  orgSlug: string;
  propertyId: string;
  images: PropertyImageItem[];
  panoramas: PropertyPanoramaItem[];
  floorPlanUrl: string | null;
};

export function MediaManager({
  orgSlug,
  propertyId,
  images: initialImages,
  panoramas: initialPanoramas,
  floorPlanUrl: initialFloorPlanUrl,
}: MediaManagerProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [panoramas, setPanoramas] = useState(initialPanoramas);
  const [floorPlanUrl, setFloorPlanUrl] = useState(initialFloorPlanUrl);
  const [activeCategory, setActiveCategory] = useState<MediaCategory>(
    initialPanoramas.length > 0 ? "PANORAMA" : "REAL",
  );
  const [activePanoramaId, setActivePanoramaId] = useState<string | null>(initialPanoramas[0]?.id ?? null);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [isEditingHotspot, setIsEditingHotspot] = useState(false);
  const [isSavingHotspot, setIsSavingHotspot] = useState(false);

  async function handleCoordsSelected(pitch: number, yaw: number) {
    if (!activePanorama || isSavingHotspot) return;

    setIsSavingHotspot(true);
    try {
      const result = await updatePanoramaSettingsAction(orgSlug, {
        propertyId,
        panoramaId: activePanorama.id,
        label: activePanorama.label ?? activePanorama.roomName ?? 'Escena',
        roomName: activePanorama.roomName,
        floor: activePanorama.floor,
        positionX: activePanorama.positionX,
        positionY: activePanorama.positionY,
        positionZ: activePanorama.positionZ,
        connections: activePanorama.connections,
        hotspotPitch: pitch,
        hotspotYaw: yaw,
      });

      if (result.success) {
        setPanoramas((current) =>
          current.map((p) =>
            p.id === activePanorama.id
              ? { ...p, hotspotPitch: pitch, hotspotYaw: yaw }
              : p
          )
        );
        setIsEditingHotspot(false);
        router.refresh();
      } else {
        alert(result.message ?? "No se pudo guardar la posición del hotspot.");
      }
    } catch (error) {
      console.error(error);
      alert("Error al intentar guardar el hotspot.");
    } finally {
      setIsSavingHotspot(false);
    }
  }

  const activePanorama = panoramas.find((panorama) => panorama.id === activePanoramaId) ?? panoramas[0] ?? null;
  const orderedPanoramas = useMemo(() => {
    if (!activePanorama) return panoramas;
    return [activePanorama, ...panoramas.filter((panorama) => panorama.id !== activePanorama.id)];
  }, [activePanorama, panoramas]);

  const activeIndex = panoramas.findIndex((p) => p.id === activePanorama?.id);
  const nextPanorama = activeIndex !== -1 && activeIndex < panoramas.length - 1 ? panoramas[activeIndex + 1] : null;
  const nextSceneLabel = nextPanorama ? (nextPanorama.roomName ?? nextPanorama.label ?? `Escena ${activeIndex + 2}`) : '';

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  useEffect(() => {
    setPanoramas(initialPanoramas);
    setActivePanoramaId((current) => {
      if (current && initialPanoramas.some((panorama) => panorama.id === current)) return current;
      return initialPanoramas[0]?.id ?? null;
    });
  }, [initialPanoramas]);

  useEffect(() => {
    setFloorPlanUrl(initialFloorPlanUrl);
  }, [initialFloorPlanUrl]);

  const primaryImage = images.find((image) => image.isPrimary) ?? images.find((image) => image.category === "REAL") ?? images[0] ?? null;
  const activeTitle = activePanorama?.label ?? primaryImage?.altText ?? "Sin medios todavía";

  function handleUploaded(payload: UploadedMediaPayload) {
    const temporaryId = `temp-${Date.now()}`;
    const image: PropertyImageItem = {
      id: temporaryId,
      url: payload.url,
      altText: payload.title,
      category: payload.category,
      isPrimary: images.length === 0 && payload.category === "REAL",
      sortOrder: images.length,
    };

    setImages((current) => [...current, image]);

    if (payload.category === "PANORAMA") {
      const panorama: PropertyPanoramaItem = {
        id: temporaryId,
        url: payload.url,
        label: payload.title,
        direction: payload.direction ?? null,
        roomName: payload.title,
        floor: 0,
        positionX: panoramas.length * 3,
        positionY: 0,
        positionZ: 0,
        connections: [],
        sortOrder: panoramas.length,
        initialYaw: 0,
        initialPitch: 0,
        initialHfov: 100,
      };
      setPanoramas((current) => [...current, panorama]);
      setActivePanoramaId(panorama.id);
    }
    setActiveCategory(payload.category);
    router.refresh();
  }

  function handleMediaDeleted(deletedImageIds: string[], deletedPanoramaIds: string[]) {
    const deletedPanoramaUrls = panoramas
      .filter((panorama) => deletedPanoramaIds.includes(panorama.id))
      .map((panorama) => panorama.url);

    setImages((current) =>
      current.filter((image) => !deletedImageIds.includes(image.id) && !deletedPanoramaUrls.includes(image.url)),
    );
    setPanoramas((current) => current.filter((panorama) => !deletedPanoramaIds.includes(panorama.id)));

    if (activePanoramaId && deletedPanoramaIds.includes(activePanoramaId)) {
      const nextPanorama = panoramas.find((panorama) => !deletedPanoramaIds.includes(panorama.id)) ?? null;
      setActivePanoramaId(nextPanorama?.id ?? null);
      setActiveCategory(nextPanorama ? "PANORAMA" : "REAL");
    }
  }

  function handleFullscreen() {
    const element = document.getElementById("property-media-viewer");
    if (!element) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void element.requestFullscreen();
  }

  function handleSaveChanges() {
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-[#0A0A12] shadow-soft">
      <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:flex-row">
        <div id="property-media-viewer" className="relative min-h-[520px] flex-1 bg-[#0A0A12] lg:min-h-0">
          {activePanorama && orderedPanoramas.length > 0 ? (
            <>
              <PanoramaViewer
                scenes={orderedPanoramas.map(p => ({
                  url: p.url,
                  label: p.label ?? p.roomName ?? 'Escena',
                  hotspotPitch: p.hotspotPitch,
                  hotspotYaw: p.hotspotYaw
                }))}
                isEditingHotspot={isEditingHotspot}
                onCoordsSelected={handleCoordsSelected}
              />
              {isEditingHotspot && nextPanorama && (
                <div className="absolute inset-x-0 top-4 z-20 flex justify-center px-4 pointer-events-none">
                  <div className="flex items-center gap-3 rounded-full border border-brand-500/30 bg-[#0B0B14]/85 px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
                    {isSavingHotspot ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                        <p className="text-xs font-medium text-white/90">Guardando ubicación del hotspot...</p>
                      </>
                    ) : (
                      <>
                        <div className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                        </div>
                        <p className="text-xs font-medium text-white/90">
                          Modo Edición: Tocá en el piso para colocar el punto de navegación hacia{" "}
                          <span className="font-semibold text-brand-400">{nextSceneLabel}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsEditingHotspot(false)}
                          className="ml-2 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white transition"
                          title="Cancelar edición"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : primaryImage ? (
            <img
              src={primaryImage.url}
              alt={primaryImage.altText ?? "Imagen principal de la propiedad"}
              className="h-full min-h-[520px] w-full object-cover lg:min-h-0"
            />
          ) : (
            <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-3 text-white/55 lg:min-h-0">
              <ImageOff className="h-12 w-12 text-white/25" />
              <p className="text-sm font-medium">Sin medios todavía</p>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-white/[0.08] bg-black/45 px-4 py-3 text-white backdrop-blur-md">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white/90">{activeTitle}</p>
              {activePanorama?.direction && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-white/50">
                  <Compass className="h-3 w-3" />
                  Dirección {activePanorama.direction === "CENTER" ? "sin dirección específica" : activePanorama.direction}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setGyroEnabled((value) => !value)}
                className={`flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.08] transition ${
                  gyroEnabled ? "bg-brand-500 text-white" : "bg-white/[0.06] text-white/75 hover:bg-white/[0.12]"
                }`}
                title={gyroEnabled ? "Gyro activado" : "Gyro desactivado"}
              >
                <Smartphone className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleFullscreen}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.06] text-white/75 transition hover:bg-white/[0.12] hover:text-white"
                title="Pantalla completa"
              >
                <Expand className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <MediaPanel
          orgSlug={orgSlug}
          propertyId={propertyId}
          images={images}
          panoramas={panoramas}
          floorPlanUrl={floorPlanUrl}
          activeCategory={activeCategory}
          activePanoramaId={activePanorama?.id ?? null}
          onCategoryChange={setActiveCategory}
          onPanoramaSelect={(panoramaId) => {
            setActivePanoramaId(panoramaId);
            setActiveCategory("PANORAMA");
          }}
          onMediaUploaded={handleUploaded}
          onMediaDeleted={handleMediaDeleted}
          onFloorPlanUpdated={setFloorPlanUrl}
          onSaveChanges={handleSaveChanges}
          isEditingHotspot={isEditingHotspot}
          onStartEditHotspot={(panoramaId) => {
            setActivePanoramaId(panoramaId);
            setActiveCategory("PANORAMA");
            setIsEditingHotspot(true);
          }}
        />
      </div>
    </section>
  );
}
