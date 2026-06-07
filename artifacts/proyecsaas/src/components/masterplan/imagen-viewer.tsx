"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, Layers, Check, Pencil, Eye, Move, Map, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ImagenMapaItem, IMAGEN_TIPO_CONFIG, isImagenMapa360Like } from "@/types/imagen-mapa";
import { MasterplanUnit } from "@/lib/masterplan-store";
import { SvgViewBox, svgPathToLatLng, geoToPitchYaw } from "@/lib/geo-projection";
import Viewer360LotesOverlay from "./viewer360-lotes-overlay";

interface ImagenViewerProps {
  imagen: ImagenMapaItem;
  onClose: () => void;
  onCalibrationSaved?: (updates: Pick<ImagenMapaItem, "altitudM" | "imageHeading" | "latOffset" | "lngOffset" | "planRotation" | "planScale">) => void;
  units?: MasterplanUnit[];
  overlayBounds?: [[number, number], [number, number]] | null;
  overlayRotation?: number;
  svgViewBox?: SvgViewBox | null;
  anchorPoints?: { x: number; y: number }[] | null;
  onOpenBlueprint?: () => void;
}

// ─── Pannellum loader (singleton) ─────────────────────────────────────────────
let pannellumLoaded = false;
let pannellumLoading = false;
const pannellumCallbacks: (() => void)[] = [];

function loadPannellum(callback: () => void) {
  if (pannellumLoaded || (window as any).pannellum) {
    pannellumLoaded = true;
    callback();
    return;
  }
  pannellumCallbacks.push(callback);
  if (pannellumLoading) return;
  pannellumLoading = true;

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
  document.head.appendChild(css);

  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
  script.onload = () => {
    pannellumLoaded = true;
    pannellumLoading = false;
    pannellumCallbacks.forEach((cb) => cb());
    pannellumCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImagenViewer({
  imagen,
  onClose,
  onCalibrationSaved,
  units = [],
  overlayBounds = null,
  overlayRotation = 0,
  svgViewBox = null,
  anchorPoints = null,
}: ImagenViewerProps) {
  const viewerRef   = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  const [isLoading,    setIsLoading]    = useState(true);
  const [viewerReady,  setViewerReady]  = useState(false);

  const [showOverlay,       setShowOverlay]       = useState(false);
  const [overlayOpacity,    setOverlayOpacity]    = useState(0.6);
  const [overlayAlt,        setOverlayAlt]        = useState<number>(imagen.altitudM ?? 500);
  const [overlayHdg,        setOverlayHdg]        = useState<number>(imagen.imageHeading ?? 0);
  const [latOffset,         setLatOffset]         = useState<number>(imagen.latOffset ?? 0);
  const [lngOffset,         setLngOffset]         = useState<number>(imagen.lngOffset ?? 0);
  const [planRotation,      setPlanRotation]      = useState<number>(imagen.planRotation ?? 0);
  const [planScale,         setPlanScale]         = useState<number>(imagen.planScale ?? 1);
  const [planCornerAdjustments, setPlanCornerAdjustments] = useState<Array<{ x: number; y: number }> | null>(imagen.planCornerAdjustments || null);
  const [planCornersAbsolute,   setPlanCornersAbsolute]   = useState<Array<{ pitch: number; yaw: number }> | null>(imagen.planCornersAbsolute || null);
  const [isSavingCalib, setIsSavingCalib] = useState(false);
  const [calibSaved,    setCalibSaved]    = useState(false);
  const [drawingCount,    setDrawingCount]    = useState(0);
  const [resetKey,        setResetKey]        = useState(0);
  const [drawingPanMode,  setDrawingPanMode]  = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const isEditingRef = useRef(false);
  isEditingRef.current = isEditing;

  const is360 = isImagenMapa360Like(imagen.tipo);
  const tipoConfig = IMAGEN_TIPO_CONFIG[imagen.tipo];
  const hasOverlayData = is360;
  const hasOverlayDataRef = useRef(hasOverlayData);
  hasOverlayDataRef.current = hasOverlayData;

  const camLat = imagen.lat + latOffset / 111320;
  const camLng = imagen.lng + lngOffset / (111320 * Math.cos((imagen.lat * Math.PI) / 180));

  const polygonReady = !!(planCornersAbsolute && planCornersAbsolute.length >= 4);

  // ── Init Pannellum ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!is360) {
      setIsLoading(false);
      return;
    }

    loadPannellum(() => {
      if (!viewerRef.current || !(window as any).pannellum) return;
      setIsLoading(false);

      try {
        instanceRef.current = (window as any).pannellum.viewer(viewerRef.current, {
          type: "equirectangular",
          panorama: imagen.url,
          autoLoad: true,
          showControls: false,
          mouseZoom: false,
          hfov: 100,
          minHfov: 40,
          maxHfov: 120,
          compass: false,
          hotSpots: [],
        });

        instanceRef.current.on("load", () => setViewerReady(true));

        const poll = setInterval(() => {
          try {
            if (instanceRef.current?.isLoaded?.()) {
              setViewerReady(true);
              clearInterval(poll);
            }
          } catch { clearInterval(poll); }
        }, 150);
        setTimeout(() => clearInterval(poll), 15_000);
      } catch (err) {
        console.error("[ImagenViewer] Pannellum error", err);
      }
    });

    return () => {
      setViewerReady(false);
      try { instanceRef.current?.destroy(); } catch {}
      instanceRef.current = null;
    };
  }, [imagen.url, is360]);

  // ─── Smooth zoom / overlay scale ───
  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !is360) return;
    const handleWheel = (e: WheelEvent) => {
      if (!instanceRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      if (isEditingRef.current && hasOverlayDataRef.current) {
        const factor = e.deltaY > 0 ? 1.08 : 0.925;
        setOverlayAlt((prev) => Math.max(10, Math.round(prev * factor)));
      } else {
        const currentFov = instanceRef.current.getHfov();
        const delta = e.deltaY > 0 ? 5 : -5;
        instanceRef.current.setHfov(currentFov + delta);
      }
    };
    el.addEventListener("wheel", handleWheel as any, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", handleWheel as any, { capture: true } as any);
  }, [is360]);

  // ─── Arrow step ───────────────────────────────────────────────────────────
  const arrowStepRef = useRef<(screenDx: number, screenDy: number, stepM: number) => void>(() => {});
  arrowStepRef.current = (screenDx: number, screenDy: number, stepM: number) => {
    const viewer = instanceRef.current;
    if (!viewer) return;
    const DEG = Math.PI / 180;
    const viewYaw = (() => { try { return viewer.getYaw() as number; } catch { return 0; } })();
    const effHdgRad = (overlayHdg + viewYaw) * DEG;
    const north_m = (screenDx * (-Math.sin(effHdgRad)) + screenDy * (-Math.cos(effHdgRad))) * stepM;
    const east_m  = (screenDx * ( Math.cos(effHdgRad)) + screenDy * (-Math.sin(effHdgRad))) * stepM;
    setLatOffset((v) => v - north_m);
    setLngOffset((v) => v - east_m);
  };

  // ─── Keyboard arrows ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isEditingRef.current || !hasOverlayDataRef.current) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const stepM = e.shiftKey ? 25 : 5;
      if (e.key === "ArrowUp")    arrowStepRef.current( 0, -1, stepM);
      if (e.key === "ArrowDown")  arrowStepRef.current( 0, +1, stepM);
      if (e.key === "ArrowLeft")  arrowStepRef.current(-1,  0, stepM);
      if (e.key === "ArrowRight") arrowStepRef.current(+1,  0, stepM);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── Auto-aim in manual mode (polygon already saved) ──────────────────────
  useEffect(() => {
    if (!viewerReady || !instanceRef.current) return;
    if (!planCornersAbsolute || planCornersAbsolute.length < 3) return;
    const avgPitch = planCornersAbsolute.reduce((s, c) => s + c.pitch, 0) / planCornersAbsolute.length;
    const avgYaw   = planCornersAbsolute.reduce((s, c) => s + c.yaw,   0) / planCornersAbsolute.length;
    try { (instanceRef.current as any).lookAt(avgPitch - 15, avgYaw, 90, 500); } catch {
      try { (instanceRef.current as any).setPitch(avgPitch - 15); (instanceRef.current as any).setYaw(avgYaw); } catch {}
    }
  }, [viewerReady]); // Only on first load

  // ── Auto-aim toward lots (only when geo-calibrated) ──────────────────────
  useEffect(() => {
    if (!viewerReady || !hasOverlayData || !instanceRef.current) return;
    if (!svgViewBox || !overlayBounds || units.length === 0) return;

    let sumPitch = 0, sumYaw = 0, count = 0;
    for (const unit of units) {
      let svgPath = unit.path as string | undefined;
      if (!svgPath && (unit as any).coordenadasMasterplan) {
        try { const c = JSON.parse((unit as any).coordenadasMasterplan); svgPath = c.path; } catch {}
      }
      if (!svgPath) continue;

      const latLngs = svgPathToLatLng(svgPath, svgViewBox, overlayBounds, overlayRotation);
      if (latLngs.length === 0) continue;

      const cLat = latLngs.reduce((s, [lat]) => s + lat, 0) / latLngs.length;
      const cLng = latLngs.reduce((s, [, lng]) => s + lng, 0) / latLngs.length;
      const { pitch, yaw } = geoToPitchYaw(cLat, cLng, camLat, camLng, overlayAlt, overlayHdg);
      sumPitch += pitch;
      sumYaw   += yaw;
      count++;
    }

    if (count === 0) return;
    try {
      instanceRef.current.setPitch(sumPitch / count);
      instanceRef.current.setYaw(sumYaw / count);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerReady]);

  // ── Save calibration ──────────────────────────────────────────────────────
  const saveCalibration = useCallback(async () => {
    setIsSavingCalib(true);
    try {
      const res = await fetch(`/api/imagenes-mapa/${imagen.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          altitudM: overlayAlt, imageHeading: overlayHdg, latOffset, lngOffset, planRotation, planScale,
          overlayMode: undefined, planCornerAdjustments, planCornersAbsolute,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setCalibSaved(true);
      setTimeout(() => setCalibSaved(false), 2000);
      onCalibrationSaved?.({ altitudM: overlayAlt, imageHeading: overlayHdg, latOffset, lngOffset, planRotation, planScale });
    } catch {
      toast.error("No se pudo guardar la calibración");
    } finally {
      setIsSavingCalib(false);
    }
  }, [imagen.id, overlayAlt, overlayHdg, latOffset, lngOffset, planRotation, planScale, planCornerAdjustments, planCornersAbsolute, onCalibrationSaved]);

  const handleResetCorners = useCallback(() => {
    setPlanCornersAbsolute(null);
    setShowOverlay(false);
    setDrawingCount(0);
    setDrawingPanMode(false);
    setResetKey((k) => k + 1);
  }, []);

  const handleFuse = useCallback(() => {
    setShowOverlay(true);
    if (planCornersAbsolute && planCornersAbsolute.length >= 3 && instanceRef.current) {
      const avgPitch = planCornersAbsolute.reduce((s, c) => s + c.pitch, 0) / planCornersAbsolute.length;
      const avgYaw   = planCornersAbsolute.reduce((s, c) => s + c.yaw,   0) / planCornersAbsolute.length;
      try { (instanceRef.current as any).lookAt(avgPitch - 15, avgYaw, 90, 800); } catch {
        try { (instanceRef.current as any).setPitch(avgPitch - 15); (instanceRef.current as any).setYaw(avgYaw); } catch {}
      }
    }
  }, [planCornersAbsolute]);

  const showOverlayComponent = viewerReady && hasOverlayData && (isEditing || polygonReady);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{tipoConfig.emoji}</span>
          <span className="text-white font-medium text-sm">{imagen.titulo || "Imagen sin título"}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: tipoConfig.color + "33", color: tipoConfig.color }}
          >
            {tipoConfig.label}
          </span>
          {imagen.unidad && <span className="text-xs text-slate-400">Lote {imagen.unidad.numero}</span>}
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Viewer area ── */}
      <div className="relative flex-1 overflow-hidden">

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
          </div>
        )}

        {is360 ? (
          <>
            <div ref={viewerRef} className="w-full h-full" />

            {showOverlayComponent && (
              <Viewer360LotesOverlay
                key={resetKey}
                viewer={instanceRef.current}
                units={units}
                overlayBounds={overlayBounds ?? undefined}
                overlayRotation={overlayRotation}
                svgViewBox={svgViewBox ?? undefined}
                anchorPoints={anchorPoints ?? undefined}
                camLat={camLat}
                camLng={camLng}
                camAlt={overlayAlt}
                imageHeading={overlayHdg}
                latOffset={latOffset}
                lngOffset={lngOffset}
                planScale={planScale}
                planRotation={planRotation}
                opacity={showOverlay ? overlayOpacity : 0}
                drawingPanMode={drawingPanMode}
                isEditing={isEditing}
                mode="manual"
                planCornerAdjustments={planCornerAdjustments ?? undefined}
                planCornersAbsolute={planCornersAbsolute || undefined}
                onEnterEdit={() => setIsEditing(true)}
                onExitEdit={() => setIsEditing(false)}
                onDrawingCountChange={setDrawingCount}
                onParamsChange={(p) => {
                  if (p.latOffset !== undefined) setLatOffset(p.latOffset);
                  if (p.lngOffset !== undefined) setLngOffset(p.lngOffset);
                  if (p.camAlt !== undefined) setOverlayAlt(p.camAlt);
                  if (p.imageHeading !== undefined) setOverlayHdg(p.imageHeading);
                  if (p.planRotation !== undefined) setPlanRotation(p.planRotation);
                  if (p.planScale !== undefined) setPlanScale(p.planScale);
                  if (p.planCornerAdjustments !== undefined) setPlanCornerAdjustments(p.planCornerAdjustments);
                  if (p.planCornersAbsolute !== undefined) setPlanCornersAbsolute(p.planCornersAbsolute);
                }}
              />
            )}

            {!isLoading && hasOverlayData && (
              <OverlayControls
                showOverlay={showOverlay}
                onToggle={() => setShowOverlay((v) => !v)}
                onFuse={handleFuse}
                onResetManualCorners={handleResetCorners}
                onSave={saveCalibration}
                isSaving={isSavingCalib}
                saved={calibSaved}
                isEditing={isEditing}
                onEnterEdit={() => setIsEditing(true)}
                onExitEdit={() => setIsEditing(false)}
                planCornersAbsolute={planCornersAbsolute}
                unitCount={units.length}
                opacity={overlayOpacity}
                onOpacityChange={setOverlayOpacity}
                drawingCount={drawingCount}
                drawingPanMode={drawingPanMode}
                onDrawingPanModeChange={setDrawingPanMode}
                planRotation={planRotation}
                onPlanRotationChange={(v) => {
                  setPlanRotation(v);
                }}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={imagen.url}
              alt={imagen.titulo || "Imagen"}
              className="max-w-full max-h-full object-contain rounded-xl"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Overlay Controls ─────────────────────────────────────────────────────────

interface OverlayControlsProps {
  showOverlay: boolean;
  onToggle: () => void;
  onFuse: () => void;
  onResetManualCorners: () => void;
  onSave: () => void;
  isSaving: boolean;
  saved: boolean;
  isEditing: boolean;
  onEnterEdit: () => void;
  onExitEdit: () => void;
  planCornersAbsolute: Array<{ pitch: number; yaw: number }> | null;
  unitCount: number;
  opacity: number;
  onOpacityChange: (v: number) => void;
  drawingCount: number;
  drawingPanMode: boolean;
  onDrawingPanModeChange: (v: boolean) => void;
  planRotation: number;
  onPlanRotationChange: (v: number) => void;
}

function OverlayControls({
  showOverlay, onToggle, onFuse,
  onResetManualCorners,
  onSave, isSaving, saved,
  isEditing, onEnterEdit, onExitEdit,
  planCornersAbsolute, unitCount,
  opacity, onOpacityChange,
  drawingCount,
  drawingPanMode, onDrawingPanModeChange,
  planRotation, onPlanRotationChange,
}: OverlayControlsProps) {
  const polygonReady = !!(planCornersAbsolute && planCornersAbsolute.length >= 4);

  return (
    <>
      {/* ── Toolbar pill (visible when NOT editing) ── */}
      {!isEditing && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1.5 shadow-xl">

          {/* Phase 2: polygon ready, not yet fused */}
          {polygonReady && !showOverlay && (
            <>
              <button
                onClick={onFuse}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
              >
                <Map className="w-3.5 h-3.5" />
                Fusionar Plano
              </button>
              <div className="w-px h-4 bg-white/10" />
            </>
          )}

          {/* Phase 3: fused — toggle lots */}
          {polygonReady && showOverlay && (
            <>
              <button
                onClick={onToggle}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  showOverlay
                    ? "bg-indigo-600 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                {showOverlay ? "Lotes ON" : "Lotes OFF"}
              </button>
              <div className="w-px h-4 bg-white/10" />
            </>
          )}

          <button
            onClick={onEnterEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
            {polygonReady ? "Ajustar" : "Editar Overlay"}
          </button>
        </div>
      )}

      {/* ── Right sidebar (visible WHEN editing) ── */}
      {isEditing && (
        <div className="absolute top-16 right-4 bottom-6 w-80 bg-black/85 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col z-[9999] animate-in slide-in-from-right-8 pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Pencil className="w-4 h-4 text-indigo-400" />
              Modo Edición
            </h3>
            <button onClick={onExitEdit} className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* ── Phase 1: no polygon yet ── */}
            {!polygonReady && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[11px] font-black shrink-0">1</div>
                  <span className="text-xs font-bold text-white">Paso 1 de 2 — Marcá el perímetro</span>
                </div>

                {/* Mode toggle: Draw vs Pan */}
                <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
                  <button
                    onClick={() => onDrawingPanModeChange(false)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      !drawingPanMode
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Pencil className="w-3 h-3" />
                    Dibujar
                  </button>
                  <button
                    onClick={() => onDrawingPanModeChange(true)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      drawingPanMode
                        ? "bg-slate-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Move className="w-3 h-3" />
                    Mover vista
                  </button>
                </div>

                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-3">
                  {drawingPanMode ? (
                    <>
                      <Move className="w-7 h-7 text-slate-400 mx-auto block" />
                      <p className="text-sm text-slate-300 font-medium text-center">Modo paneo activo</p>
                      <p className="text-xs text-slate-400 leading-relaxed text-center">
                        Arrastrá la imagen para navegar. Cambiá a <strong className="text-white">Dibujar</strong> para colocar puntos.
                      </p>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-7 h-7 text-indigo-400 mx-auto block" />
                      <p className="text-sm text-indigo-100 font-medium text-center">Dibujá el polígono sobre el terreno</p>
                      <p className="text-xs text-indigo-200/70 leading-relaxed text-center">
                        Hacé clic en la imagen 360 para definir los vértices del polígono.
                      </p>
                    </>
                  )}
                  {drawingCount > 0 && (
                    <div className="text-center py-1.5 px-3 bg-indigo-600/20 rounded-lg border border-indigo-500/20">
                      <span className="text-xs font-bold text-indigo-300">
                        {drawingCount} punto{drawingCount !== 1 ? "s" : ""} colocado{drawingCount !== 1 ? "s" : ""}
                        {drawingCount < 4
                          ? ` — faltan ${4 - drawingCount} más`
                          : " — hacé clic cerca del primero para cerrar"}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={onResetManualCorners}
                  className="w-full px-3 py-2 text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg transition-colors border border-red-500/20"
                >
                  Reiniciar Pines
                </button>
              </div>
            )}

            {/* ── Phase 2: polygon done, ready to fuse ── */}
            {polygonReady && !showOverlay && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Paso 1 completado</p>
                    <p className="text-xs text-emerald-400/70">{planCornersAbsolute!.length} vértices colocados</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[11px] font-black shrink-0">2</div>
                  <span className="text-xs font-bold text-white">Paso 2 de 2 — Superponé el plano</span>
                </div>

                <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl space-y-2 text-center">
                  <Map className="w-6 h-6 text-indigo-400 mx-auto" />
                  <p className="text-sm text-white font-medium">Fusionar el plano de lotes</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Superponé los lotes del proyecto sobre el perímetro que marcaste.
                  </p>
                </div>

                <button
                  onClick={onFuse}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all"
                >
                  <Map className="w-4 h-4" />
                  Fusionar Plano
                </button>

                <button
                  onClick={onResetManualCorners}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Redibujar perímetro
                </button>
              </div>
            )}

            {/* ── Phase 3: fused ── */}
            {polygonReady && showOverlay && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Plano superpuesto</p>
                    <p className="text-xs text-emerald-400/70">
                      {unitCount > 0 ? `${unitCount} lotes visibles` : "Sin lotes cargados"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3 h-3" /> Opacidad
                    </span>
                    <span className="text-indigo-400 font-bold">{Math.round(opacity * 100)}%</span>
                  </label>
                  <input
                    type="range" min="0.1" max="1" step="0.05"
                    value={opacity}
                    onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-3 h-3" /> Rotación del plano
                    </span>
                    <span className="text-indigo-400 font-bold">{Math.round(planRotation)}°</span>
                  </label>
                  <input
                    type="range" min="-180" max="180" step="1"
                    value={planRotation}
                    onChange={(e) => onPlanRotationChange(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5"
                  />
                  {planRotation !== 0 && (
                    <button
                      onClick={() => onPlanRotationChange(0)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Restablecer rotación
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Usá "Rotación del plano" si el loteo queda girado respecto al terreno.
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showOverlay ? "Ocultar Lotes" : "Mostrar Lotes"}
                  </button>

                  <button
                    onClick={onResetManualCorners}
                    className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Redibujar perímetro
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer — Save */}
          <div className="p-4 border-t border-white/10 bg-black/50 rounded-b-2xl flex-shrink-0">
            <button
              onClick={onSave}
              disabled={isSaving}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                saved
                  ? "bg-green-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-500/25"
              )}
            >
              {isSaving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : saved
                  ? <><Check className="w-4 h-4" /> Guardado</>
                  : "Guardar Alineación"
              }
            </button>
          </div>
        </div>
      )}
    </>
  );
}
