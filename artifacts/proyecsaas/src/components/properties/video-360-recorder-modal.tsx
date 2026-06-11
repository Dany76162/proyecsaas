"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, Camera, CheckCircle2, Loader2, RefreshCw, Video, VideoOff } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { upsertPropertyMediaAction } from "@/modules/properties/actions";
import {
  type MediaCategory,
  type UploadedMediaPayload,
  uploadToPropertyMedia,
} from "./media-upload-modal";

type Video360RecorderModalProps = {
  open: boolean;
  propertyId: string;
  orgSlug: string;
  onOpenChange: (open: boolean) => void;
  onCaptured?: (payload: UploadedMediaPayload) => void;
  onUsePhotoFlow?: () => void;
};

type ModalStep = "SELECT_AMBIENT" | "READY" | "RECORDING" | "PREVIEW" | "UPLOADING" | "PROCESSING" | "DONE" | "ERROR";

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

const MAX_DURATION_SECONDS = 60;
const MAX_VIDEO_SIZE = 180 * 1024 * 1024;
const PANORAMA_WIDTH = 4096;
const PANORAMA_HEIGHT = 1024;
const SAMPLE_COUNT = 12;
const SEEK_TIMEOUT_MS = 3000;
const MIN_DURATION_SECONDS = 2;

const mimeCandidates = [
  "video/mp4;codecs=h264",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function getSupportedVideoMimeType() {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") return "";
  return mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function getVideoExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("quicktime")) return "mov";
  return "webm";
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceWidth = source.videoWidth || 1280;
  const sourceHeight = source.videoHeight || 720;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;

  let drawWidth = sourceWidth;
  let drawHeight = sourceHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    drawWidth = sourceHeight * targetRatio;
    sourceX = (sourceWidth - drawWidth) / 2;
  } else {
    drawHeight = sourceWidth / targetRatio;
    sourceY = (sourceHeight - drawHeight) / 2;
  }

  context.drawImage(source, sourceX, sourceY, drawWidth, drawHeight, x, y, width, height);
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: "loadedmetadata" | "seeked",
  timeoutMs = SEEK_TIMEOUT_MS,
) {
  return new Promise<void>((resolve, reject) => {
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("No se pudo leer el video grabado."));
    };
    const onTimeout = () => {
      cleanup();
      reject(new Error("No se pudo leer un fotograma del video a tiempo. Volvé a grabar el giro."));
    };
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener("error", onError);
    };

    const timeoutId = window.setTimeout(onTimeout, timeoutMs);
    video.addEventListener(eventName, onEvent, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function seekVideoFrame(video: HTMLVideoElement, time: number) {
  const waitForSeek = waitForVideoEvent(video, "seeked");
  video.currentTime = time;
  return waitForSeek;
}

async function buildPanoramaFromVideo(file: File, propertyId: string): Promise<File> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await waitForVideoEvent(video, "loadedmetadata");
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("No se pudo calcular la duración del video.");
    }
    if (video.duration < MIN_DURATION_SECONDS) {
      throw new Error("El video es demasiado corto. Grabá un giro más lento de al menos 2 segundos.");
    }
    if (video.duration > MAX_DURATION_SECONDS + 1) {
      throw new Error(`El video supera el máximo de ${MAX_DURATION_SECONDS} segundos.`);
    }

    const canvas = document.createElement("canvas");
    canvas.width = PANORAMA_WIDTH;
    canvas.height = PANORAMA_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar el lienzo panorámico.");

    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const tileWidth = canvas.width / SAMPLE_COUNT;
    const safeDuration = Math.max(0.1, video.duration - 0.2);

    for (let index = 0; index < SAMPLE_COUNT; index++) {
      const time = Math.min(safeDuration, Math.max(0.05, (safeDuration * index) / SAMPLE_COUNT));
      await seekVideoFrame(video, time);
      drawCover(context, video, index * tileWidth, 0, tileWidth + 1, canvas.height);
    }

    return await new Promise<File>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("No se pudo generar la panorámica desde el video."));
            return;
          }
          resolve(
            new File([blob], `${propertyId}-giro-360-experimental.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            }),
          );
        },
        "image/jpeg",
        0.88,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function uploadTemporaryVideo(
  file: File,
  orgSlug: string,
  propertyId: string,
  roomName: string,
  onProgress: (pct: number) => void,
): Promise<{ jobId: string; url: string; size: number }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("orgSlug", orgSlug);
  formData.append("propertyId", propertyId);
  formData.append("roomName", roomName);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/property-tour-video/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data?.success && data?.url && data?.jobId) {
          resolve({ jobId: data.jobId, url: data.url, size: Number(data.size ?? file.size) });
          return;
        }
        reject(new Error(data?.error || `No se pudo subir el video temporal (${xhr.status}).`));
      } catch {
        reject(new Error(`No se pudo interpretar la respuesta de subida (${xhr.status}).`));
      }
    };

    xhr.onerror = () => reject(new Error("Error de red al subir el video temporal."));
    xhr.send(formData);
  });
}

export function Video360RecorderModal({
  open,
  propertyId,
  orgSlug,
  onOpenChange,
  onCaptured,
  onUsePhotoFlow,
}: Video360RecorderModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<ModalStep>("SELECT_AMBIENT");
  const [selectedAmbient, setSelectedAmbient] = useState("Living");
  const [customAmbient, setCustomAmbient] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [finalUploadProgress, setFinalUploadProgress] = useState(0);
  const [temporaryUploadInfo, setTemporaryUploadInfo] = useState<{ jobId: string; size: number } | null>(null);

  const supportedMimeType = useMemo(() => getSupportedVideoMimeType(), [open]);
  const roomName = selectedAmbient === "Otro" ? customAmbient.trim() || "Otro" : selectedAmbient;
  const canUseRecorder = typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && Boolean(supportedMimeType);

  const close = () => {
    onOpenChange(false);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  const clearTimers = () => {
    if (timerRef.current != null) window.clearInterval(timerRef.current);
    if (stopTimeoutRef.current != null) window.clearTimeout(stopTimeoutRef.current);
    timerRef.current = null;
    stopTimeoutRef.current = null;
  };

  const resetRecording = () => {
    clearTimers();
    recorderRef.current = null;
    chunksRef.current = [];
    setRecordedFile(null);
    setElapsedSeconds(0);
    setUploadProgress(0);
    setFinalUploadProgress(0);
    setTemporaryUploadInfo(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
  };

  useEffect(() => {
    if (!open) {
      resetRecording();
      stopCamera();
      return;
    }

    setStep("SELECT_AMBIENT");
    setSelectedAmbient("Living");
    setCustomAmbient("");
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || step !== "READY") return;
    let cancelled = false;

    async function startCamera() {
      try {
        setError(null);
        setCameraReady(false);

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador no permite abrir la cámara desde la web.");
        }

        if (!canUseRecorder) {
          throw new Error("Este navegador no permite grabar video desde la web. Podés usar el flujo actual de fotos o subir una imagen 360.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 24, max: 30 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch (cameraError) {
        setError(cameraError instanceof Error ? cameraError.message : "No se pudo abrir la cámara.");
        setStep("ERROR");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
    };
  }, [canUseRecorder, open, step]);

  useEffect(() => {
    if (!previewRef.current || !previewUrl) return;
    previewRef.current.src = previewUrl;
  }, [previewUrl]);

  const beginReady = () => {
    resetRecording();
    setStep("READY");
  };

  const stopRecording = () => {
    clearTimers();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const startRecording = () => {
    if (!streamRef.current || !cameraReady || !supportedMimeType) return;
    resetRecording();

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: supportedMimeType });
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        clearTimers();
        const type = supportedMimeType.split(";")[0] || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size <= 0) {
          setError("No se pudo generar el video grabado.");
          setStep("ERROR");
          stopCamera();
          return;
        }
        if (blob.size > MAX_VIDEO_SIZE) {
          setError(`El video supera el máximo de ${formatMegabytes(MAX_VIDEO_SIZE)}. Probá grabar otra vez más corto.`);
          setStep("ERROR");
          stopCamera();
          return;
        }

        const extension = getVideoExtension(type);
        const file = new File([blob], `${propertyId}-giro-360.${extension}`, {
          type,
          lastModified: Date.now(),
        });
        const nextPreviewUrl = URL.createObjectURL(file);
        setRecordedFile(file);
        setPreviewUrl(nextPreviewUrl);
        setStep("PREVIEW");
        stopCamera();
      };

      recorder.start(500);
      setElapsedSeconds(0);
      setStep("RECORDING");

      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.min(MAX_DURATION_SECONDS, Math.ceil((Date.now() - startedAt) / 1000)));
      }, 250);
      stopTimeoutRef.current = window.setTimeout(stopRecording, MAX_DURATION_SECONDS * 1000);
    } catch (recordingError) {
      setError(recordingError instanceof Error ? recordingError.message : "No se pudo iniciar la grabación.");
      setStep("ERROR");
    }
  };

  const processRecording = () => {
    if (!recordedFile) return;

    startTransition(async () => {
      try {
        setError(null);
        setUploadProgress(1);
        setStep("UPLOADING");

        const tempInfo = await uploadTemporaryVideo(recordedFile, orgSlug, propertyId, roomName, setUploadProgress);
        setTemporaryUploadInfo({ jobId: tempInfo.jobId, size: tempInfo.size });

        setStep("PROCESSING");
        const panoramaFile = await buildPanoramaFromVideo(recordedFile, propertyId);
        const url = await uploadToPropertyMedia(panoramaFile, "PANORAMA", orgSlug, propertyId, setFinalUploadProgress);

        const payload: UploadedMediaPayload = {
          url,
          category: "PANORAMA" satisfies MediaCategory,
          title: roomName,
          direction: "CENTER",
        };

        const result = await upsertPropertyMediaAction(orgSlug, propertyId, payload);
        if (!result?.success) {
          throw new Error(result?.message ?? "No se pudo guardar la panorámica generada.");
        }

        onCaptured?.(payload);
        setStep("DONE");
      } catch (processError) {
        setError(processError instanceof Error ? processError.message : "No se pudo procesar el giro 360.");
        setStep("ERROR");
      }
    });
  };

  const usePhotoFlow = () => {
    close();
    onUsePhotoFlow?.();
  };

  const renderFooterFallback = () => (
    <button
      type="button"
      onClick={usePhotoFlow}
      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white"
    >
      Usar captura por fotos
    </button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="p-0 sm:p-0"
      contentClassName="max-w-none w-screen h-[100dvh]"
    >
      <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden border-none bg-black p-0 text-white sm:h-[100dvh] sm:max-w-none sm:rounded-none">
        <div className="flex h-full flex-col bg-[#05070b]">
          {step === "SELECT_AMBIENT" && (
            <div className="flex h-full flex-col justify-between overflow-y-auto bg-gradient-to-br from-[#070816] via-[#0b1020] to-[#03040b] p-6 sm:p-8">
              <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-6">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
                    <Video className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Grabar giro 360 desde celular</h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Este modo crea una panorámica navegable con celular. No reemplaza una cámara 360 profesional.
                  </p>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3">
                  {ambientOptions.map((option) => {
                    const isSelected = selectedAmbient === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedAmbient(option)}
                        className={`rounded-xl border p-4 text-center text-sm font-semibold transition ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_18px_rgba(34,211,238,0.2)]"
                            : "border-white/15 bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {selectedAmbient === "Otro" && (
                  <div className="mb-6">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      Nombre del ambiente personalizado
                    </label>
                    <input
                      type="text"
                      value={customAmbient}
                      onChange={(event) => setCustomAmbient(event.target.value)}
                      placeholder="Ej: Terraza, oficina, quincho..."
                      maxLength={40}
                      className="w-full rounded-xl border border-white/20 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-cyan-400"
                    />
                  </div>
                )}

                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/72">
                  <p>Quedate quieto en un punto.</p>
                  <p>Sostené el celular firme.</p>
                  <p>Girás lentamente sobre tu propio eje.</p>
                  <p>No camines mientras grabás.</p>
                  <p>Intentá completar una vuelta en hasta 1 minuto.</p>
                </div>
              </div>

              <div className="mx-auto flex w-full max-w-md flex-col gap-3">
                <button
                  type="button"
                  onClick={beginReady}
                  disabled={selectedAmbient === "Otro" && !customAmbient.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-4 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400 disabled:bg-cyan-500/30 disabled:text-white/40"
                >
                  <Camera className="h-4 w-4" />
                  Preparar cámara
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm font-semibold text-white/80 transition hover:bg-white/[0.07]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {(step === "READY" || step === "RECORDING") && (
            <>
              <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
                <div className="pointer-events-none absolute inset-0 border-[5px] border-cyan-400/20" />
                <div className="pointer-events-none absolute inset-x-4 top-4 rounded-2xl border border-white/10 bg-black/65 p-4 backdrop-blur">
                  <p className="text-sm font-bold text-white">Ambiente: {roomName}</p>
                  <p className="mt-1 text-xs text-white/65">Girás lentamente sobre tu propio eje. No camines mientras grabás.</p>
                </div>
                {step === "RECORDING" && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="rounded-full bg-rose-600/90 px-6 py-3 text-sm font-extrabold uppercase tracking-widest text-white shadow-2xl animate-pulse">
                      Grabando {elapsedSeconds}/{MAX_DURATION_SECONDS}s
                    </div>
                  </div>
                )}
                {!cameraReady && (
                  <div className="absolute inset-0 grid place-items-center bg-black">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 bg-black px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
                <div className="flex items-center justify-between gap-3">
                  {renderFooterFallback()}
                  {step === "READY" ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={!cameraReady}
                      className="grid h-20 w-20 place-items-center rounded-full border-[8px] border-white/40 bg-white text-slate-950 shadow-2xl disabled:opacity-40"
                      title="Iniciar grabación"
                    >
                      <Video className="h-7 w-7" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="grid h-20 w-20 place-items-center rounded-full border-[8px] border-rose-300/60 bg-rose-600 text-white shadow-2xl"
                      title="Finalizar grabación"
                    >
                      <span className="h-5 w-5 rounded-sm bg-white" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08]"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </>
          )}

          {step === "PREVIEW" && (
            <div className="flex h-full flex-col bg-[#070816]">
              <div className="min-h-0 flex-1 p-4">
                <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <video ref={previewRef} className="h-full w-full object-contain" controls playsInline />
                </div>
              </div>
              <div className="border-t border-white/10 p-5">
                <div className="mx-auto max-w-xl space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Revisá el giro grabado</h3>
                    <p className="mt-1 text-sm leading-6 text-white/60">
                      Si el video se ve estable, lo subimos como fuente temporal y generamos una panorámica experimental.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={beginReady}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.08]"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Grabar de nuevo
                    </button>
                    <button
                      type="button"
                      onClick={processRecording}
                      disabled={isPending}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Procesar panorámica
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(step === "UPLOADING" || step === "PROCESSING") && (
            <div className="grid h-full place-items-center bg-gradient-to-br from-[#070816] via-[#0b1020] to-[#03040b] p-6 text-center">
              <div className="w-full max-w-sm">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-300" />
                <h3 className="mt-5 text-xl font-bold text-white">
                  {step === "UPLOADING" ? "Subiendo video temporal" : "Generando panorámica experimental"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  El video no se guarda como escena final. Solo usamos la imagen panorámica generada.
                </p>
                <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-white/60">
                      <span>Video temporal</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-cyan-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                  {step === "PROCESSING" && (
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-white/60">
                        <span>Panorámica final</span>
                        <span>{finalUploadProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${finalUploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                {temporaryUploadInfo && (
                  <p className="mt-3 text-xs text-white/40">
                    Job experimental: {temporaryUploadInfo.jobId}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "DONE" && (
            <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#07160f] via-[#06110d] to-[#030604] p-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-400" />
              <h2 className="mt-5 text-2xl font-extrabold text-white">Panorámica guardada</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/65">
                El giro 360 se procesó como panorámica navegable experimental y ya forma parte del tour de la propiedad.
              </p>
              <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("SELECT_AMBIENT");
                    resetRecording();
                  }}
                  className="w-full rounded-xl bg-emerald-500 px-6 py-4 text-sm font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Grabar otro ambiente
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-white/80 hover:bg-white/[0.08]"
                >
                  Finalizar y ver tour
                </button>
              </div>
            </div>
          )}

          {step === "ERROR" && (
            <div className="flex h-full flex-col items-center justify-center bg-[#070816] p-6 text-center">
              <div className="max-w-sm">
                <VideoOff className="mx-auto h-12 w-12 text-rose-300" />
                <h2 className="mt-5 text-xl font-bold text-white">No se pudo completar la grabación</h2>
                <p className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
                  {error ?? "Ocurrió un error inesperado."}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={beginReady}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Intentar de nuevo
                  </button>
                  {renderFooterFallback()}
                  <button
                    type="button"
                    onClick={close}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.08]"
                  >
                    Cerrar
                  </button>
                </div>
                <p className="mt-5 flex items-start gap-2 text-left text-xs leading-5 text-white/45">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Si tu navegador no soporta grabación web, usá la captura por fotos o subí una imagen panorámica 360.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
