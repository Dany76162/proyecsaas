"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, RefreshCw, AlertTriangle, CheckCircle2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  detectBlueprintSourceKind,
  assessBlueprintDetection,
  parseBlueprintDXF,
  buildDetectedLotsSVG,
  withBlueprintMeta,
  sanitizeBlueprintSVG,
} from "@/lib/blueprint-utils";
import { LotStatusBadge } from "@/components/developments/lot-status-badge";
import type { LotStatus } from "@/components/developments/lot-status-badge";
import dynamic from "next/dynamic";
import { MasterplanEmptyState } from "@/components/developments/masterplan-empty-state";
import type { DevelopmentLotItem } from "@/modules/developments/types";

const MasterplanMap = dynamic(() => import("@/components/masterplan/masterplan-map"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950 text-white gap-2">
      <RefreshCw className="h-5 w-5 animate-spin text-brand-500" />
      <span className="text-sm font-semibold">Cargando plano en mapa satelital...</span>
    </div>
  ),
});

type Props = {
  orgSlug: string;
  developmentId: string;
  existingSVG: string | null;
  existingSourceUrl: string | null;
  existingSourceKind: string | null;
  lots: DevelopmentLotItem[];
};

function toLotStatusBadge(status: string): LotStatus {
  if (status === "RESERVED_PENDING") return "RESERVED";
  if (status === "AVAILABLE" || status === "RESERVED" || status === "SOLD" || status === "BLOCKED") {
    return status as LotStatus;
  }
  return "BLOCKED";
}

export function MasterplanEditor({
  orgSlug,
  developmentId,
  existingSVG,
  lots,
}: Props) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existingSVG) {
      setSvgContent(null);
      return;
    }

    try {
      setSvgContent(sanitizeBlueprintSVG(existingSVG));
    } catch {
      setSvgContent(null);
    }
  }, [existingSVG]);

  async function handleFileUpload(file: File) {
    setUploadStatus("uploading");
    setUploadError(null);
    setWarnings([]);
    setSyncMessage(null);

    try {
      const sourceKind = detectBlueprintSourceKind({ name: file.name, type: file.type });

      // 1. Upload file to R2 server-side
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(
        `/api/storage/upload/masterplan?orgSlug=${encodeURIComponent(orgSlug)}&developmentId=${encodeURIComponent(developmentId)}`,
        { method: "POST", body: formData },
      );
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || "Error subiendo archivo.");
      }
      const { publicUrl } = await uploadRes.json();

      setUploadStatus("processing");

      // 2. Parse DXF/SVG client-side
      let parsedSvg = "";
      let parsedPaths: ReturnType<typeof parseBlueprintDXF>["paths"] = [];

      if (sourceKind === "dxf") {
        const text = await file.text();
        const result = parseBlueprintDXF(text);
        parsedPaths = result.paths;
        parsedSvg = result.svg;
      } else if (sourceKind === "svg") {
        // Sanitize SVG input from user before using it
        parsedSvg = sanitizeBlueprintSVG(await file.text());
      } else {
        // Image/PDF: show the uploaded asset via a clean SVG wrapper (no user-controlled content)
        parsedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
<image href="${publicUrl.replace(/"/g, "&quot;")}" x="0" y="0" width="1200" height="800" preserveAspectRatio="xMidYMid meet" />
</svg>`;
      }

      // 3. Assess detection quality
      const assessment = assessBlueprintDetection(parsedPaths);
      setWarnings(assessment.warnings);

      const lotPaths = assessment.mode === "detected-lots" ? assessment.usablePaths : [];
      const rawSvg = lotPaths.length > 0 ? buildDetectedLotsSVG(lotPaths) : parsedSvg;

      // Sanitize final SVG before embedding meta and storing in state
      const cleanSvg = sanitizeBlueprintSVG(rawSvg);

      const svgWithMeta = withBlueprintMeta(cleanSvg, {
        sourceKind,
        sourceName: file.name,
        sourceMime: file.type,
        sourceUrl: publicUrl,
        processingMode: assessment.mode,
        detectedPaths: assessment.metrics.totalPaths,
        detectedLots: lotPaths.length,
        warnings: assessment.warnings,
        savedAt: new Date().toISOString(),
      });

      // 4. Sync to backend (server applies regex sanitization before saving to DB)
      const syncRes = await fetch(
        `/api/developments/${developmentId}/blueprint/sync?orgSlug=${encodeURIComponent(orgSlug)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paths: lotPaths,
            svgContent: svgWithMeta,
            meta: {
              sourceKind,
              sourceName: file.name,
              sourceUrl: publicUrl,
              processingMode: assessment.mode,
            },
          }),
        },
      );

      if (!syncRes.ok) {
        const err = await syncRes.json().catch(() => ({}));
        throw new Error(err.error || "Error sincronizando lotes.");
      }

      const syncData = await syncRes.json();
      // Render the already-sanitized SVG in state
      setSvgContent(svgWithMeta);
      setSyncMessage(syncData.message ?? "Masterplan guardado.");
      setUploadStatus("done");
    } catch (err: any) {
      setUploadError(err.message || "Error inesperado.");
      setUploadStatus("error");
    }
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left: Interactive Map */}
      <div className="flex-1 min-w-0 bg-slate-950 flex flex-col relative">
        {svgContent ? (
          <MasterplanMap
            proyectoId={developmentId}
            modo="admin"
            canEdit={true}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <MasterplanEmptyState
              isAdmin
              onUploadClick={() => fileInputRef.current?.click()}
            />
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <aside className="w-80 shrink-0 border-l border-slate-800 bg-slate-900 text-white flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-bold text-sm text-white mb-3">Subir Masterplan</h3>
          <p className="text-xs text-slate-400 mb-3">
            Formatos: DXF, SVG, PDF, PNG, JPG, WEBP
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".dxf,.svg,.pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus === "uploading" || uploadStatus === "processing"}
            className="w-full gap-2"
          >
            {uploadStatus === "uploading" || uploadStatus === "processing" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploadStatus === "uploading"
              ? "Subiendo..."
              : uploadStatus === "processing"
                ? "Procesando..."
                : "Cargar archivo"}
          </Button>

          {uploadError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {uploadError}
            </div>
          )}

          {uploadStatus === "done" && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              {syncMessage ?? "Masterplan guardado."}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs text-amber-300"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {w}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lots list */}
        <div className="p-4">
          <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-400" />
            Lotes ({lots.length})
          </h3>
          {lots.length === 0 ? (
            <p className="text-xs text-slate-500">Sin lotes detectados.</p>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {lots.map((lot) => (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => setSelectedLot(lot.id === selectedLot ? null : lot.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                    selectedLot === lot.id
                      ? "bg-brand-500/20 border border-brand-500/50 text-white"
                      : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span className="font-mono font-semibold">{lot.lotNumber}</span>
                  <LotStatusBadge status={toLotStatusBadge(lot.status)} />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
