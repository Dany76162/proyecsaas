"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Compass, Loader2, VideoOff, RefreshCw, Camera } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { upsertPropertyMediaAction } from "@/modules/properties/actions";
import {
  type MediaCategory,
  type UploadedMediaPayload,
  uploadToPropertyMedia,
} from "./media-upload-modal";

type ContinuousScannerModalProps = {
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

type ScannedFrame = {
  blob: Blob;
  yaw: number;
  pitch: number;
};

type ModalStep = "SELECT_AMBIENT" | "SCANNING" | "PROCESSING" | "ANOTHER_PROMPT";

type Zone = "ceiling" | "front" | "floor";

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

const YAW_THRESHOLD = 15;     // capturar cada 15° de rotación horizontal
const PITCH_THRESHOLD = 20;   // capturar cada 20° de inclinación vertical
const MAX_SPEED = 45;         // grados/segundo máximo antes de advertir
const MIN_REQUIRED_FRAMES = 24;
const MAX_ALLOWED_FRAMES = 120; // Aceptamos hasta 120 frames ahora

function normalizeAngle(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return ((value % 360) + 360) % 360;
}

function angleDiff(a: number, b: number): number {
  let diff = ((a - b) + 360) % 360;
  if (diff > 180) diff -= 360;
  return diff;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getZone(pitch: number): Zone {
  // beta < 45° -> ceiling (mirando arriba)
  // beta > 135° -> floor (mirando abajo)
  // 45-135° -> front (frente)
  if (pitch < 45) return "ceiling";
  if (pitch > 135) return "floor";
  return "front";
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-AR";
  utterance.rate = 0.95;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function subsampleFrames(frames: ScannedFrame[], maxFrames = 30): ScannedFrame[] {
  if (frames.length <= maxFrames) return frames;
  const step = (frames.length - 1) / (maxFrames - 1);
  const result: ScannedFrame[] = [];
  for (let i = 0; i < maxFrames; i++) {
    const index = Math.round(i * step);
    const frame = frames[index];
    if (frame) {
      result.push(frame);
    }
  }
  return result;
}

async function buildLocalPanoramaFile(frames: ScannedFrame[], propertyId: string): Promise<File> {
  const sorted = [...frames].sort((a, b) => a.yaw - b.yaw);
  const bitmaps = await Promise.all(sorted.map((f) => createImageBitmap(f.blob)));
  const first = bitmaps[0];
  if (!first) throw new Error("No hay imágenes para unir.");

  const canvas = document.createElement("canvas");
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el lienzo 360.");

  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ~683px por sector de 60° horizontal, ~682px por zona de pitch
  const patchW = Math.ceil(canvas.width / 6);
  const patchH = Math.ceil(canvas.height / 3);

  bitmaps.forEach((bitmap, i) => {
    const frame = sorted[i];
    if (!frame) return;
    const x = Math.round((frame.yaw / 360) * canvas.width) - patchW / 2;
    const y = Math.round((frame.pitch / 180) * canvas.height) - patchH / 2;
    ctx.drawImage(bitmap, x, y, patchW, patchH);
    bitmap.close();
  });

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("No se pudo generar la imagen 360."));
        resolve(
          new File([blob], `${propertyId}-360-scan.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
        );
      },
      "image/jpeg",
      0.88,
    );
  });
}

async function stitchWithService(frames: ScannedFrame[], propertyId: string): Promise<File> {
  const STITCH_URL = process.env.NEXT_PUBLIC_STITCH_SERVICE_URL;

  if (!STITCH_URL) {
    return buildLocalPanoramaFile(frames, propertyId);
  }

  const framePayloads = await Promise.all(
    frames.map(async (frame) => {
      return {
        image: await blobToBase64(frame.blob),
        yaw: frame.yaw,
        pitch: frame.pitch,
      };
    }),
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout

  let res: Response;
  try {
    res = await fetch(`${STITCH_URL}/stitch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frames: framePayloads,
        output_width: 4096,
        output_height: 2048,
        fov_h: 65,
        fov_v: 50,
      }),
      signal: controller.signal,
    });
  } catch (fetchErr: any) {
    if (fetchErr.name === "AbortError") {
      // Timeout del servicio: usar fallback local
      console.warn("[scanner] Stitch service timeout, using local canvas fallback.");
      return buildLocalPanoramaFile(frames, propertyId);
    }
    // Error de red (Failed to fetch, servicio caído, etc.): usar fallback local
    console.warn("[scanner] Stitch service unreachable, using local canvas fallback:", fetchErr.message);
    return buildLocalPanoramaFile(frames, propertyId);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Stitch error details: ${errorText}`);
    throw new Error(`Error del servicio de costura ${res.status}: ${errorText}`);
  }

  const { image } = (await res.json()) as { image: string };
  const binary = atob(image);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "image/jpeg" });

  return new File([blob], `${propertyId}-360.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function ContinuousScannerModal({
  open,
  propertyId,
  orgSlug,
  onOpenChange,
  onCaptured,
}: ContinuousScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isPending, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [sensorEnabled, setSensorEnabled] = useState(false);
  const [orientation, setOrientation] = useState<OrientationState>({ alpha: null, beta: null });
  const [scannedFrames, setScannedFrames] = useState<ScannedFrame[]>([]);
  const [isTooFast, setIsTooFast] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("SELECT_AMBIENT");
  const [selectedAmbient, setSelectedAmbient] = useState<string>("Living");
  const [customAmbient, setCustomAmbient] = useState<string>("");
  const [showGuide, setShowGuide] = useState(true);

  // Cobertura por zona esférica inteligente
  const [zoneCoverage, setZoneCoverage] = useState({
    ceiling: new Set<number>(),
    front: new Set<number>(),
    floor: new Set<number>(),
  });

  // Estados del HUD Premium animado
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [lastCoveredSector, setLastCoveredSector] = useState<string | null>(null);

  // Detección de círculo horizontal completo
  const [fullCircleDetected, setFullCircleDetected] = useState(false);
  const fullCircleDetectedRef = useRef(false); // ref para evitar stale closure en el event handler
  const startFrontYawRef = useRef<number | null>(null);  // yaw de la primera captura frontal
  const maxFrontDeviationRef = useRef(0);                // máxima desviación desde el inicio

  // Referencias para la lógica de captura
  const scannedFramesRef = useRef<ScannedFrame[]>([]);
  const lastCaptureYawRef = useRef<number | null>(null);
  const lastCapturePitchRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(Date.now());
  const prevAlphaRef = useRef<number>(0);
  const speakTimeoutRef = useRef<number | null>(null);
  const hasAttemptedFinishRef = useRef(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }

  function playBeep(frequency: number, durationMs: number, volume = 0.2) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch { /* ignorado si no hay soporte */ }
  }

  const lastSpokenRef = useRef<Record<string, number>>({});
  const speakThrottled = (text: string, throttleMs = 2500) => {
    const now = Date.now();
    const lastSpoken = lastSpokenRef.current[text] || 0;
    if (now - lastSpoken > throttleMs) {
      lastSpokenRef.current[text] = now;
      speak(text);
    }
  };

  // Ocultar botones de soporte de fondo
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

  // Resetear estados al abrir
  useEffect(() => {
    if (open) {
      setModalStep("SELECT_AMBIENT");
      setSelectedAmbient("Living");
      setCustomAmbient("");
      setScannedFrames([]);
      scannedFramesRef.current = [];
      lastCaptureYawRef.current = null;
      lastCapturePitchRef.current = null;
      setOrientation({ alpha: null, beta: null });
      setError(null);
      setShowGuide(true);
      setFlashOpacity(0);
      setLastCoveredSector(null);
      setZoneCoverage({
        ceiling: new Set(),
        front: new Set(),
        floor: new Set(),
      });
      hasAttemptedFinishRef.current = false;
      setFullCircleDetected(false);
      fullCircleDetectedRef.current = false;
      startFrontYawRef.current = null;
      maxFrontDeviationRef.current = 0;
    }
  }, [open]);

  // Ocultar guía automáticamente después de 4 segundos
  useEffect(() => {
    if (modalStep === "SCANNING") {
      setShowGuide(true);
      speak("Girá lentamente para escanear el ambiente");
      const timer = setTimeout(() => setShowGuide(false), 4500);
      return () => clearTimeout(timer);
    }
  }, [modalStep]);

  // Desaparecer alerta de sector cubierto después de 1 segundo
  useEffect(() => {
    if (lastCoveredSector) {
      const timer = setTimeout(() => setLastCoveredSector(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastCoveredSector]);

  // Inicializar Cámara
  useEffect(() => {
    if (!open || modalStep !== "SCANNING") return;
    let cancelled = false;

    async function startCamera() {
      try {
        setError(null);
        setCameraReady(false);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
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
        requestOrientationAccess().then(setSensorEnabled);
      } catch (cameraError) {
        console.error(cameraError);
        setError("No se pudo iniciar la cámara trasera.");
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

  // Capturar frame desde el elemento de video
  const captureFrame = async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !cameraReady) return null;

    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;
    let targetWidth = videoWidth;
    let targetHeight = videoHeight;
    const maxDimension = 960; // resolución optimizada para rendimiento y memoria

    if (videoWidth > videoHeight) {
      if (videoWidth > maxDimension) {
        targetWidth = maxDimension;
        targetHeight = Math.round((videoHeight * maxDimension) / videoWidth);
      }
    } else {
      if (videoHeight > maxDimension) {
        targetHeight = maxDimension;
        targetWidth = Math.round((videoWidth * maxDimension) / videoHeight);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, targetWidth, targetHeight);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.75);
    });
  };

  // Escuchar Giroscopio y Extraer Frames Continuamente
  useEffect(() => {
    if (!open || modalStep !== "SCANNING" || !sensorEnabled || !cameraReady) return;

    const handleOrientation = async (event: DeviceOrientationEvent) => {
      const alpha = normalizeAngle(event.alpha); // yaw (0-360°)
      const beta = typeof event.beta === "number" && !Number.isNaN(event.beta) ? event.beta : 90; // pitch

      setOrientation({ alpha, beta });

      // Calcular velocidad de giro para advertir al usuario
      const now = Date.now();
      const dt = (now - lastTimestampRef.current) / 1000;
      if (dt > 0.05) {
        const speed = Math.abs(angleDiff(alpha, prevAlphaRef.current)) / dt;
        const tooFastState = speed > MAX_SPEED;
        setIsTooFast(tooFastState);
        lastTimestampRef.current = now;
        prevAlphaRef.current = alpha;

        if (tooFastState) {
          speakThrottled("Girá más despacio", 3000);
        }

        // Registrar frame y calcular zona
        const registerFrameAndZone = (_blob: Blob) => {
          const sector = Math.floor(((alpha + 360) % 360) / 30); // 0-11
          const zone = getZone(beta);

          // ── Detección de círculo horizontal completo ──────────────────────
          if (zone === "front") {
            if (startFrontYawRef.current === null) {
              startFrontYawRef.current = alpha;
            } else {
              const deviation = Math.abs(angleDiff(alpha, startFrontYawRef.current));
              if (deviation > maxFrontDeviationRef.current) {
                maxFrontDeviationRef.current = deviation;
              }
              // Círculo completo: se alejó >160° Y volvió a ≤25° del inicio
              if (
                maxFrontDeviationRef.current > 160 &&
                deviation <= 25 &&
                !fullCircleDetectedRef.current
              ) {
                fullCircleDetectedRef.current = true;
                setFullCircleDetected(true);
                speak("Círculo completo. Ahora apuntá hacia el techo");
              }
            }
          }

          setZoneCoverage((prev) => {
            const nextSet = new Set(prev[zone]);
            const prevSize = nextSet.size;
            nextSet.add(sector);

            // Si el sector es nuevo, avisar con voz
            if (nextSet.size > prevSize) {
              speakThrottled("Área escaneada", 1500);
            }

            // Avisos de transiciones por cobertura de sectores
            const frontSize = zone === "front" ? nextSet.size : prev.front.size;
            const ceilingSize = zone === "ceiling" ? nextSet.size : prev.ceiling.size;
            const prevCeilingSize = prev.ceiling.size;

            if (zone === "ceiling" && (frontSize >= 10 || fullCircleDetectedRef.current) && ceilingSize === 4 && prevCeilingSize === 3) {
              speak("Bien. Ahora apuntá hacia el piso");
            }

            return {
              ...prev,
              [zone]: nextSet,
            };
          });
        };

        // Comprobar si hay suficiente diferencia de rotación para extraer frame
        if (lastCaptureYawRef.current === null || lastCapturePitchRef.current === null) {
          // Primera captura
          lastCaptureYawRef.current = alpha;
          lastCapturePitchRef.current = beta;
          const blob = await captureFrame();
          if (blob) {
            const next = [{ blob, yaw: alpha, pitch: beta }];
            scannedFramesRef.current = next;
            setScannedFrames(next);
            playBeep(880, 50, 0.15);
            setFlashOpacity(0.35);
            setTimeout(() => setFlashOpacity(0), 150);
            setLastCoveredSector("Sector Inicial");
            registerFrameAndZone(blob);
          }
        } else {
          const yawDiff = Math.abs(angleDiff(alpha, lastCaptureYawRef.current));
          const pitchDiff = Math.abs(beta - lastCapturePitchRef.current);

          if ((yawDiff >= YAW_THRESHOLD || pitchDiff >= PITCH_THRESHOLD) && !tooFastState) {
            if (scannedFramesRef.current.length >= MAX_ALLOWED_FRAMES) {
              return;
            }

            lastCaptureYawRef.current = alpha;
            lastCapturePitchRef.current = beta;
            const blob = await captureFrame();
            if (blob) {
              const next = [...scannedFramesRef.current, { blob, yaw: alpha, pitch: beta }];
              scannedFramesRef.current = next;
              setScannedFrames(next);
              playBeep(880, 50, 0.15);
              setFlashOpacity(0.35);
              setTimeout(() => setFlashOpacity(0), 150);
              
              const currentSector = Math.floor(alpha / 30) + 1;
              setLastCoveredSector(`Sector ${currentSector}`);
              registerFrameAndZone(blob);
            }
          }
        }
      }
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, [open, sensorEnabled, cameraReady, modalStep]);

  // Dibujar el overlay canvas interactivo con los elementos premium
  useEffect(() => {
    if (modalStep !== "SCANNING" || !cameraReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // 1. SECTORES CUBIERTOS
      const sectorsCount = 12;
      const sectorWidth = w / sectorsCount;

      const coveredSectors = new Array(sectorsCount).fill(false);
      scannedFramesRef.current.forEach((frame) => {
        const sectorIdx = Math.floor(((frame.yaw + 360) % 360) / (360 / sectorsCount));
        coveredSectors[sectorIdx] = true;
      });

      for (let i = 0; i < sectorsCount; i++) {
        const xStart = i * sectorWidth;
        if (coveredSectors[i]) {
          ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
        } else {
          ctx.fillStyle = "rgba(6, 182, 212, 0.04)";
        }
        ctx.fillRect(xStart, 0, sectorWidth, h);
      }

      // 2. GRILLA DE PUNTOS FACE-ID PREMIUM
      const cols = 12;
      const rows = 8;
      const colStep = w / (cols + 1);
      const rowStep = h / (rows + 1);

      for (let c = 1; c <= cols; c++) {
        const x = c * colStep;
        const colAngle = (c / cols) * 360;
        const colSectorIdx = Math.floor(colAngle / (360 / sectorsCount));
        const isCovered = coveredSectors[colSectorIdx];

        for (let r = 1; r <= rows; r++) {
          const y = r * rowStep;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          
          if (isCovered) {
            ctx.fillStyle = "rgba(34, 197, 94, 0.85)";
            ctx.shadowColor = "rgba(34, 197, 94, 0.7)";
            ctx.shadowBlur = 8;
          } else {
            ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
            ctx.shadowBlur = 0;
          }
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;

      // 3. LÍNEA DE BARRIDO CONTINUO (Sube y baja verticalmente)
      const elapsed = Date.now() / 1000;
      const sweepPeriod = 2;
      const cycle = (elapsed % sweepPeriod) / sweepPeriod;
      const sweepY = cycle < 0.5 
        ? h * (cycle * 2) 
        : h * (1 - (cycle - 0.5) * 2);

      const sweepGradient = ctx.createLinearGradient(0, sweepY - 15, 0, sweepY + 15);
      sweepGradient.addColorStop(0, "rgba(6, 182, 212, 0)");
      sweepGradient.addColorStop(0.5, "rgba(6, 182, 212, 0.75)");
      sweepGradient.addColorStop(1, "rgba(6, 182, 212, 0)");

      ctx.fillStyle = sweepGradient;
      ctx.fillRect(0, sweepY - 15, w, 30);

      animFrameId = requestAnimationFrame(draw);
    };

    animFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animFrameId);
    };
  }, [modalStep, cameraReady, orientation.alpha]);

  // Auto-finalización inteligente
  // Frente completo: círculo detectado O ≥10 sectores cubiertos (cualquiera primero)
  const frontComplete = fullCircleDetected || zoneCoverage.front.size >= 10;
  const isComplete =
    frontComplete &&
    zoneCoverage.ceiling.size >= 4 &&
    zoneCoverage.floor.size >= 4;

  useEffect(() => {
    if (isComplete && modalStep === "SCANNING" && !hasAttemptedFinishRef.current) {
      hasAttemptedFinishRef.current = true;
      speak("Escaneo completo. Finalizando.");
      const timer = setTimeout(() => {
        handleFinish();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, modalStep]);

  // Guía progresiva
  const guidance = !frontComplete
    ? "Girá lentamente — volvé al punto de inicio para completar el círculo"
    : zoneCoverage.ceiling.size < 4
      ? "✓ Círculo completo — Apuntá hacia el techo"
      : zoneCoverage.floor.size < 4
        ? "✓ Techo completo — Apuntá hacia el piso"
        : "✓ Escaneo completo — Finalizando...";

  const canFinish = scannedFrames.length >= MIN_REQUIRED_FRAMES;

  // Porcentajes de cobertura por zonas
  // Frente: si el círculo fue detectado ya mostramos 100%, sino el progreso de sectores
  const frontPct = frontComplete ? 100 : Math.round((zoneCoverage.front.size / 12) * 100);
  const ceilingPct = Math.round((Math.min(zoneCoverage.ceiling.size, 6) / 6) * 100);
  const floorPct = Math.round((Math.min(zoneCoverage.floor.size, 6) / 6) * 100);

  const close = () => {
    onOpenChange(false);
  };

  const handleFinish = async () => {
    let frames = scannedFramesRef.current;

    // Subsamplear frames si excedemos el límite óptimo para procesamiento del backend
    frames = subsampleFrames(frames, 30);

    if (frames.length === 0) return;

    setModalStep("PROCESSING");
    setError(null);
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
        throw new Error(result?.message ?? "Error al guardar los metadatos del tour virtual en la base de datos.");
      }

      onCaptured?.(payload);
      setModalStep("ANOTHER_PROMPT");
    } catch (saveError: any) {
      console.error("handleFinish ERROR:", saveError);
      setError(String(saveError.message ?? saveError));
      // Quedarse en PROCESSING para mostrar el error — no volver a SCANNING
      // (volver reiniciaría la cámara y llamaría setError(null), borrando el mensaje)
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="p-0 sm:p-0"
      contentClassName="max-w-none w-screen h-[100dvh]"
    >
      <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden border-none bg-black p-0 text-white sm:h-[100dvh] sm:max-w-none sm:rounded-none">
        <div className="relative flex h-full flex-col bg-black">
          
          {/* STEP 1: SELECT AMBIENT */}
          {modalStep === "SELECT_AMBIENT" && (
            <div className="flex h-full flex-col justify-between bg-gradient-to-br from-[#060814] via-[#0b0f19] to-[#03040b] p-6 sm:p-8 overflow-y-auto">
              <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center py-6">
                <div className="text-center mb-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                    <Compass className="h-7 w-7 animate-pulse" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Escáner Continuo 360°</h2>
                  <p className="mt-2 text-sm text-white/60">Seleccioná el ambiente que vas a escanear en esta escena.</p>
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
                  onClick={() => setModalStep("SCANNING")}
                  disabled={selectedAmbient === "Otro" && !customAmbient.trim()}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 disabled:text-white/40 px-6 py-4 text-center text-sm font-bold text-white shadow-lg transition duration-200 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Camera className="h-4 w-4" /> Iniciar Escaneo
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

          {/* STEP 2: PROCESSING / STITCHING */}
          {modalStep === "PROCESSING" && (
            <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#060814] via-[#0b0f19] to-[#03040b] p-6 text-center">
              {error ? (
                <>
                  <VideoOff className="mx-auto mb-4 h-12 w-12 text-rose-400" />
                  <h3 className="text-xl font-bold mb-2 tracking-tight text-white">Error al procesar</h3>
                  <p className="text-sm text-rose-300 max-w-xs leading-relaxed mx-auto">{error}</p>
                  <div className="mt-8 flex flex-col gap-3 w-full max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => { setError(null); setModalStep("SCANNING"); }}
                      className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-bold text-white transition"
                    >
                      Volver al escaneo
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] px-6 py-3 text-sm font-semibold text-white/80 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative mb-6">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 blur opacity-40 animate-pulse" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0b0f19] border border-white/10">
                      <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 tracking-tight text-white">Procesando Escaneo 360°</h3>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm font-semibold text-emerald-400">
                      Procesando y uniendo {scannedFrames.length} fotos...
                    </p>
                    <p className="text-xs text-white/55 max-w-xs leading-relaxed mx-auto">
                      Esto puede tardar entre 15 y 30 segundos debido al procesamiento matemático de las costuras en el servidor.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: ANOTHER PROMPT */}
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
                  El escaneo 360° se procesó con éxito utilizando {scannedFrames.length} capturas continuas. ¿Qué te gustaría hacer ahora?
                </p>
              </div>

              <div className="mx-auto w-full max-w-md flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setScannedFrames([]);
                    scannedFramesRef.current = [];
                    lastCaptureYawRef.current = null;
                    lastCapturePitchRef.current = null;
                    setOrientation({ alpha: null, beta: null });
                    setCustomAmbient("");
                    setModalStep("SELECT_AMBIENT");
                  }}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-4 text-center text-sm font-bold text-white shadow-lg transition duration-200 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" /> Escanear otro ambiente
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

          {/* STEP 4: ACTIVE SCANNING */}
          {modalStep === "SCANNING" && (
            <>
              <div className="relative min-h-0 flex-1 overflow-hidden">
                
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />

                {/* OVERLAY INTERACTIVO CANVAS (EFECTO PREMIUM FACE-ID) */}
                <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />

                {/* FLASH DE CAPTURA RÁPIDO */}
                <div
                  className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-75"
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.4)",
                    opacity: flashOpacity,
                  }}
                />

                {/* BORDERS DE VELOCIDAD DINÁMICOS */}
                <div className={`absolute inset-0 pointer-events-none z-15 border-[6px] transition-colors duration-300 ${isTooFast ? "border-rose-600/80" : "border-emerald-500/20"}`} />

                {/* OVERLAY GUIADO DE TEXTO Y HUD */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 z-25">
                  
                  {/* Fila Superior: Info y Cobertura */}
                  <div className="flex items-center justify-between rounded-full bg-black/60 px-4 py-2 backdrop-blur">
                    <span className="font-bold text-white text-sm">
                      Escanear: {selectedAmbient === "Otro" ? (customAmbient.trim() || "Otro") : selectedAmbient}
                    </span>
                    <span className="font-bold text-white/80 text-sm">
                      {scannedFrames.length} capturas (Límite: 120)
                    </span>
                  </div>

                  {/* Centro: Guía inicial animada o velocidad */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {showGuide && (
                      <div className="animate-fade-out duration-1000 max-w-[280px] bg-black/80 border border-white/10 rounded-2xl p-4 text-center backdrop-blur">
                        <p className="text-sm font-bold leading-relaxed text-cyan-400">
                          {guidance}
                        </p>
                      </div>
                    )}

                    {isTooFast ? (
                      <div className="bg-rose-600/90 text-white font-extrabold uppercase px-6 py-3 rounded-full text-base tracking-wider animate-pulse shadow-lg">
                        Girá más despacio
                      </div>
                    ) : (
                      scannedFrames.length > 0 && !showGuide && (
                        <div className="text-xs font-semibold tracking-wider text-cyan-400/95 uppercase bg-black/55 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur">
                          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                          {guidance}
                        </div>
                      )
                    )}

                    {lastCoveredSector && (
                      <div className="mt-4 bg-emerald-500/90 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-widest shadow-md transition-all duration-300 animate-bounce">
                        ✓ {lastCoveredSector} cubierto
                      </div>
                    )}
                  </div>

                  {/* Fila Inferior: Indicador de progreso e inclinación */}
                  <div className="flex justify-between items-end w-full">
                    
                    {/* Barras de Progreso esférico por Zonas */}
                    <div className="flex flex-col gap-1.5 bg-black/60 rounded-2xl p-3 border border-white/10 backdrop-blur text-xs font-bold text-white/90 max-w-[160px]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] tracking-wide text-emerald-400">🔵 FRENTE:</span>
                        <span>{zoneCoverage.front.size}/12 ({frontPct}%)</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] tracking-wide text-cyan-300">🟡 TECHO:</span>
                        <span>{Math.min(zoneCoverage.ceiling.size, 6)}/6 ({ceilingPct}%)</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] tracking-wide text-amber-500">🟢 PISO:</span>
                        <span>{Math.min(zoneCoverage.floor.size, 6)}/6 ({floorPct}%)</span>
                      </div>
                    </div>

                    {/* Barra vertical de inclinación (Piso / Frente / Techo) */}
                    <div className="flex flex-col items-center justify-center bg-black/60 rounded-xl p-3 border border-white/10 backdrop-blur h-36 w-12 text-white font-bold">
                      <div className="relative flex-1 w-2 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="absolute top-0 text-[8px] text-white/55 font-bold uppercase">T</span>
                        <span className="text-[8px] text-white/55 font-bold uppercase">•</span>
                        <span className="absolute bottom-0 text-[8px] text-white/55 font-bold uppercase">P</span>
                        <span
                          className={`absolute h-4 w-4 rounded-full transition-all duration-100 ${isTooFast ? "bg-rose-500" : "bg-emerald-400"}`}
                          style={{
                            top: `${clamp(((orientation.beta ?? 90) / 180) * 100, 0, 100)}%`,
                            transform: "translateY(-50%)",
                          }}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {!cameraReady && !error && (
                  <div className="absolute inset-0 grid place-items-center bg-black text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 grid place-items-center bg-black px-8 text-center">
                    <div className="max-w-sm">
                      <VideoOff className="mx-auto mb-4 h-10 w-10 text-white/70" />
                      <p className="text-lg font-semibold text-rose-300">{error}</p>
                      <button
                        type="button"
                        onClick={close}
                        className="mt-6 rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* CONTROLES / PIE */}
              <div className="relative z-10 border-t border-white/10 bg-black px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
                <div className="flex items-center justify-between">
                  
                  {/* Reset / Descartar */}
                  <button
                    type="button"
                    onClick={() => {
                      setScannedFrames([]);
                      scannedFramesRef.current = [];
                      lastCaptureYawRef.current = null;
                      lastCapturePitchRef.current = null;
                      setOrientation({ alpha: null, beta: null });
                      setZoneCoverage({
                        ceiling: new Set(),
                        front: new Set(),
                        floor: new Set(),
                      });
                      hasAttemptedFinishRef.current = false;
                      setFullCircleDetected(false);
                      fullCircleDetectedRef.current = false;
                      startFrontYawRef.current = null;
                      maxFrontDeviationRef.current = 0;
                    }}
                    disabled={scannedFrames.length === 0 || isPending}
                    className="px-6 py-3 rounded-full border border-white/20 bg-white/10 text-xs font-bold text-white/80 disabled:opacity-30 cursor-pointer"
                  >
                    Reiniciar
                  </button>

                  {/* Finalizar Escaneo */}
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={!canFinish || isPending}
                    className="px-8 py-4 rounded-full bg-indigo-600 disabled:bg-indigo-600/30 text-white font-bold text-sm shadow-xl transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Finalizar escaneo ({scannedFrames.length}/24)</>
                    )}
                  </button>

                  {/* Cerrar / Brújula */}
                  <button
                    type="button"
                    onClick={close}
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/10 text-white/80 cursor-pointer"
                  >
                    <Compass className="h-5 w-5" />
                  </button>

                </div>
              </div>
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
