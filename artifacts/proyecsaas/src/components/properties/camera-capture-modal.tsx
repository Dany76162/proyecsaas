"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Camera,
  Compass,
  Loader2,
  VideoOff,
} from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { upsertPropertyMediaAction } from "@/modules/properties/actions";
import {
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

const guidedYawSteps = [0, 60, 120, 180, 240, 300];
// Capture order per yaw stop: floor first, then front, then ceiling
// DeviceOrientationEvent.beta in portrait with rear camera:
//   ~0°  = phone flat (screen up)  → camera points at FLOOR
//   ~90° = phone upright           → camera points STRAIGHT AHEAD
//   ~140°= phone tilted back       → camera points at CEILING
const guidedPitchSteps = [
  { label: "Piso", targetBeta: 20, icon: "↓" },
  { label: "Frente", targetBeta: 80, icon: "→" },
  { label: "Techo", targetBeta: 140, icon: "↑" },
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

  // Iteration order: yaw outer, pitch inner → (yaw0,floor),(yaw0,front),(yaw0,ceiling),(yaw1,floor)…
  // Canvas: columns = yaw positions left→right, rows = ceiling(top)→front(mid)→floor(bottom)
  for (let index = 0; index < frames.length; index += 1) {
    const bitmap = await blobToBitmap(frames[index].blob);
    const yawIdx = Math.floor(index / guidedPitchSteps.length);
    const pitchIdx = index % guidedPitchSteps.length;
    const x = yawIdx * tileWidth;
    // pitchIdx 0=Piso→bottom row, 1=Frente→middle, 2=Techo→top row
    const y = (guidedPitchSteps.length - 1 - pitchIdx) * tileHeight;
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
  const autoCaptureTimerRef = useRef<number | null>(null);
  const isAutoCapturingRef = useRef(false);
  const [mode, setMode] = useState<CaptureMode>("guided360");
  const [category, setCategory] = useState<MediaCategory>("PANORAMA");
  const [title, setTitle] = useState("");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [guidedFrames, setGuidedFrames] = useState<CapturedFrame[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0 });
  const [sensorEnabled, setSensorEnabled] = useState(false);
  const [sensorBypassed, setSensorBypassed] = useState(false);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPending, startTransition] = useTransition();

  const isSaving = isPending || progress > 0;
  const canSave = Boolean(capturedFile) && !isSaving;
  const hasCompletedGuidedCapture = mode === "guided360" && Boolean(capturedFile);
  const displayedGuidedCount = hasCompletedGuidedCapture ? guidedFrameCount : guidedFrames.length;
  const guidedIndex = guidedFrames.length;
  // yaw is the OUTER loop: complete floor/front/ceiling per yaw stop before rotating
  const guidedYawIndex = Math.floor(guidedIndex / guidedPitchSteps.length);
  const guidedPitchIndex = guidedIndex % guidedPitchSteps.length;
  const guidedStep = guidedPitchSteps[Math.min(guidedPitchIndex, guidedPitchSteps.length - 1)];
  const targetYaw = guidedYawSteps[Math.min(guidedYawIndex, guidedYawSteps.length - 1)] ?? 0;
  const yawDelta = shortestAngleDistance(orientation.alpha, targetYaw);
  const pitchDelta = orientation.beta - (guidedStep?.targetBeta ?? 0);
  const guideYawDelta = sensorEnabled ? yawDelta : 0;
  const guidePitchDelta = sensorEnabled ? pitchDelta : 0;
  // Very wide tolerances so floor/ceiling reliably trigger on budget phones like TCL 305i (±45° pitch, ±25° yaw)
  const isAligned = Math.abs(guideYawDelta) <= 25 && Math.abs(guidePitchDelta) <= 45;
  const guideOffsetX = Math.max(-38, Math.min(38, guideYawDelta)) * 1.6;
  const guideOffsetY = Math.max(-30, Math.min(30, guidePitchDelta)) * 1.6;
  // Bubble level offset: positive pitchDelta = tilting too far, move bubble right
  const levelBubbleOffset = Math.max(-56, Math.min(56, guidePitchDelta * 1.4));
  const captureTitle = useMemo(() => {
    if (mode === "guided360") return "escena 360 guiada";
    if (category === "PROGRESS") return "avance de obra";
    if (category === "RENDER") return "render";
    return "foto desde camara";
  }, [category, mode]);
  const canCapture =
    !cameraError &&
    !isSaving &&
    !capturedFile &&
    (mode === "photo" ||
      (guidedFrames.length < guidedFrameCount && autoCaptureCountdown === null && (isAligned || sensorBypassed)));
  const primaryInstruction = (() => {
    if (isAligned) return "¡Posición correcta!";
    const pitchOff = Math.abs(guidePitchDelta) > 20;
    const yawOff = Math.abs(guideYawDelta) > 15;
    if (pitchOff && !yawOff) {
      if (guidedStep?.label === "Piso") return guidePitchDelta < 0 ? "Inclina más hacia el piso" : "Levanta un poco";
      if (guidedStep?.label === "Techo") return guidePitchDelta > 0 ? "Inclina más hacia el techo" : "Baja un poco";
      return guidePitchDelta > 0 ? "Inclina menos" : "Apunta más al frente";
    }
    if (yawOff) {
      return guideYawDelta > 0 ? "Gira a la izquierda" : "Gira a la derecha";
    }
    return "Ajusta la cámara";
  })();

  function clearAutoCapture() {
    if (autoCaptureTimerRef.current) {
      window.clearInterval(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }
    isAutoCapturingRef.current = false;
    setAutoCaptureCountdown(null);
  }

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setCameraError(null);
    setCapturedFile(null);
    setGuidedFrames([]);
    setPreviewUrl(null);
    setProgress(0);
    setSensorBypassed(false);
    clearAutoCapture();

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            aspectRatio: { ideal: 16 / 9 },
          },
          audio: false,
        });
        // Try to use the widest (ultrawide) lens by minimizing zoom
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track.getCapabilities?.() as any;
          if (caps?.zoom?.min !== undefined) {
            await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min } as any] });
          }
        } catch { /* wide angle is optional */ }
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
    if (!open || mode !== "guided360" || sensorEnabled) return;
    void enableSensors();
  }, [mode, open, sensorEnabled]);

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
    if (
      !open ||
      mode !== "guided360" ||
      !sensorEnabled ||
      !isAligned ||
      capturedFile ||
      cameraError ||
      guidedFrames.length >= guidedFrameCount
    ) {
      clearAutoCapture();
      return;
    }

    if (isAutoCapturingRef.current) return;

    isAutoCapturingRef.current = true;
    setAutoCaptureCountdown(2);
    autoCaptureTimerRef.current = window.setInterval(() => {
      setAutoCaptureCountdown((current) => {
        if (current === null) return null;
        if (current <= 1) {
          if (autoCaptureTimerRef.current) {
            window.clearInterval(autoCaptureTimerRef.current);
            autoCaptureTimerRef.current = null;
          }
          void handleCapture();
          return null;
        }
        return current - 1;
      });
    }, 450);

    return clearAutoCapture;
  }, [cameraError, capturedFile, guidedFrames.length, isAligned, mode, open]);

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
      setSensorBypassed(false);
      clearAutoCapture();
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
    clearAutoCapture();
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
          void buildGuidedPanoramaFile(nextFrames, title || captureTitle)
            .then((panoramaFile) => {
              nextFrames.forEach((frame) => URL.revokeObjectURL(frame.url));
              setCapturedFile(panoramaFile);
              setPreviewUrl(URL.createObjectURL(panoramaFile));
              setCategory("PANORAMA");
              setGuidedFrames([]);
              setTitle((currentTitle) => currentTitle || captureTitle);
            })
            .catch((error: any) => setCameraError(error.message ?? "No se pudo generar la escena 360."));
        }
        return nextFrames;
      });
      setTitle((current) => current || captureTitle);
      return;
    }

    setCapturedFile(file);
    setPreviewUrl(nextPreviewUrl);
    setTitle((current) => current || captureTitle);
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    guidedFrames.forEach((frame) => URL.revokeObjectURL(frame.url));
    setPreviewUrl(null);
    setCapturedFile(null);
    setGuidedFrames([]);
    setProgress(0);
    setCameraError(null);
    clearAutoCapture();
  }

  async function enableSensors() {
    try {
      if (typeof window.DeviceOrientationEvent === "undefined") {
        setSensorEnabled(false);
        return;
      }

      const eventWithPermission = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<PermissionState>;
      };
      if (typeof eventWithPermission.requestPermission === "function") {
        const permission = await eventWithPermission.requestPermission();
        if (permission !== "granted") {
          setSensorEnabled(false);
          return;
        }
      }
      setSensorEnabled(true);
      setCameraError(null);
    } catch {
      setSensorEnabled(false);
    }
  }

  function handleSave() {
    if (!capturedFile) return;
    setCameraError(null);
    setProgress(1);

    startTransition(async () => {
      try {
        const url = await uploadToPropertyMedia(capturedFile, category, orgSlug, propertyId, setProgress);
        const payload: UploadedMediaPayload = {
          url,
          category,
          title: title.trim() || captureTitle,
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
      <DialogContent className="fixed inset-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 bg-black p-0 text-white shadow-2xl sm:relative sm:max-h-[92vh] sm:max-w-md sm:rounded-[2rem] sm:border-white/10">
        <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-black">
          {/* Yaw compass strip – shows current rotation vs target */}
          <div className="flex h-14 shrink-0 flex-col items-center justify-center gap-1 px-4">
            {mode === "guided360" && !capturedFile && (
              <>
                <div className="flex items-center gap-1">
                  {guidedYawSteps.map((step, i) => {
                    const isCurrentYaw = i === guidedYawIndex;
                    const isDoneYaw = i < guidedYawIndex;
                    return (
                      <div key={step} className={`flex flex-col items-center gap-0.5 w-10`}>
                        <div className={`text-[9px] font-bold tabular-nums ${
                          isCurrentYaw ? "text-white" : isDoneYaw ? "text-emerald-400" : "text-white/30"
                        }`}>{step}°</div>
                        <div className={`h-1.5 w-full rounded-full ${
                          isDoneYaw ? "bg-emerald-400" : isCurrentYaw ? "bg-white" : "bg-white/20"
                        }`} />
                        {/* pitch dots for this yaw position */}
                        <div className="flex gap-0.5 mt-0.5">
                          {guidedPitchSteps.map((_, pi) => {
                            const frameIdx = i * guidedPitchSteps.length + pi;
                            const done = frameIdx < guidedFrames.length;
                            const active = frameIdx === guidedFrames.length;
                            return (
                              <div key={pi} className={`h-1.5 w-1.5 rounded-full ${
                                done ? "bg-emerald-400" : active ? "bg-white animate-pulse" : "bg-white/20"
                              }`} />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
            {previewUrl ? (
              <img src={previewUrl} alt={title || "Captura de camara"} className="h-full w-full object-cover" />
            ) : cameraError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white/70">
                <VideoOff className="h-10 w-10 text-white/45" />
                <p className="text-sm">{cameraError}</p>
              </div>
            ) : (
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            )}

            {!previewUrl && !cameraError && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/28" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/28" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/28" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/28" />
              </div>
            )}

            {mode === "guided360" && !previewUrl && !cameraError && !sensorEnabled && !sensorBypassed && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center backdrop-blur-md">
                <div className="w-full max-w-[320px] space-y-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-300">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-brand-500/20 to-cyan-400/20 text-brand-400 border border-brand-500/20 shadow-inner">
                    <Compass className="h-7 w-7 animate-pulse text-cyan-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Giroscopio Requerido</h3>
                    <p className="text-[11px] leading-relaxed text-white/50">
                      Para guiarte paso a paso en la captura 360°, necesitamos activar el sensor de orientación de tu teléfono.
                    </p>
                  </div>
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={enableSensors}
                      className="w-full rounded-2xl bg-white py-3 text-xs font-bold text-black shadow-[0_12px_24px_rgba(255,255,255,0.15)] transition hover:bg-slate-100 active:scale-[0.97]"
                    >
                      Activar Sensores
                    </button>
                    <button
                      type="button"
                      onClick={() => setSensorBypassed(true)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-bold text-white transition hover:bg-white/[0.08] active:scale-[0.97]"
                    >
                      Omitir Guía (Captura Manual)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("photo");
                        setCategory("REAL");
                      }}
                      className="w-full rounded-2xl border border-transparent bg-transparent py-2 text-xs font-semibold text-white/40 transition hover:text-white/60 active:scale-[0.97]"
                    >
                      Usar Cámara Normal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === "guided360" && !previewUrl && !cameraError && (sensorEnabled || sensorBypassed) && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {/* Crosshair lines */}
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
                <div className="absolute inset-x-14 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-white/55" />
                <div className="absolute inset-y-16 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-white/45" />
                {/* Target reticle */}
                <div
                  className={`absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                    isAligned ? "border-emerald-300 bg-emerald-400/20" : "border-rose-300 bg-rose-500/20"
                  }`}
                  style={{ transform: `translate(calc(-50% + ${guideOffsetX}px), calc(-50% + ${guideOffsetY}px))` }}
                >
                  <span
                    className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      isAligned ? "bg-emerald-300" : "bg-rose-400"
                    }`}
                  />
                </div>

                {/* Vertical pitch level bar – right side */}
                <div className="absolute right-4 top-1/4 bottom-1/4 w-5 flex flex-col items-center">
                  <div className="flex-1 w-1 rounded-full bg-white/20 relative overflow-hidden">
                    {/* Bubble: centered = aligned. Moves along the bar with pitchDelta */}
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all duration-100 ${
                        isAligned ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" : "bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                      }`}
                      style={{ top: `calc(50% + ${Math.max(-40, Math.min(40, guidePitchDelta * 1.2))}% - 6px)` }}
                    />
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-white/50" />
                  </div>
                  <div className="text-[8px] font-bold text-white/40 mt-1 uppercase tracking-widest">NIV</div>
                </div>

                {/* Pitch target label – left side */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                  <span className="text-2xl">{guidedStep?.icon}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    isAligned ? "text-emerald-300" : "text-white/60"
                  }`}>{guidedStep?.label}</span>
                </div>

                {/* Instruction pill */}
                <div
                  className={`absolute bottom-10 left-1/2 max-w-[72%] -translate-x-1/2 rounded-full border px-5 py-2 text-center text-xs font-black uppercase tracking-wide ${
                    isAligned
                      ? "border-emerald-300/60 bg-emerald-500/20 text-emerald-100"
                      : "border-rose-300/60 bg-rose-500/20 text-rose-100"
                  }`}
                >
                  {autoCaptureCountdown !== null ? `📸 Capturando en ${autoCaptureCountdown}…` : primaryInstruction}
                </div>
              </div>
            )}


            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="shrink-0 bg-black px-6 pb-7 pt-5">

            {mode === "guided360" && !capturedFile && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-white/70 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">{guidedStep?.icon}</span>
                    <span>{guidedStep?.label ?? "Listo"}</span>
                    <span className="text-white/30">·</span>
                    <span>Dirección {guidedYawIndex + 1}/6 ({targetYaw}°)</span>
                  </span>
                  <span className={`tabular-nums ${
                    displayedGuidedCount === guidedFrameCount ? "text-emerald-400" : "text-white/70"
                  }`}>{displayedGuidedCount}/{guidedFrameCount}</span>
                </div>
                {/* 6×3 progress grid: columns=yaw directions, rows=floor/front/ceiling */}
                <div className="flex gap-1.5 justify-center">
                  {guidedYawSteps.map((yaw, yi) => (
                    <div key={yaw} className="flex flex-col gap-1 items-center">
                      {guidedPitchSteps.map((ps, pi) => {
                        const frameIdx = yi * guidedPitchSteps.length + pi;
                        const done = frameIdx < guidedFrames.length;
                        const active = frameIdx === guidedFrames.length;
                        return (
                          <div
                            key={pi}
                            title={`${yaw}° – ${ps.label}`}
                            className={`h-2 w-5 rounded-sm transition-all ${
                              done
                                ? "bg-emerald-400"
                                : active
                                ? "bg-white animate-pulse"
                                : "bg-white/15"
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {progress > 0 && (
              <div className="mb-5">
                <div className="mb-1 flex items-center justify-between text-xs text-white/70">
                  <span>Guardando</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-center">
              {capturedFile ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="grid h-24 w-24 place-items-center rounded-full border-[10px] border-white/35 bg-white text-black disabled:opacity-55"
                  aria-label="Guardar captura"
                >
                  {isSaving ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-10 w-10" />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!canCapture}
                  className="grid h-24 w-24 place-items-center rounded-full border-[10px] border-white/35 bg-white text-black disabled:opacity-55"
                  aria-label="Capturar"
                >
                  <Camera className="h-10 w-10" />
                </button>
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-6">
              {capturedFile && (
                <button type="button" onClick={handleRetake} disabled={isSaving} className="text-sm font-semibold text-white/80">
                  Repetir
                </button>
              )}
              <button type="button" onClick={() => handleClose(false)} disabled={isSaving} className="text-sm font-semibold text-white/80">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
