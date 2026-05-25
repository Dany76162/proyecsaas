"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, Compass, Loader2, VideoOff, Plus } from "lucide-react";

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

type ModalStep = 'SELECT_AMBIENT' | 'CAPTURE' | 'SAVING' | 'ANOTHER_PROMPT';

const ambientOptions = [
  "Living",
  "Cocina",
  "Habitación principal",
  "Habitación 2",
  "Baño",
  "Garage",
  "Patio",
  "Otro",
];

const guidedYawSteps = [0, 60, 120, 180, 240, 300];
const guidedPitchSteps = [
  { label: "Piso", targetBeta: 35, short: "P" },
  { label: "Frente", targetBeta: 90, short: "F" },
  { label: "Techo", targetBeta: 145, short: "T" },
];
const guidedFrameCount = guidedYawSteps.length * guidedPitchSteps.length;
const yawTolerance = 10;
const pitchTolerance = 10;

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

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // quitar prefijo data:image/jpeg;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function stitchWithService(frames: GuidedFrame[], propertyId: string): Promise<File> {
  const STITCH_URL = process.env.NEXT_PUBLIC_STITCH_SERVICE_URL;

  if (!STITCH_URL) {
    // Fallback al stitching local (grilla simple) si no hay servicio configurado
    return buildGuidedPanoramaFile(frames, propertyId);
  }

  const yawSteps = [0, 60, 120, 180, 240, 300];
  const pitchSteps = [35, 90, 145];

  const framePayloads = await Promise.all(
    frames.map(async (frame, i) => {
      const yawIdx = Math.floor(i / 3);
      const pitchIdx = i % 3;
      return {
        image: await blobToBase64(frame.blob),
        yaw: yawSteps[yawIdx] ?? 0,
        pitch: pitchSteps[pitchIdx] ?? 90,
      };
    }),
  );

  const res = await fetch(`${STITCH_URL}/stitch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      frames: framePayloads,
      output_width: 4096,
      output_height: 2048,
      fov_h: 65,
      fov_v: 50,
    }),
  });

  if (!res.ok) {
    throw new Error(`Stitch service error ${res.status}: ${await res.text()}`);
  }

  const { image } = (await res.json()) as { image: string };
  const binary = atob(image);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "image/jpeg" });

  return new File([blob], `${propertyId}-360.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function buildGuidedPanoramaFile(frames: GuidedFrame[], propertyId: string) {
  const bitmaps = await Promise.all(frames.map((frame) => createImageBitmap(frame.blob)));
  const firstBitmap = bitmaps[0];

  if (!firstBitmap) {
    throw new Error("No hay imagenes para unir.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = 2560;
  canvas.height = 1280;
  const tileWidth = canvas.width / guidedYawSteps.length;
  const tileHeight = canvas.height / guidedPitchSteps.length;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar el lienzo 360.");
  }

  context.fillStyle = "#020617";
  context.fillRect(0, 0, canvas.width, canvas.height);

  bitmaps.forEach((bitmap, index) => {
    const yawIndex = Math.floor(index / guidedPitchSteps.length);
    const pitchIndex = index % guidedPitchSteps.length;
    const x = yawIndex * tileWidth;
    const y = (guidedPitchSteps.length - 1 - pitchIndex) * tileHeight;
    drawImageCover(context, bitmap, x, y, tileWidth, tileHeight);
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
  const [yawInverted, setYawInverted] = useState(true);
  const [modalStep, setModalStep] = useState<ModalStep>("SELECT_AMBIENT");
  const [selectedAmbient, setSelectedAmbient] = useState<string>("Living");
  const [customAmbient, setCustomAmbient] = useState<string>("");

  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }

  function playBeep(frequency: number, duration: number, volume = 0.3) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch { /* silencioso si no hay soporte */ }
  }

  const guidedIndex = Math.min(guidedFrames.length, guidedFrameCount - 1);
  const guidedYawIndex = Math.floor(guidedIndex / guidedPitchSteps.length);
  const guidedPitchIndex = guidedIndex % guidedPitchSteps.length;
  const currentPitch = guidedPitchSteps[guidedPitchIndex] ?? guidedPitchSteps[0];
  const relativeTargetYaw = guidedYawSteps[Math.min(guidedYawIndex, guidedYawSteps.length - 1)] ?? 0;
  const targetYaw = normalizeAngle((anchorYaw ?? orientation.alpha ?? 0) + relativeTargetYaw);
  const targetBeta = currentPitch?.targetBeta ?? 80;
  const hasSensorData = orientation.alpha !== null && orientation.beta !== null;
  const rawYawDelta = hasSensorData ? shortestAngleDistance(orientation.alpha ?? 0, targetYaw) : 0;
  const yawDelta = yawInverted ? -rawYawDelta : rawYawDelta;
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
    if (isAligned) playBeep(880, 0.15, 0.25);
  }, [isAligned]);

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
    if (open) {
      setModalStep("SELECT_AMBIENT");
      setSelectedAmbient("Living");
      setCustomAmbient("");
      setGuidedFrames([]);
      setCapturedPreview(null);
      setAutoCaptureCountdown(null);
      setOrientation({ alpha: null, beta: null });
      setAnchorYaw(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || modalStep !== "CAPTURE") return;

    let cancelled = false;

    async function startCamera() {
      try {
        setError(null);
        setCameraReady(false);

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
  }, [open, modalStep]);

  useEffect(() => {
    if (!open || modalStep !== "CAPTURE" || !sensorEnabled) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const alpha = normalizeAngle(event.alpha);
      const beta = typeof event.beta === "number" && !Number.isNaN(event.beta) ? event.beta : null;
      setAnchorYaw((current) => current ?? alpha);
      setOrientation({ alpha, beta });
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, [open, sensorEnabled, modalStep]);

  useEffect(() => {
    if (!open || modalStep !== "CAPTURE" || !isAligned || !cameraReady || guidedFrames.length >= guidedFrameCount || autoCaptureCountdown !== null) {
      return;
    }

    setAutoCaptureCountdown(2);
  }, [autoCaptureCountdown, cameraReady, guidedFrames.length, isAligned, open, modalStep]);

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
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    });
  };

  const savePanorama = async (frames: GuidedFrame[]) => {
    setModalStep("SAVING");
    try {
      const file = await stitchWithService(frames, propertyId);
      const url = await uploadToPropertyMedia(file, "PANORAMA", orgSlug, propertyId, () => {});

      const finalTitle = selectedAmbient === "Otro" ? (customAmbient.trim() || "Otro") : selectedAmbient;

      const payload: UploadedMediaPayload = {
        url,
        category: "PANORAMA" satisfies MediaCategory,
        title: finalTitle,
        direction: "CENTER",
      };

      const result = await upsertPropertyMediaAction(orgSlug, propertyId, payload);
      if (!result?.success) {
        throw new Error(result?.message ?? "No se pudo guardar la captura.");
      }

      setCapturedPreview(URL.createObjectURL(file));
      onCaptured?.(payload);
      setModalStep("ANOTHER_PROMPT");
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el panorama.");
      setModalStep("CAPTURE");
    }
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

        playBeep(1200, 0.08, 0.2);

        const nextFrames = [...guidedFrames, { blob, title: buildDefaultTitle(guidedFrames.length) }];
        setGuidedFrames(nextFrames);

        if (nextFrames.length >= guidedFrameCount) {
          playBeep(660, 0.4, 0.3);
          window.setTimeout(() => playBeep(880, 0.4, 0.3), 200);
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
          {modalStep === "SELECT_AMBIENT" && (
            <div className="flex h-full flex-col justify-between bg-gradient-to-br from-[#060814] via-[#0b0f19] to-[#03040b] p-6 sm:p-8 overflow-y-auto">
              <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center py-6">
                <div className="text-center mb-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                    <Compass className="h-7 w-7 animate-pulse" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Preparar Captura 360°</h2>
                  <p className="mt-2 text-sm text-white/60">Seleccioná el ambiente que vas a fotografiar en esta escena.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {ambientOptions.map((option) => {
                    const isSelected = selectedAmbient === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedAmbient(option)}
                        className={`p-4 rounded-xl border text-center transition font-semibold text-sm cursor-pointer ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-600/20 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                            : "border-white/15 bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {selectedAmbient === "Otro" && (
                  <div className="mb-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
                      Nombre del ambiente personalizado
                    </label>
                    <input
                      type="text"
                      value={customAmbient}
                      onChange={(e) => setCustomAmbient(e.target.value)}
                      placeholder="Ej: Terraza, Oficina, Cochera..."
                      maxLength={40}
                      className="w-full rounded-xl border border-white/20 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                )}
              </div>

              <div className="mx-auto w-full max-w-md flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setModalStep("CAPTURE")}
                  disabled={selectedAmbient === "Otro" && !customAmbient.trim()}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 disabled:text-white/40 px-6 py-4 text-center text-sm font-bold text-white shadow-lg transition duration-200 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Camera className="h-4 w-4" /> Iniciar Cámara
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] px-6 py-4 text-center text-sm font-semibold text-white/80 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {modalStep === "SAVING" && (
            <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#060814] via-[#0b0f19] to-[#03040b] p-6 text-center">
              <div className="relative mb-6">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 blur opacity-40 animate-pulse" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0b0f19] border border-white/10">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2 tracking-tight">Procesando Panorama 360°</h3>
              <p className="text-sm text-white/60 max-w-xs leading-relaxed">
                Uniendo las {guidedFrameCount} capturas de forma inmersiva y subiendo a la nube de manera segura...
              </p>
            </div>
          )}

          {modalStep === "ANOTHER_PROMPT" && (
            <div className="flex h-full flex-col justify-between bg-gradient-to-br from-[#060814] via-[#0b0f19] to-[#03040b] p-6 sm:p-8 overflow-y-auto">
              <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center py-6 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.2)] animate-bounce duration-1000">
                  <span className="text-5xl font-bold">✓</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  ¡{selectedAmbient === "Otro" ? (customAmbient.trim() || "Otro") : selectedAmbient} guardado!
                </h2>
                <p className="mt-3 text-sm text-white/60 leading-relaxed">
                  El panorama 360° se procesó con éxito y ya forma parte del tour inmersivo de la propiedad. ¿Qué te gustaría hacer ahora?
                </p>
              </div>

              <div className="mx-auto w-full max-w-md flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setGuidedFrames([]);
                    setCapturedPreview(null);
                    setAutoCaptureCountdown(null);
                    setOrientation({ alpha: null, beta: null });
                    setAnchorYaw(null);
                    setCustomAmbient("");
                    setModalStep("SELECT_AMBIENT");
                  }}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-4 text-center text-sm font-bold text-white shadow-lg transition duration-200 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Capturar otro ambiente
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] px-6 py-4 text-center text-sm font-semibold text-white/80 transition"
                >
                  Finalizar y ver tour
                </button>
              </div>
            </div>
          )}

          {modalStep === "CAPTURE" && (
            <>
              <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />

                <div className="pointer-events-none absolute inset-0">
                  <div className={`absolute inset-0 pointer-events-none border-[3px] transition-colors duration-300 ${isAligned ? 'border-emerald-300/90' : 'border-rose-400/70'}`} />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.24)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.24)_1px,transparent_1px)] bg-[size:33.333%_33.333%]" />
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 border-l border-dashed border-white/45" />
                  <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 border-t border-dashed border-white/45" />

                  <div
                    className={[
                      "absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full",
                      isAligned ? "border-[3px] border-emerald-300/90 bg-emerald-400/10" : "border-2 border-rose-400/75 bg-rose-500/5",
                    ].join(" ")}
                    style={{ transform: `translate(calc(-50% + ${guideOffsetX}px), calc(-50% + ${guideOffsetY}px))` }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isAligned ? (
                        <span className="text-4xl font-bold text-emerald-300">✓</span>
                      ) : (
                        <span className="text-4xl font-bold text-rose-400">✗</span>
                      )}
                    </div>
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
                    <div className="rounded-full bg-white px-5 py-2 text-base font-bold text-slate-950">
                      360° - {selectedAmbient === "Otro" ? (customAmbient.trim() || "Otro") : selectedAmbient}
                    </div>
                    <div className="px-3 text-base font-bold text-white/85">
                      {guidedFrames.length}/{guidedFrameCount}
                    </div>
                  </div>

                  <div
                    className={[
                      "absolute left-1/2 top-[58%] w-[min(74vw,340px)] -translate-x-1/2 rounded-full border px-6 py-4 text-center font-black uppercase leading-tight text-white backdrop-blur",
                      isAligned
                        ? "border-emerald-300/80 bg-emerald-500/30 shadow-[0_0_28px_rgba(16,185,129,.28)]"
                        : "border-rose-300/70 bg-rose-500/30 text-lg",
                    ].join(" ")}
                  >
                    {autoCaptureCountdown !== null ? (
                      <span className="text-5xl text-emerald-300">{autoCaptureCountdown}</span>
                    ) : primaryInstruction}
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

                  <div className="absolute bottom-4 right-4 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-white">
                    α: {Math.round(orientation.alpha ?? 0)}° β: {Math.round(orientation.beta ?? 0)}°
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetake}
                      disabled={guidedFrames.length === 0 || isPending}
                      className="h-14 w-14 rounded-full border border-white/20 bg-white/10 text-xs font-bold text-white/80 disabled:opacity-30"
                    >
                      Reset
                    </button>
                    {sensorEnabled && (
                      <button
                        type="button"
                        onClick={() => setYawInverted((v) => !v)}
                        title="Invertir rotación"
                        className="h-14 w-14 rounded-full border border-white/20 bg-white/10 text-xs font-bold text-white/80"
                      >
                        ⟳ Dir
                      </button>
                    )}
                  </div>

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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
