"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles, UploadCloud } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { upsertPropertyMediaAction } from "@/modules/properties/actions";
import {
  type MediaCategory,
  type UploadedMediaPayload,
  uploadToPropertyMedia,
} from "./media-upload-modal";

type AiTourVideoModalProps = {
  open: boolean;
  orgSlug: string;
  propertyId: string;
  onOpenChange: (open: boolean) => void;
  onCaptured?: (payload: UploadedMediaPayload) => void;
};

type ProcessResponse = {
  success: boolean;
  error?: string;
  jobId?: string;
  recommendation?: "APTO" | "APTO CON OBSERVACIONES" | "NO APTO";
  quality_score?: number | null;
  black_area_percent?: number | null;
  border_black_percent?: number | null;
  quality_warnings?: string[];
  warnings?: string[];
  frames_extracted?: number | null;
  frames_selected?: number | null;
  stitching_success?: boolean;
  recommended_panorama_type?: string | null;
  seam_warning?: string | null;
  seam_rotation_applied?: boolean;
  visual_distortion_warning?: string | null;
  viewer_recommendation?: string | null;
  urls?: {
    panorama_recommended?: string | null;
    panorama?: string | null;
    panorama_cropped?: string | null;
    preview_recommended?: string | null;
    preview?: string | null;
    preview_cropped?: string | null;
    report?: string | null;
  };
};

const ambientOptions = ["Living", "Cocina", "Habitación principal", "Habitación 2", "Baño", "Garage", "Patio", "Otro"];
const MAX_VIDEO_SIZE = 180 * 1024 * 1024;

function formatPercent(value?: number | null) {
  return typeof value === "number" ? `${value}%` : "Sin dato";
}

function formatScore(value?: number | null) {
  return typeof value === "number" ? `${value}/100` : "Sin dato";
}

function getFileExtensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

export function AiTourVideoModal({ open, orgSlug, propertyId, onOpenChange, onCaptured }: AiTourVideoModalProps) {
  const [selectedAmbient, setSelectedAmbient] = useState("Living");
  const [customAmbient, setCustomAmbient] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState(0);
  const [isProcessing, startProcessing] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const roomName = useMemo(() => {
    if (selectedAmbient === "Otro") return customAmbient.trim() || "Otro";
    return selectedAmbient;
  }, [customAmbient, selectedAmbient]);

  const recommendedImageUrl = result?.urls?.panorama_cropped || result?.urls?.panorama || null;
  const recommendedPreviewUrl = result?.urls?.preview_cropped || result?.urls?.preview || recommendedImageUrl;
  const canSave = Boolean(
    recommendedImageUrl &&
      result?.recommendation &&
      ["APTO", "APTO CON OBSERVACIONES"].includes(result.recommendation),
  );

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setStatusText(null);
    setSaveProgress(0);
  }

  function close(openValue: boolean) {
    if (!openValue) reset();
    onOpenChange(openValue);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    setResult(null);
    setError(null);
    if (!nextFile) return;
    if (!nextFile.type.startsWith("video/")) {
      setError("Seleccioná un video MP4, MOV o WebM.");
      return;
    }
    if (nextFile.size > MAX_VIDEO_SIZE) {
      setError("El video supera el máximo permitido de 180 MB.");
      return;
    }
    setFile(nextFile);
  }

  function processVideo() {
    if (!file) {
      setError("Seleccioná un video para procesar.");
      return;
    }
    startProcessing(async () => {
      try {
        setError(null);
        setResult(null);
        setStatusText("Subiendo video");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("orgSlug", orgSlug);
        formData.append("propertyId", propertyId);
        formData.append("roomName", roomName);

        setStatusText("Procesando con IA");
        const response = await fetch("/api/experimental/property-tour-ai/process", {
          method: "POST",
          body: formData,
        });
        const data = (await response.json().catch(() => ({}))) as ProcessResponse;
        if (!response.ok || !data.success) {
          throw new Error(data.error || "No se pudo procesar el tour 360 con IA.");
        }

        setStatusText("Revisando calidad");
        setResult(data);
        setStatusText(data.recommendation === "NO APTO" ? "No apto" : "Listo");
      } catch (processError) {
        setError(
          processError instanceof Error
            ? processError.message
            : "El procesador local no está disponible. Verificá Python, FFmpeg y dependencias.",
        );
        setStatusText(null);
      }
    });
  }

  function saveAsTour() {
    if (!canSave || !recommendedImageUrl) return;

    startSaving(async () => {
      try {
        setError(null);
        setSaveProgress(1);
        const imageResponse = await fetch(recommendedImageUrl);
        if (!imageResponse.ok) throw new Error("No se pudo leer la panorámica generada.");
        const blob = await imageResponse.blob();
        const extension = getFileExtensionFromContentType(blob.type);
        const panoramaFile = new File([blob], `${propertyId}-tour-ia-${Date.now()}.${extension}`, {
          type: blob.type || "image/jpeg",
          lastModified: Date.now(),
        });

        const url = await uploadToPropertyMedia(panoramaFile, "PANORAMA", orgSlug, propertyId, setSaveProgress);
        const payload: UploadedMediaPayload = {
          url,
          category: "PANORAMA" satisfies MediaCategory,
          title: roomName,
          direction: "CENTER",
        };
        const saved = await upsertPropertyMediaAction(orgSlug, propertyId, payload);
        if (!saved.success) {
          throw new Error(saved.message ?? "No se pudo guardar el tour 360 generado.");
        }
        onCaptured?.(payload);
        setStatusText("Tour 360 guardado");
        onOpenChange(false);
        reset();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el tour 360 generado.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0B0B14] p-0 text-white">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Generar tour 360 con IA</h2>
              <p className="text-xs text-white/55">Función experimental. Resultado sujeto a calidad del video.</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">Ambiente</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ambientOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedAmbient(option)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    selectedAmbient === option
                      ? "border-cyan-400 bg-cyan-500/20 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.07]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {selectedAmbient === "Otro" && (
              <input
                value={customAmbient}
                onChange={(event) => setCustomAmbient(event.target.value)}
                placeholder="Nombre del ambiente"
                className="mt-3 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyan-400"
              />
            )}
          </div>

          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-50/80">
            <p>Quedate quieto en un punto.</p>
            <p>Girás lento sobre tu propio eje, sin caminar.</p>
            <p>Usá buena luz y mantené el celular estable.</p>
            <p>Completá una vuelta entre 20 y 60 segundos.</p>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-5 text-center hover:bg-white/[0.06]">
            <UploadCloud className="mb-2 h-6 w-6 text-cyan-300" />
            <span className="text-sm font-semibold">{file ? file.name : "Elegir video"}</span>
            <span className="mt-1 text-xs text-white/45">MP4, MOV o WebM. Máximo 180 MB.</span>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {statusText && (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
              {isProcessing || isSaving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
              {statusText}
              {isSaving && saveProgress > 0 ? ` (${saveProgress}%)` : null}
            </div>
          )}

          {error && (
            <div className="flex gap-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              {recommendedPreviewUrl && (
                <img src={recommendedPreviewUrl} alt="Preview del tour 360 generado con IA" className="max-h-80 w-full rounded-lg object-contain bg-black" />
              )}
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Metric label="Recomendación" value={result.recommendation ?? "Sin dato"} />
                <Metric label="Score" value={formatScore(result.quality_score)} />
                <Metric label="Área negra" value={formatPercent(result.black_area_percent)} />
                <Metric label="Negro bordes" value={formatPercent(result.border_black_percent)} />
              </div>
              {result.urls?.panorama_cropped && (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-50/80">
                  Se generó una versión recortada recomendada para revisar.
                </div>
              )}
              {[...(result.warnings ?? []), ...(result.quality_warnings ?? [])].length > 0 && (
                <div className="space-y-1 text-xs text-white/65">
                  {[...(result.warnings ?? []), ...(result.quality_warnings ?? [])].map((warning, index) => (
                    <p key={`${warning}-${index}`}>• {warning}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => close(false)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.07]"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={processVideo}
            disabled={!file || isProcessing || isSaving || (selectedAmbient === "Otro" && !customAmbient.trim())}
            className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-40"
          >
            {isProcessing ? "Procesando..." : "Procesar con IA"}
          </button>
          <button
            type="button"
            onClick={saveAsTour}
            disabled={!canSave || isProcessing || isSaving}
            className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
          >
            <CheckCircle2 className="mr-2 inline h-4 w-4" />
            Guardar como tour 360
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
