"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, Camera, Compass, Loader2, RefreshCw, RotateCw, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { upsertPropertyMediaAction } from "@/modules/properties/actions";
import {
  categoryLabels,
  type MediaCategory,
  type UploadedMediaPayload,
  uploadToPropertyMedia,
} from "./media-upload-modal";

type CameraCaptureModalProps = {
  open: boolean;
  orgSlug: string;
  propertyId: string;
  onOpenChange: (open: boolean) => void;
  onCaptured: (payload: UploadedMediaPayload) => void;
};

const cameraCategories: MediaCategory[] = ["REAL", "PROGRESS", "RENDER"];
const guidedYawSteps = [0, 60, 120, 180, 240, 300];
const guidedPitchSteps = [
  { label: "Piso", targetBeta: 55 },
  { label: "Frente", targetBeta: 0 },
  { label: "Techo", targetBeta: -55 },
];
const guidedFrameCount = guidedYawSteps.length * guidedPitchSteps.length;

type CaptureMode = "photo" | "guided360";
type CapturedFrame = {
  blob: Blob;
  url: string;
};

function buildCapturedFilename(category: MediaCategory) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `captura-${category.toLowerCase()}-${timestamp}.jpg`;
}

function normalizeAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

function shortestAngleDistance(current: number, target: number) {
  const distance = normalizeAngle(current - target);
  return distance > 180 ? distance - 360 : distance;
}

async function blobToBitmap(blob: Blob) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(blob);
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo procesar una captura."));
    };
    image.src = url;
  });
}

async function buildGuidedPanoramaFile(frames: CapturedFrame[], title: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 4096;
  canvas.height = 2048;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo generar la escena 360.");

  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const tileWidth = canvas.width / guidedYawSteps.length;
  const tileHeight = canvas.height / guidedPitchSteps.length;

  for (let index = 0; index < frames.length; index += 1) {
    const bitmap = await blobToBitmap(frames[index].blob);
    const x = (index % guidedYawSteps.length) * tileWidth;
    const y = Math.floor(index / guidedYawSteps.length) * tileHeight;
    context.drawImage(bitmap, x, y, tileWidth, tileHeight);
    if ("close" in bitmap && typeof bitmap.close === "function") {
      bitmap.close();
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("No se pudo generar la imagen 360.");

  const filename = `${title || "escena-360-guiada"}.jpg`
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return new File([blob], filename || "escena-360-guiada.jpg", { type: "image/jpeg" });
}

export function CameraCaptureModal({
  open,
  orgSlug,
  propertyId,
  onOpenChange,
  onCaptured,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wasAlignedRef = useRef(false);
  const previousWebcamFrameRef = useRef<Uint8ClampedArray | null>(null);
  const webcamStableTicksRef = useRef(0);
  const [mode, setMode] = useState<CaptureMode>("photo");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MediaCategory>("REAL");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [guidedFrames, setGuidedFrames] = useState<CapturedFrame[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0 });
  const [sensorEnabled, setSensorEnabled] = useState(false);
  const [webcamAutoAligned, setWebcamAutoAligned] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPending, startTransition] = useTransition();

  const isSaving = isPending || progress > 0;
  const canSave = Boolean(capturedFile && title.trim()) && !isSaving;
  const hasCompletedGuidedCapture = mode === "guided360" && Boolean(capturedFile);
  const displayedGuidedCount = hasCompletedGuidedCapture ? guidedFrameCount : guidedFrames.length;
  const guidedIndex = guidedFrames.length;
  const guidedPitchIndex = Math.floor(guidedIndex / guidedYawSteps.length);
  const guidedYawIndex = guidedIndex % guidedYawSteps.length;
  const guidedStep = guidedPitchSteps[Math.min(guidedPitchIndex, guidedPitchSteps.length - 1)];
  const targetYaw = guidedYawSteps[guidedYawIndex] ?? 0;
  const yawDelta = shortestAngleDistance(orientation.alpha, targetYaw);
  const pitchDelta = orientation.beta - (guidedStep?.targetBeta ?? 0);
  const simulatedYawDelta = webcamAutoAligned ? 0 : sensorEnabled ? yawDelta : Math.max(-34, Math.min(34, 34 - guidedFrames.length * 4));
  const simulatedPitchDelta = webcamAutoAligned ? 0 : sensorEnabled ? pitchDelta : Math.max(-24, Math.min(24, 24 - guidedFrames.length * 3));
  const isAligned = Math.abs(simulatedYawDelta) <= 12 && Math.abs(simulatedPitchDelta) <= 14;
  const guideOffsetX = Math.max(-38, Math.min(38, simulatedYawDelta)) * 1.6;
  const guideOffsetY = Math.max(-30, Math.min(30, simulatedPitchDelta)) * 1.6;
  const primaryInstruction = (() => {
    if (isAligned) return "Posicion correcta";
    if (Math.abs(simulatedPitchDelta) > 14) {
      if (guidedStep?.label === "Piso") return "Apunta hacia el piso";
      if (guidedStep?.label === "Techo") return "Apunta hacia el techo";
      return "Apunta al frente";
    }
    if (Math.abs(simulatedYawDelta) > 12) {
      return simulatedYawDelta > 0 ? "Gira a la izquierda" : "Gira a la derecha";
    }
    return "Ajusta la camara";
  })();
  const titlePlaceholder = useMemo(() => {
    if (mode === "guided360") return "Ej. Living 360";
    if (category === "PROGRESS") return "Ej. Avance living";
    if (category === "RENDER") return "Ej. Render cocina";
    return "Ej. Foto desde camara";
  }, [category, mode]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setCameraError(null);
    setCapturedFile(null);
    setGuidedFrames([]);
    setPreviewUrl(null);
    setProgress(0);
    setWebcamAutoAligned(false);

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCameraError("No se pudo abrir la camara. Revisa permisos o usa Subir imagen.");
      }
    }

    void startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !sensorEnabled) return;

    function handleOrientation(event: DeviceOrientationEvent) {
      setOrientation({
        alpha: normalizeAngle(event.alpha ?? 0),
        beta: event.beta ?? 0,
      });
    }

    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [open, sensorEnabled]);

  useEffect(() => {
    setWebcamAutoAligned(false);
    previousWebcamFrameRef.current = null;
    webcamStableTicksRef.current = 0;
  }, [guidedFrames.length, mode]);

  useEffect(() => {
    if (!open || mode !== "guided360" || sensorEnabled || capturedFile || cameraError) return;

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 48;
    sampleCanvas.height = 27;
    const context = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    const interval = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

      context.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height);
      const current = context.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
      const previous = previousWebcamFrameRef.current;

      if (!previous) {
        previousWebcamFrameRef.current = new Uint8ClampedArray(current);
        return;
      }

      let delta = 0;
      for (let index = 0; index < current.length; index += 16) {
        delta += Math.abs(current[index] - previous[index]);
      }

      const averageDelta = delta / (current.length / 16);
      previousWebcamFrameRef.current = new Uint8ClampedArray(current);

      if (averageDelta < 8) {
        webcamStableTicksRef.current += 1;
      } else {
        webcamStableTicksRef.current = 0;
      }

      setWebcamAutoAligned(webcamStableTicksRef.current >= 3);
    }, 220);

    return () => window.clearInterval(interval);
  }, [cameraError, capturedFile, mode, open, sensorEnabled]);

  useEffect(() => {
    if (mode !== "guided360") {
      wasAlignedRef.current = false;
      return;
    }

    if (isAligned && !wasAlignedRef.current) {
      wasAlignedRef.current = true;
      playAlignmentBuzz();
      return;
    }

    if (!isAligned) {
      wasAlignedRef.current = false;
    }
  }, [isAligned, mode, guidedFrames.length]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleClose(nextOpen: boolean) {
    if (isSaving) return;
    if (!nextOpen) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      guidedFrames.forEach((frame) => URL.revokeObjectURL(frame.url));
      setPreviewUrl(null);
      setCapturedFile(null);
      setGuidedFrames([]);
      setProgress(0);
    }
    onOpenChange(nextOpen);
  }

  function playAlignmentBuzz() {
    try {
      const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextCtor = window.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioContextCtor) return;

      const audioContext = new AudioContextCtor();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(720, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(520, audioContext.currentTime + 0.06);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.16);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.18);
      window.setTimeout(() => void audioContext.close(), 260);
    } catch {
      // Audio feedback is optional; camera guidance still works visually.
    }
  }

  async function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setCameraError("No se pudo capturar la imagen.");
      return;
    }

    const file = new File([blob], buildCapturedFilename(category), { type: "image/jpeg" });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreviewUrl = URL.createObjectURL(file);

    if (mode === "guided360") {
      setGuidedFrames((current) => {
        const nextFrames = [...current, { blob, url: nextPreviewUrl }];
        if (nextFrames.length === guidedFrameCount) {
          void buildGuidedPanoramaFile(nextFrames, title || titlePlaceholder)
            .then((panoramaFile) => {
              nextFrames.forEach((frame) => URL.revokeObjectURL(frame.url));
              setCapturedFile(panoramaFile);
              setPreviewUrl(URL.createObjectURL(panoramaFile));
              setCategory("PANORAMA");
              setGuidedFrames([]);
              setTitle((currentTitle) => currentTitle || titlePlaceholder);
            })
            .catch((error: any) => setCameraError(error.message ?? "No se pudo generar la escena 360."));
        }
        return nextFrames;
      });
      setWebcamAutoAligned(false);
      setTitle((current) => current || titlePlaceholder);
      return;
    }

    setCapturedFile(file);
    setPreviewUrl(nextPreviewUrl);
    setTitle((current) => current || titlePlaceholder);
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    guidedFrames.forEach((frame) => URL.revokeObjectURL(frame.url));
    setPreviewUrl(null);
    setCapturedFile(null);
    setGuidedFrames([]);
    setProgress(0);
    setCameraError(null);
    setWebcamAutoAligned(false);
  }

  async function enableSensors() {
    try {
      if (typeof window.DeviceOrientationEvent === "undefined") {
        setCameraError("Este navegador no expone sensores de orientacion. Podes seguir en modo demo webcam.");
        return;
      }

      const eventWithPermission = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<PermissionState>;
      };
      if (typeof eventWithPermission.requestPermission === "function") {
        const permission = await eventWithPermission.requestPermission();
        if (permission !== "granted") {
          setCameraError("No se habilitaron los sensores de orientacion.");
          return;
        }
      }
      setSensorEnabled(true);
      setWebcamAutoAligned(false);
      setCameraError(null);
    } catch {
      setCameraError("No se pudieron activar los sensores de orientacion.");
    }
  }

  function handleSave() {
    if (!capturedFile || !title.trim()) return;
    setCameraError(null);
    setProgress(1);

    startTransition(async () => {
      try {
        const url = await uploadToPropertyMedia(capturedFile, category, orgSlug, propertyId, setProgress);
        const payload: UploadedMediaPayload = {
          url,
          category,
          title: title.trim(),
        };

        const result = await upsertPropertyMediaAction(orgSlug, propertyId, payload);
        if (!result.success) {
          throw new Error(result.message ?? "No se pudo guardar la captura.");
        }

        onCaptured(payload);
        setProgress(0);
        onOpenChange(false);
      } catch (error: any) {
        setProgress(0);
        setCameraError(error.message ?? "No se pudo guardar la captura.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-white/10 bg-[#111118] text-white shadow-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Camara</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] p-2">
              <div className="flex rounded-md border border-white/10 bg-black/40 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode("photo");
                    handleRetake();
                    setCategory("REAL");
                  }}
                  className={`rounded px-2 py-1 ${mode === "photo" ? "bg-white text-slate-950" : "text-white/60"}`}
                >
                  Foto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("guided360");
                    handleRetake();
                    setCategory("PANORAMA");
                  }}
                  className={`rounded px-2 py-1 ${mode === "guided360" ? "bg-white text-slate-950" : "text-white/60"}`}
                >
                  360 guiado
                </button>
              </div>
              {mode === "guided360" && (
                <span className="text-xs font-semibold text-white/70">
                  {displayedGuidedCount}/{guidedFrameCount}
                </span>
              )}
            </div>
            <div className="relative">
              {previewUrl ? (
                <img src={previewUrl} alt={title || "Captura de camara"} className="aspect-video w-full object-cover" />
              ) : cameraError ? (
                <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center text-white/60">
                  <VideoOff className="h-10 w-10 text-white/35" />
                  <p className="text-sm">{cameraError}</p>
                </div>
              ) : (
                <video ref={videoRef} playsInline muted className="aspect-video w-full object-cover" />
              )}

              {mode === "guided360" && !previewUrl && !cameraError && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div
                    className={`absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 ${
                      isAligned ? "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.65)]" : "bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.55)]"
                    }`}
                    style={{ transform: `translateY(calc(-50% + ${guideOffsetY}px))` }}
                  />
                  <div
                    className={`absolute bottom-0 top-0 left-1/2 w-0.5 -translate-x-1/2 ${
                      isAligned ? "bg-emerald-400/80" : "bg-rose-500/80"
                    }`}
                    style={{ transform: `translateX(calc(-50% + ${guideOffsetX}px))` }}
                  />
                  <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-white/45" />
                  <div className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-white/35" />
                  <div
                    className={`absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                      isAligned ? "border-emerald-300 bg-emerald-400/25" : "border-rose-300 bg-rose-500/25"
                    }`}
                    style={{
                      transform: `translate(calc(-50% + ${guideOffsetX}px), calc(-50% + ${guideOffsetY}px))`,
                    }}
                  >
                    <span
                      className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                        isAligned ? "bg-emerald-300" : "bg-rose-400"
                      }`}
                    />
                  </div>
                  <div
                    className={`absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                      isAligned
                        ? "border-emerald-300/60 bg-emerald-500/20 text-emerald-100"
                        : "border-rose-300/60 bg-rose-500/20 text-rose-100"
                    }`}
                  >
                    {primaryInstruction}
                  </div>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="space-y-4">
            {mode === "photo" ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/55">
                  Tipo
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as MediaCategory)}
                  className="w-full rounded-lg border border-white/10 bg-[#191922] px-3 py-2 text-sm text-white outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25"
                >
                  {cameraCategories.map((value) => (
                    <option key={value} value={value}>
                      {categoryLabels[value]}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Guia 360</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {hasCompletedGuidedCapture ? "Escena lista" : `${guidedStep?.label ?? "Listo"} - Pos ${guidedYawIndex + 1}/6`}
                    </p>
                  </div>
                  <span
                    className={`h-3 w-3 rounded-full ${isAligned ? "bg-emerald-400" : "bg-rose-400"}`}
                    title={isAligned ? "Alineado" : "Ajustar posicion"}
                  />
                </div>
                <div className="space-y-2 text-xs text-white/65">
                  <p className="flex items-center gap-2">
                    <RotateCw className="h-3.5 w-3.5" />
                    Giro objetivo: {targetYaw}°
                  </p>
                  <p className="flex items-center gap-2">
                    <Compass className="h-3.5 w-3.5" />
                    {sensorEnabled
                      ? `Delta ${Math.round(simulatedYawDelta)}° / ${Math.round(simulatedPitchDelta)}°`
                      : webcamAutoAligned
                        ? "Webcam estable - posicion correcta"
                        : "Webcam: mantenela quieta"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={enableSensors}
                  disabled={sensorEnabled}
                  className="mt-3 w-full bg-white/[0.05] text-white/75 hover:bg-white/[0.1] hover:text-white"
                >
                  Activar sensores
                </Button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSensorEnabled(false);
                      setWebcamAutoAligned(false);
                      previousWebcamFrameRef.current = null;
                      webcamStableTicksRef.current = 0;
                      setCameraError(null);
                    }}
                    className="col-span-2 bg-white/[0.05] px-2 text-xs text-white/75 hover:bg-white/[0.1] hover:text-white"
                  >
                    Probar con webcam
                  </Button>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/55">
                Titulo
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25"
                placeholder={titlePlaceholder}
              />
            </div>

            {progress > 0 && (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                  <span>Guardando captura</span>
                  <span className="font-semibold text-white">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {cameraError && previewUrl && (
              <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={isSaving}
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            Cerrar
          </Button>
          {capturedFile ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleRetake}
              disabled={isSaving}
              className="text-white/70 hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Repetir
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleCapture}
              disabled={Boolean(cameraError) || (mode === "guided360" && guidedFrames.length >= guidedFrameCount)}
            >
              <Camera className="mr-2 h-4 w-4" />
              {mode === "guided360" ? "Capturar posicion" : "Capturar"}
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar captura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
