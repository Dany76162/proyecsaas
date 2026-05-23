"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, Compass, Loader2, VideoOff } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { upsertPropertyMediaAction } from "@/modules/properties/actions";

import {
  type MediaCategory,
  type UploadedMediaPayload,
  uploadToPropertyMedia,
} from "./media-upload-modal";

type CameraCaptureModalProps = {
  open: boolean;
  propertyId: string;
  orgSlug: string;
  onOpenChange: (open: boolean) => void;
  onCaptured?: (payload: UploadedMediaPayload) => void;
};

type OrientationState = {
  alpha: number | null;
  beta: number | null;
};

type GuidedFrame = {
  blob: Blob;
  title: string;
};

const guidedYawSteps = [0, 60, 120, 180, 240, 300];
const guidedPitchSteps = [
  { label: "Piso", targetBeta: 22, short: "P" },
  { label: "Frente", targetBeta: 80, short: "F" },
  { label: "Techo", targetBeta: 138, short: "T" },
];
const guidedFrameCount = guidedYawSteps.length * guidedPitchSteps.length;
const yawTolerance = 16;
const pitchTolerance = 20;

function normalizeAngle(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return ((value % 360) + 360) % 360;
}

function shortestAngleDistance(current: number, target: number) {
  return ((target - current + 540) % 360) - 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildDefaultTitle(index: number) {
  const yawIndex = Math.floor(index / guidedPitchSteps.length);
  const pitchIndex = index % guidedPitchSteps.length;
  return `360-${yawIndex + 1}-${guidedPitchSteps[pitchIndex]?.label ?? "Foto"}`;
}

async function buildGuidedPanoramaFile(frames: GuidedFrame[], propertyId: string) {
  const bitmaps = await Promise.all(frames.map((frame) => createImageBitmap(frame.blob)));
  const firstBitmap = bitmaps[0];

  if (!firstBitmap) {
    throw new Error("No hay imagenes para unir.");
  }

  const tileWidth = firstBitmap.width;
  const tileHeight = firstBitmap.height;
  const canvas = document.createElement("canvas");
  const columns = guidedYawSteps.length;
  const rows = guidedPitchSteps.length;
  canvas.width = tileWidth * columns;
  canvas.height = tileHeight * rows;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar el lienzo 360.");
  }

  bitmaps.forEach((bitmap, index) => {
    const yawIndex = Math.floor(index / guidedPitchSteps.length);
    const pitchIndex = index % guidedPitchSteps.length;
    const x = yawIndex * tileWidth;
    const y = (guidedPitchSteps.length - 1 - pitchIndex) * tileHeight;
    context.drawImage(bitmap, x, y, tileWidth, tileHeight);
  });

  bitmaps.forEach((bitmap) => bitmap.close());

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar la imagen 360."));
          return;
        }

        resolve(
          new File([blob], `${propertyId}-guided-360.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
        );
      },
      "image/jpeg",
      0.9,
    );
  });
}

async function requestOrientationAccess() {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
    return false;
  }

  const eventWithPermission = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<PermissionState>;
  };

  if (typeof eventWithPermission.requestPermission !== "function") {
    return true;
  }

  try {
    return (await eventWithPermission.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export function CameraCaptureModal({
  open,
  propertyId,
  orgSlug,
  onOpenChange,
  onCaptured,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shutterRef = useRef<HTMLButtonElement | null>(null);
  const [isPending, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [sensorEnabled, setSensorEnabled] = useState(false);
  const [orientation, setOrientation] = useState<OrientationState>({ alpha: null, beta: null });
  const [anchorYaw, setAnchorYaw] = useState<number | null>(null);
  const [guidedFrames, setGuidedFrames] = useState<GuidedFrame[]>([]);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  const guidedIndex = Math.min(guidedFrames.length, guidedFrameCount - 1);
  const guidedYawIndex = Math.floor(guidedIndex / guidedPitchSteps.length);
  const guidedPitchIndex = guidedIndex % guidedPitchSteps.length;
  const currentPitch = guidedPitchSteps[guidedPitchIndex] ?? guidedPitchSteps[0];
  const relativeTargetYaw = guidedYawSteps[Math.min(guidedYawIndex, guidedYawSteps.length - 1)] ?? 0;
  const targetYaw = normalizeAngle((anchorYaw ?? orientation.alpha ?? 0) + relativeTargetYaw);
  const targetBeta = currentPitch?.targetBeta ?? 80;
  const hasSensorData = orientation.alpha !== null && orientation.beta !== null;
  const yawDelta = hasSensorData ? shortestAngleDistance(orientation.alpha ?? 0, targetYaw) : 0;
  const pitchDelta = hasSensorData ? targetBeta - (orientation.beta ?? 0) : 0;
  const yawAligned = Math.abs(yawDelta) <= yawTolerance;
  const pitchAligned = Math.abs(pitchDelta) <= pitchTolerance;
  const isAligned = hasSensorData && yawAligned && pitchAligned;
  const progress = Math.round((guidedFrames.length / guidedFrameCount) * 100);
  const canCapture =
    cameraReady &&
    !isPending &&
    (autoCaptureCountdown === null || autoCaptureCountdown <= 0) &&
    guidedFrames.length < guidedFrameCount &&
    isAligned;

  const primaryInstruction = useMemo(() => {
    if (!hasSensorData) return "Manten el celular quieto";
    if (!pitchAligned) {
      if (pitchDelta > 0) return currentPitch?.label === "Techo" ? "Apunta hacia el techo" : "Subi la camara";
      return currentPitch?.label === "Piso" ? "Apunta hacia el piso" : "Baja la camara";
    }
    if (!yawAligned) {
      return yawDelta > 0 ? "Gira a la derecha" : "Gira a la izquierda";
    }
    return "Posicion correcta";
  }, [currentPitch?.label, hasSensorData, pitchAligned, pitchDelta, yawAligned, yawDelta]);

  const guideOffsetX = hasSensorData ? clamp(yawDelta * 4.2, -120, 120) : 0;
  const guideOffsetY = hasSensorData ? clamp(-pitchDelta * 3.5, -110, 110) : 0;
  const angleStatus = hasSensorData
    ? `yaw ${Math.round(Math.abs(yawDelta))}/${yawTolerance} - pitch ${Math.round(Math.abs(pitchDelta))}/${pitchTolerance}`
    : "esperando sensor";

  useEffect(() => {
    if (!open) return;

    const hiddenButtons: Array<{ element: HTMLElement; display: string }> = [];
    document.querySelectorAll<HTMLElement>(".floating-support-btn").forEach((element) => {
      hiddenButtons.push({ element, display: element.style.display });
      element.style.display = "none";
    });

    return () => {
      hiddenButtons.forEach(({ element, display }) => {
        element.style.display = display;
      });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function startCamera() {
      try {
        setError(null);
        setCameraReady(false);
        setCapturedPreview(null);
        setGuidedFrames([]);
        setAutoCaptureCountdown(null);
        setOrientation({ alpha: null, beta: null });
        setAnchorYaw(null);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const track = stream.getVideoTracks()[0];
        const capabilities =
          typeof track?.getCapabilities === "function"
            ? (track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min?: number } })
            : undefined;
        if (track && capabilities?.zoom?.min !== undefined) {
          await track.applyConstraints({
            advanced: [{ zoom: capabilities.zoom.min } as MediaTrackConstraintSet],
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraReady(true);
        requestOrientationAccess().then(setSensorEnabled);
      } catch (cameraError) {
        console.error(cameraError);
        setError("No se pudo abrir la camara del celular.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraReady(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !sensorEnabled) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const alpha = normalizeAngle(event.alpha);
      const beta = typeof event.beta === "number" && !Number.isNaN(event.beta) ? event.beta : null;
      setAnchorYaw((current) => current ?? alpha);
      setOrientation({ alpha, beta });
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, [open, sensorEnabled]);

  useEffect(() => {
    if (!open || !isAligned || !cameraReady || guidedFrames.length >= guidedFrameCount || autoCaptureCountdown !== null) {
      return;
    }

    setAutoCaptureCountdown(2);
  }, [autoCaptureCountdown, cameraReady, guidedFrames.length, isAligned, open]);

  useEffect(() => {
    if (autoCaptureCountdown === null || isAligned) return;
    setAutoCaptureCountdown(null);
  }, [autoCaptureCountdown, isAligned]);

  useEffect(() => {
    if (autoCaptureCountdown === null) return;

    if (autoCaptureCountdown <= 0) {
      setAutoCaptureCountdown(null);
      window.setTimeout(() => {
        shutterRef.current?.click();
      }, 0);
      return;
    }

    const timer = window.setTimeout(() => {
      setAutoCaptureCountdown((value) => (value === null ? null : value - 1));
    }, 650);

    return () => window.clearTimeout(timer);
  }, [autoCaptureCountdown]);

  const close = () => {
    onOpenChange(false);
  };

  const handleRetake = () => {
    setGuidedFrames([]);
    setCapturedPreview(null);
    setAutoCaptureCountdown(null);
    setAnchorYaw(orientation.alpha);
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  };

  const savePanorama = async (frames: GuidedFrame[]) => {
    const file = await buildGuidedPanoramaFile(frames, propertyId);
    const url = await uploadToPropertyMedia(file, "PANORAMA", orgSlug, propertyId, () => {});

    const payload: UploadedMediaPayload = {
      url,
      category: "PANORAMA" satisfies MediaCategory,
      title: "Tour 360 guiado",
      direction: "CENTER",
    };

    const result = await upsertPropertyMediaAction(orgSlug, propertyId, payload);
    if (!result?.success) {
      throw new Error(result?.message ?? "No se pudo guardar la captura.");
    }

    setCapturedPreview(URL.createObjectURL(file));
    onCaptured?.(payload);
  };

  const handleCapture = async () => {
    if (!canCapture) return;

    startTransition(async () => {
      try {
        setError(null);
        const blob = await captureFrame();
        if (!blob) {
          setError("No se pudo capturar la imagen.");
          return;
        }

        const nextFrames = [...guidedFrames, { blob, title: buildDefaultTitle(guidedFrames.length) }];
        setGuidedFrames(nextFrames);

        if (nextFrames.length >= guidedFrameCount) {
          await savePanorama(nextFrames);
        }
      } catch (captureError) {
        console.error(captureError);
        setError(captureError instanceof Error ? captureError.message : "No se pudo guardar la captura.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden border-none bg-black p-0 text-white sm:h-[100dvh] sm:max-w-none sm:rounded-none">
        <div className="relative flex h-full flex-col bg-black">
          <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.24)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.24)_1px,transparent_1px)] bg-[size:33.333%_33.333%]" />
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 border-l border-dashed border-white/45" />
              <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 border-t border-dashed border-white/45" />

              <div
                className={[
                  "absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
                  isAligned ? "border-emerald-300/90 bg-emerald-400/10" : "border-rose-400/75 bg-rose-500/5",
                ].join(" ")}
                style={{ transform: `translate(calc(-50% + ${guideOffsetX}px), calc(-50% + ${guideOffsetY}px))` }}
              >
                <span
                  className={[
                    "absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                    isAligned
                      ? "bg-emerald-300 shadow-[0_0_0_12px_rgba(52,211,153,.28),0_0_26px_rgba(52,211,153,.85)]"
                      : "bg-rose-400 shadow-[0_0_0_12px_rgba(251,113,133,.25)]",
                  ].join(" ")}
                />
              </div>

              <div
                className={[
                  "absolute left-0 top-1/2 h-px w-full -translate-y-1/2",
                  isAligned ? "bg-emerald-300/90" : "bg-rose-400/80",
                ].join(" ")}
              />
              <div
                className={[
                  "absolute left-1/2 top-0 h-full w-px -translate-x-1/2",
                  isAligned ? "bg-emerald-300/90" : "bg-rose-400/80",
                ].join(" ")}
              />

              <div className="absolute left-6 right-6 top-6 flex items-center justify-between rounded-full bg-black/70 p-2 backdrop-blur">
                <div className="rounded-full bg-white px-5 py-2 text-base font-bold text-slate-950">360 guiado</div>
                <div className="px-3 text-base font-bold text-white/85">
                  {guidedFrames.length}/{guidedFrameCount}
                </div>
              </div>

              <div
                className={[
                  "absolute left-1/2 top-[58%] w-[min(74vw,340px)] -translate-x-1/2 rounded-full border px-6 py-4 text-center text-lg font-black uppercase leading-tight text-white backdrop-blur",
                  isAligned
                    ? "border-emerald-300/80 bg-emerald-500/30 shadow-[0_0_28px_rgba(16,185,129,.28)]"
                    : "border-rose-300/70 bg-rose-500/30",
                ].join(" ")}
              >
                {autoCaptureCountdown !== null ? autoCaptureCountdown : primaryInstruction}
              </div>

              <div
                className={[
                  "absolute left-5 top-1/2 -translate-y-1/2 rounded-full px-3 py-2 text-sm font-bold uppercase",
                  isAligned ? "bg-emerald-400 text-slate-950" : "bg-black/65 text-white/80",
                ].join(" ")}
              >
                {currentPitch?.label}
              </div>

              <div className="absolute right-5 top-1/2 h-40 w-2 -translate-y-1/2 rounded-full bg-white/20">
                <span
                  className={[
                    "absolute left-1/2 h-5 w-5 -translate-x-1/2 rounded-full",
                    isAligned ? "bg-emerald-300" : "bg-rose-400",
                  ].join(" ")}
                  style={{ top: `${clamp(((orientation.beta ?? targetBeta) / 160) * 100, 0, 100)}%` }}
                />
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                {angleStatus}
              </div>
            </div>

            {!cameraReady && !error ? (
              <div className="absolute inset-0 grid place-items-center bg-black text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : null}

            {error ? (
              <div className="absolute inset-0 grid place-items-center bg-black px-8 text-center">
                <div className="max-w-sm">
                  <VideoOff className="mx-auto mb-4 h-10 w-10 text-white/70" />
                  <p className="text-lg font-semibold">{error}</p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-6 rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative z-10 border-t border-white/10 bg-black px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
            <div className="mb-4 flex items-center gap-1">
              {Array.from({ length: guidedFrameCount }).map((_, index) => {
                const current = index === guidedFrames.length;
                const done = index < guidedFrames.length;
                return (
                  <span
                    key={index}
                    className={[
                      "h-1.5 flex-1 rounded-full",
                      done ? "bg-emerald-400" : current ? (isAligned ? "bg-emerald-300" : "bg-white") : "bg-white/20",
                    ].join(" ")}
                  />
                );
              })}
            </div>

            <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-[0.24em] text-white/55">
              <span>
                {currentPitch?.label} - Pos {guidedYawIndex + 1}/{guidedYawSteps.length}
              </span>
              <span>{progress}%</span>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleRetake}
                disabled={guidedFrames.length === 0 || isPending}
                className="h-14 w-14 rounded-full border border-white/20 bg-white/10 text-xs font-bold text-white/80 disabled:opacity-30"
              >
                Reset
              </button>

              <button
                ref={shutterRef}
                type="button"
                onClick={handleCapture}
                disabled={!canCapture}
                className="grid h-24 w-24 place-items-center rounded-full border-[10px] border-white/45 bg-white text-slate-950 shadow-2xl disabled:opacity-45"
              >
                {isPending ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-9 w-9" />}
              </button>

              <button
                type="button"
                onClick={close}
                className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/10 text-white/80"
              >
                <Compass className="h-6 w-6" />
              </button>
            </div>

            {capturedPreview ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center text-sm font-bold text-emerald-100">
                Tour 360 guardado
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
