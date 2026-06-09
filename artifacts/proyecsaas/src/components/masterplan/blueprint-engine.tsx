"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import {
    Upload, FileCode, Layers, RefreshCw,
    Trash2, FileText, ZoomIn, ZoomOut, Maximize2, Minimize2,
    RotateCcw, ScanSearch, Map, Ruler, Download,
    Search, X, Check, LayoutList, HelpCircle, ChevronDown, ChevronUp, Grid3x3, Move
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMasterplanStore } from "@/lib/masterplan-store";
import PlanGalleryPicker, { type PlanGalleryItem } from "@/components/plan-gallery/plan-gallery-picker";
import {
    parseBlueprintSVG,
    parseBlueprintDXF,
    ExtractedPath,
    BlueprintEmbeddedMeta,
    BlueprintSourceKind,
    assessBlueprintDetection,
    buildDetectedLotsSVG,
    buildFallbackBlueprintSVG,
    buildImageBlueprintSVG,
    detectBlueprintSourceKind,
    extractBlueprintMeta,
    sanitizeBlueprintSVG,
    extractPathBounds,
    getPathGeometry,
} from "@/lib/blueprint-utils";

interface BlueprintEngineProps {
    proyectoId: string;
    orgSlug: string;
}

type LotEstado = "DISPONIBLE" | "RESERVADO" | "VENDIDO" | "BLOQUEADO";

interface LotRecord {
    pathId: string;
    lotNumber: string;
    areaSqm: number;
    frente: string;
    fondo: string;
    estado: LotEstado;
    precio: string;
    observaciones: string;
}

interface ProcessingReport {
    sourceKind: BlueprintSourceKind;
    mode: "detected-lots" | "visual-only" | "source-only";
    warnings: string[];
    message: string;
    sourceUrl?: string;
}

const ESTADO_CONFIG: Record<LotEstado, { label: string; color: string; bg: string }> = {
    DISPONIBLE: { label: "Disponible", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
    RESERVADO:  { label: "Reservado",  color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30"   },
    VENDIDO:    { label: "Vendido",    color: "text-red-600 dark:text-red-400",        bg: "bg-red-500/10 border-red-500/30"       },
    BLOQUEADO:  { label: "Bloqueado",  color: "text-slate-500",                        bg: "bg-slate-500/10 border-slate-500/30"   },
};

const ESTADO_FILL: Record<LotEstado, string> = {
    DISPONIBLE: "rgba(16,185,129,0.08)",
    RESERVADO:  "rgba(245,158,11,0.22)",
    VENDIDO:    "rgba(239,68,68,0.22)",
    BLOQUEADO:  "rgba(100,116,139,0.18)",
};

const ESTADO_CYCLE: LotEstado[] = ["DISPONIBLE", "RESERVADO", "VENDIDO", "BLOQUEADO"];

// ─── Zoom controls (inside TransformWrapper) ─────────────────────────────────
function ZoomControls({ onFullscreen, isFullscreen }: { onFullscreen: () => void; isFullscreen: boolean }) {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    const btn = "w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors";
    return (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
            <button onClick={() => zoomIn(0.15, 200, "easeOut")} title="Acercar" className={btn}><ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
            <button onClick={() => zoomOut(0.15, 200, "easeOut")} title="Alejar" className={btn}><ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
            <button onClick={() => resetTransform()} title="Restablecer" className={btn}><RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
            <button onClick={onFullscreen} title={isFullscreen ? "Salir pantalla completa" : "Pantalla completa"} className={btn}>
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" /> : <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            </button>
        </div>
    );
}

export default function BlueprintEngine({ proyectoId, orgSlug }: BlueprintEngineProps) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [stats, setStats] = useState<{ pathsFound: number; labeled: number } | null>(null);
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [extractedPaths, setExtractedPaths] = useState<ExtractedPath[]>([]);
    const [isDXF, setIsDXF] = useState(false);
    const [sourceKind, setSourceKind] = useState<BlueprintSourceKind>("unknown");
    const [processingReport, setProcessingReport] = useState<ProcessingReport | null>(null);
    const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [viewMode, setViewMode] = useState<"analysis" | "blueprint" | "anchor">("analysis");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tooltip, setTooltip] = useState({ visible: false, lot: "", area: "", x: 0, y: 0 });

    // Lot management state
    const [lotRecords, setLotRecords] = useState<LotRecord[]>([]);
    const [activeLotNumber, setActiveLotNumber] = useState<string | null>(null);
    const [scaleMeters, setScaleMeters] = useState<string>("1");
    const [planGalleryItems, setPlanGalleryItems] = useState<PlanGalleryItem[]>([]);
    const [showPlanGallery, setShowPlanGallery] = useState(false);
    const [selectedGalleryPlanId, setSelectedGalleryPlanId] = useState<string | null>(null);
    const [loadedFromDB, setLoadedFromDB] = useState(false);
    const [showSummary, setShowSummary] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const activeRowRef = useRef<HTMLTableRowElement>(null);
    const units = useMasterplanStore((s) => s.units);
    const [anchorPoints, setAnchorPoints] = useState<{ x: number, y: number }[]>([]);
    const [isAnchorClosed, setIsAnchorClosed] = useState(false);

    // ─── Normalize DB estado → LotEstado ────────────────────────────────────
    const normalizeEstado = (estado: string): LotEstado => {
        const map: Record<string, LotEstado> = {
            DISPONIBLE: "DISPONIBLE",
            RESERVADA: "RESERVADO",
            RESERVADO: "RESERVADO",
            VENDIDA: "VENDIDO",
            VENDIDO: "VENDIDO",
            BLOQUEADO: "BLOQUEADO",
            SUSPENDIDO: "BLOQUEADO",
            SUSPENDIDA: "BLOQUEADO",
        };
        return map[estado] ?? "DISPONIBLE";
    };

    // ─── Load existing blueprint from DB on mount ────────────────────────────
    useEffect(() => {
        const loadExistingBlueprint = async () => {
            try {
                const res = await fetch(`/api/developments/${proyectoId}/blueprint?orgSlug=${orgSlug}`);
                if (!res.ok) return;
                const data = await readJsonResponse(res);

                if (!data.masterplanSVG) return;

                const embeddedMeta = (data.blueprintMeta as BlueprintEmbeddedMeta | null) ?? extractBlueprintMeta(data.masterplanSVG);
                setSvgContent(data.masterplanSVG);
                setSourceKind(embeddedMeta?.sourceKind ?? "svg");
                setIsDXF(embeddedMeta?.sourceKind === "dxf");
                setSourcePreviewUrl(embeddedMeta?.sourceUrl ?? null);
                setAnchorPoints(embeddedMeta?.anchorPoints ?? []);
                setIsAnchorClosed((embeddedMeta?.anchorPoints?.length ?? 0) >= 3);
                setProcessingReport(embeddedMeta ? {
                    sourceKind: embeddedMeta.sourceKind,
                    mode: embeddedMeta.processingMode,
                    warnings: embeddedMeta.warnings ?? [],
                    message:
                        embeddedMeta.processingMode === "detected-lots"
                            ? "Plano restaurado con deteccion previa."
                            : embeddedMeta.processingMode === "visual-only"
                                ? "Se restauro una base visual sin lotes detectados automaticamente."
                                : "Se restauro el archivo original como referencia.",
                    sourceUrl: embeddedMeta.sourceUrl,
                } : null);

                if (embeddedMeta?.processingMode !== "detected-lots" || !data.unidades?.length) {
                    setExtractedPaths([]);
                    setLotRecords([]);
                    setStats({
                        pathsFound: embeddedMeta?.detectedPaths ?? 0,
                        labeled: embeddedMeta?.detectedLots ?? 0,
                    });

                    setLoadedFromDB(true);
                    return;
                }

                setIsDXF(false);

                // Reconstruct extractedPaths from units stored in DB
                const paths: ExtractedPath[] = (data.unidades as any[])
                    .filter((u) => u.coordenadasMasterplan)
                    .map((u, idx) => {
                        try {
                            const coords = JSON.parse(u.coordenadasMasterplan);
                            return {
                                id: `db-${u.id}`,
                                pathData: coords.path ?? "",
                                center: coords.center ?? { x: 0, y: 0 },
                                lotNumber: u.numero,
                                internalId: coords.internalId ?? (idx + 1),
                                areaSqm: u.superficie ?? undefined,
                            } as ExtractedPath;
                        } catch {
                            return null;
                        }
                    })
                    .filter(Boolean) as ExtractedPath[];

                setExtractedPaths(paths);

                // Reconstruct lotRecords
                const records: LotRecord[] = (data.unidades as any[])
                    .filter((u) => u.numero && u.coordenadasMasterplan)
                    .map((u, idx) => {
                        let coordsData: any = {};
                        try { coordsData = JSON.parse(u.coordenadasMasterplan); } catch {}

                        let frente = u.frente != null ? String(u.frente) : "";
                        let fondo = u.fondo != null ? String(u.fondo) : "";

                        const hasFrente = frente && frente !== "0" && frente !== "0.0";
                        const hasFondo = fondo && fondo !== "0" && fondo !== "0.0";

                        if ((!hasFrente || !hasFondo) && coordsData.path) {
                            const geom = getPathGeometry(coordsData.path);
                            if (geom) {
                                const areaSqm = u.superficie || 0;
                                let s = 1;
                                if (areaSqm > 0 && geom.area > 0) {
                                    s = Math.sqrt(areaSqm / geom.area);
                                } else {
                                    s = parseFloat(scaleMeters) || 1;
                                }
                                const dim1 = geom.width * s;
                                const dim2 = geom.height * s;
                                if (!hasFrente) {
                                    frente = Math.min(dim1, dim2).toFixed(1);
                                }
                                if (!hasFondo) {
                                    fondo = Math.max(dim1, dim2).toFixed(1);
                                }
                            }
                        }

                        return {
                            pathId: `db-${u.id}`,
                            lotNumber: u.numero,
                            areaSqm: u.superficie ?? 0,
                            frente,
                            fondo,
                            estado: normalizeEstado(u.estado),
                            precio: u.precio != null ? String(u.precio) : "",
                            observaciones: "",
                        } as LotRecord;
                    });

                setLotRecords(records);
                setStats({
                    pathsFound: paths.length,
                    labeled: paths.filter((p) => p.lotNumber).length,
                });
                setLoadedFromDB(true);

            } catch {
                // Silent fail — user can always re-upload the DXF
            }
        };

        loadExistingBlueprint();
    }, [proyectoId]);

    // Scroll active row into view
    useEffect(() => {
        if (activeRowRef.current) {
            activeRowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [activeLotNumber]);

    // ─── Build lot records from extracted paths ───────────────────────────────
    const initLotRecords = (paths: ExtractedPath[]) => {
        const s = parseFloat(scaleMeters) || 1;
        const records: LotRecord[] = paths
            .filter(p => p.lotNumber)
            .sort((a, b) => {
                // Prefer spatial reading order (internalId) when available
                if (a.internalId !== undefined && b.internalId !== undefined) {
                    return a.internalId - b.internalId;
                }
                const n1 = parseInt(a.lotNumber!), n2 = parseInt(b.lotNumber!);
                return isNaN(n1) || isNaN(n2) ? (a.lotNumber!).localeCompare(b.lotNumber!) : n1 - n2;
            })
            .map(p => {
                let frente = "";
                let fondo = "";
                const bounds = extractPathBounds(p.pathData);
                if (bounds) {
                    const wDrawing = bounds.maxX - bounds.minX;
                    const hDrawing = bounds.maxY - bounds.minY;
                    const dim1 = wDrawing * s;
                    const dim2 = hDrawing * s;
                    frente = Math.min(dim1, dim2).toFixed(1);
                    fondo = Math.max(dim1, dim2).toFixed(1);
                }
                return {
                    pathId: p.id,
                    lotNumber: p.lotNumber!,
                    areaSqm: p.areaSqm ?? 0,
                    frente,
                    fondo,
                    estado: "DISPONIBLE" as LotEstado,
                    precio: "",
                    observaciones: "",
                };
            });
        setLotRecords(records);
    };

    useEffect(() => {
        if (!file) return;
        const s = parseFloat(scaleMeters);
        if (isNaN(s) || s <= 0 || extractedPaths.length === 0) return;

        setLotRecords(prev => prev.map(r => {
            const path = extractedPaths.find(p => p.id === r.pathId);
            if (!path) return r;
            const bounds = extractPathBounds(path.pathData);
            if (!bounds) return r;
            const wDrawing = bounds.maxX - bounds.minX;
            const hDrawing = bounds.maxY - bounds.minY;
            const dim1 = wDrawing * s;
            const dim2 = hDrawing * s;
            return {
                ...r,
                frente: Math.min(dim1, dim2).toFixed(1),
                fondo: Math.max(dim1, dim2).toFixed(1)
            };
        }));
    }, [scaleMeters, extractedPaths, file]);

    const updateLot = (pathId: string, field: keyof LotRecord, value: string) => {
        setLotRecords(prev => prev.map(r => r.pathId === pathId ? { ...r, [field]: value } : r));
    };

    const cycleEstado = (pathId: string, current: LotEstado) => {
        const next = ESTADO_CYCLE[(ESTADO_CYCLE.indexOf(current) + 1) % ESTADO_CYCLE.length];
        updateLot(pathId, "estado", next);
    };

    // ─── Export CSV ───────────────────────────────────────────────────────────
    const exportCSV = () => {
        const s = parseFloat(scaleMeters) || 1;
        const areaHeader = s === 1 ? "Superficie (u²)" : "Superficie (m²)";
        const headers = ["N° Lote", areaHeader, "Frente (m)", "Fondo (m)", "Estado", "Precio", "Observaciones"];
        const rows = lotRecords.map(r => {
            const area = s === 1 ? r.areaSqm.toFixed(2) : (r.areaSqm * s * s).toFixed(0);
            return [r.lotNumber, area, r.frente, r.fondo, r.estado, r.precio, r.observaciones];
        });
        const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `lotes-${file?.name?.replace(".dxf", "") ?? "plano"}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // ─── File upload ──────────────────────────────────────────────────────────
    const readJsonResponse = async (response: Response) => {
        const raw = await response.text();
        if (!raw) return {};

        try {
            return JSON.parse(raw) as any;
        } catch {
            throw new Error(`Respuesta no parseable del servidor (${response.status})`);
        }
    };

    const loadPlanGallery = useCallback(async () => {
        try {
            const response = await fetch(`/api/developments/${proyectoId}/plan-gallery?orgSlug=${orgSlug}`);
            const data = await readJsonResponse(response);
            if (response.ok && Array.isArray(data.items)) {
                setPlanGalleryItems(data.items);
            }
        } catch {
            // silent: gallery is optional support UI
        }
    }, [proyectoId]);

    useEffect(() => {
        loadPlanGallery();
    }, [loadPlanGallery]);

    const uploadMasterplanSource = async (uploadedFile: File) => {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("projectId", proyectoId);
        formData.append("orgSlug", orgSlug);

        const response = await fetch("/api/upload/masterplan", {
            method: "POST",
            body: formData,
        });
        const data = await readJsonResponse(response);

        if (!response.ok) {
            throw new Error(data.error || "No se pudo guardar el archivo original");
        }

        return data as { url: string; detectedType?: string | null };
    };

    const tryUploadMasterplanSource = async (uploadedFile: File) => {
        try {
            const upload = await uploadMasterplanSource(uploadedFile);
            return { upload, warning: null as string | null };
        } catch (error: any) {
            return {
                upload: null,
                warning: error?.message || "No se pudo guardar el archivo original en este intento.",
            };
        }
    };

    const getImageDimensions = async (uploadedFile: File) => {
        const previewUrl = URL.createObjectURL(uploadedFile);

        try {
            const image = new Image();
            await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = () => reject(new Error("No se pudo leer la imagen"));
                image.src = previewUrl;
            });

            return {
                width: image.naturalWidth || 1600,
                height: image.naturalHeight || 900,
            };
        } finally {
            URL.revokeObjectURL(previewUrl);
        }
    };

    const resetBlueprintState = () => {
        setSvgContent(null);
        setStats(null);
        setExtractedPaths([]);
        setLotRecords([]);
        setActiveLotNumber(null);

        setIsDXF(false);
        setSourceKind("unknown");
        setProcessingReport(null);
        setSourcePreviewUrl(null);
    };

    const savePlanToGallery = useCallback(async (
        svg: string,
        uploadedFile: File,
        tipo: PlanGalleryItem["tipo"] = "subdivision",
    ) => {
        try {
            const form = new FormData();
            const name = uploadedFile.name.replace(/\.[^.]+$/, "");
            const svgFile = new File([svg], `${name}.svg`, { type: "image/svg+xml" });
            form.append("file", svgFile);
            form.append("nombre", name);
            form.append("tipo", tipo);

            const response = await fetch(`/api/developments/${proyectoId}/plan-gallery?orgSlug=${orgSlug}`, {
                method: "POST",
                body: form,
            });
            const data = await readJsonResponse(response);
            if (!response.ok || !data.item) {
                throw new Error(data.error || "No se pudo agregar a la galeria");
            }

            setPlanGalleryItems((prev) => [...prev, data.item]);
            setSelectedGalleryPlanId(data.item.id);
        } catch {
            // no bloquear el flujo principal por una falla secundaria
        }
    }, [proyectoId]);

    const applyGalleryPlan = useCallback(async (item: PlanGalleryItem) => {
        try {
            const response = await fetch(item.imageUrl);
            const raw = await response.text();
            const svg = sanitizeBlueprintSVG(raw);
            const meta = extractBlueprintMeta(svg);

            setSelectedGalleryPlanId(item.id);
            setFile(null);
            setSvgContent(svg);
            setExtractedPaths([]);
            setLotRecords([]);
            setActiveLotNumber(null);

            setSourceKind(meta?.sourceKind ?? "svg");
            setIsDXF(false);
            setStats({
                pathsFound: meta?.detectedPaths ?? 0,
                labeled: meta?.detectedLots ?? 0,
            });
            setAnchorPoints(meta?.anchorPoints ?? []);
            setSourcePreviewUrl(item.imageUrl);
            setProcessingReport({
                sourceKind: meta?.sourceKind ?? "svg",
                mode: meta?.processingMode ?? "visual-only",
                warnings: meta?.warnings ?? [],
                message: `Plano "${item.nombre}" cargado desde la galeria.`,
                sourceUrl: item.imageUrl,
            });
            setViewMode("blueprint");
            setShowPlanGallery(false);
        } catch {
            toast.error("No se pudo abrir este plano de la galería.");
        }
    }, []);

    const setDetectedLotsResult = (
        uploadedFile: File,
        kind: BlueprintSourceKind,
        svg: string,
        paths: ExtractedPath[],
        warnings: string[] = [],
        options?: { sourceUrl?: string; message?: string }
    ) => {
        const labeled = paths.filter((path) => path.lotNumber).length;
        setFile(uploadedFile);
        setSelectedGalleryPlanId(null);
        setSourceKind(kind);
        setIsDXF(kind === "dxf");
        setSvgContent(svg);
        setExtractedPaths(paths);
        initLotRecords(paths);
        setAnchorPoints([]);
        setStats({ pathsFound: paths.length, labeled });
        setProcessingReport({
            sourceKind: kind,
            mode: "detected-lots",
            warnings,
            message:
                options?.message ??
                (labeled > 0
                    ? `Se detectaron ${labeled} lotes para sincronizar.`
                    : "Se detecto la geometria del plano, pero no etiquetas confiables."),
            sourceUrl: options?.sourceUrl,
        });
        setSourcePreviewUrl(options?.sourceUrl ?? null);

        void savePlanToGallery(svg, uploadedFile, "subdivision");
    };

    const setVisualOnlyResult = (
        uploadedFile: File,
        kind: BlueprintSourceKind,
        svg: string,
        options: { sourceUrl?: string; warnings?: string[]; message: string; mode?: "visual-only" | "source-only" }
    ) => {
        const warnings = options.warnings ?? [];
        const mode = options.mode ?? "visual-only";
        setFile(uploadedFile);
        setSelectedGalleryPlanId(null);
        setSourceKind(kind);
        setIsDXF(false);
        setSvgContent(svg);
        setExtractedPaths([]);
        setLotRecords([]);
        setStats({ pathsFound: 0, labeled: 0 });
        setProcessingReport({
            sourceKind: kind,
            mode,
            warnings,
            message: options.message,
            sourceUrl: options.sourceUrl,
        });
        setSourcePreviewUrl(options.sourceUrl ?? null);
        void savePlanToGallery(svg, uploadedFile, kind === "pdf" ? "catastral" : "otro");
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        handleFileUpload({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;
        setProcessing(true);
        resetBlueprintState();

        try {
            const kind = detectBlueprintSourceKind(uploadedFile);
            const textContent = kind === "svg" || kind === "dxf" ? await uploadedFile.text() : null;

            if (kind === "svg" && textContent) {
                const cleanSvg = sanitizeBlueprintSVG(textContent);
                const paths = parseBlueprintSVG(cleanSvg);
                setDetectedLotsResult(
                    uploadedFile,
                    "svg",
                    cleanSvg,
                    paths,
                    paths.length === 0 ? ["Se cargo el SVG como base visual sin poligonos detectables."] : []
                );
                return;
            }

            if (kind === "dxf" && textContent) {
                try {
                    const result = parseBlueprintDXF(textContent);
                    const assessment = assessBlueprintDetection(result.paths);
                    const { upload, warning: uploadWarning } = await tryUploadMasterplanSource(uploadedFile);
                    const warnings = [...assessment.warnings, ...(uploadWarning ? [uploadWarning] : [])];

                    if (assessment.mode !== "detected-lots") {
                        const fallbackSvg = buildFallbackBlueprintSVG({
                            title: "DXF complejo recibido",
                            subtitle: uploadedFile.name,
                            lines: [
                                "La estructura CAD no permitio detectar lotes confiables en esta pasada.",
                                upload
                                    ? "Se guardo el archivo original para continuar sin perder la fuente."
                                    : "Mostramos el resultado, pero no pudimos persistir la fuente original en este intento.",
                            ],
                            meta: {
                                sourceKind: "dxf",
                                sourceName: uploadedFile.name,
                                sourceMime: uploadedFile.type || undefined,
                                sourceUrl: upload?.url,
                                processingMode: "source-only",
                                warnings,
                                detectedPaths: assessment.metrics.plausiblePolygons,
                                detectedLots: 0,
                            },
                        });
                        setVisualOnlyResult(uploadedFile, "dxf", fallbackSvg, {
                            sourceUrl: upload?.url,
                            warnings,
                            message: "El DXF quedo guardado como fuente original. No se sincronizo inventario para evitar datos basura.",
                            mode: "source-only",
                        });
                        return;
                    }

                    const usableSvg = buildDetectedLotsSVG(assessment.usablePaths);
                    const labeledPolygons = assessment.usablePaths.filter((path) => path.lotNumber).length;

                    setDetectedLotsResult(
                        uploadedFile,
                        "dxf",
                        usableSvg,
                        assessment.usablePaths,
                        warnings,
                        {
                            sourceUrl: upload?.url,
                            message:
                                assessment.syntheticLabelsApplied
                                    ? `Se detectaron ${assessment.metrics.plausiblePolygons} poligonos utilizables. Se asignaron identificadores correlativos para evitar etiquetas basura.`
                                    : `Se detectaron ${assessment.metrics.plausiblePolygons} poligonos utilizables y ${labeledPolygons} etiquetas confiables.`,
                        }
                    );
                    return;
                } catch (error: any) {
                    const { upload, warning: uploadWarning } = await tryUploadMasterplanSource(uploadedFile);
                    const warnings = [error?.message || "DXF no compatible con el parser actual"];
                    if (uploadWarning) {
                        warnings.push(uploadWarning);
                    }
                    const fallbackSvg = buildFallbackBlueprintSVG({
                        title: "DXF recibido",
                        subtitle: uploadedFile.name,
                        lines: [
                            "No pudimos reconstruir los lotes de forma confiable en este intento.",
                            upload
                                ? "Se guardo el archivo original para reintentar o ajustar despues."
                                : "Mostramos el resultado igualmente, pero no pudimos guardar el archivo original en este intento.",
                        ],
                        meta: {
                            sourceKind: "dxf",
                            sourceName: uploadedFile.name,
                            sourceMime: uploadedFile.type || undefined,
                            sourceUrl: upload?.url,
                            processingMode: "source-only",
                            warnings,
                        },
                    });
                    setVisualOnlyResult(uploadedFile, "dxf", fallbackSvg, {
                        sourceUrl: upload?.url,
                        warnings,
                        message: upload
                            ? "El DXF se guardo como fuente original. No se detectaron lotes automaticamente."
                            : "No se detectaron lotes automaticamente. Mostramos el resultado, pero no pudimos guardar el archivo original en este intento.",
                        mode: "source-only",
                    });
                    return;
                }
            }

            if (kind === "image") {
                const { upload, warning: uploadWarning } = await tryUploadMasterplanSource(uploadedFile);
                const dimensions = await getImageDimensions(uploadedFile);
                const svg = buildImageBlueprintSVG({
                    imageUrl: upload?.url ?? URL.createObjectURL(uploadedFile),
                    width: dimensions.width,
                    height: dimensions.height,
                    meta: {
                        sourceKind: "image",
                        sourceName: uploadedFile.name,
                        sourceMime: uploadedFile.type || undefined,
                        sourceUrl: upload?.url,
                        processingMode: "visual-only",
                        warnings: [
                            "Se cargo una base visual. La deteccion automatica de lotes queda para una segunda pasada.",
                            ...(uploadWarning ? [uploadWarning] : []),
                        ],
                    },
                });
                setVisualOnlyResult(uploadedFile, "image", svg, {
                    sourceUrl: upload?.url,
                    warnings: [
                        "Se cargo una base visual sin deteccion automatica de lotes.",
                        ...(uploadWarning ? [uploadWarning] : []),
                    ],
                    message: "La imagen ya puede usarse como base visual del proyecto.",
                });
                return;
            }

            if (kind === "pdf") {
                const { upload, warning: uploadWarning } = await tryUploadMasterplanSource(uploadedFile);
                const svg = buildFallbackBlueprintSVG({
                    title: "PDF cargado",
                    subtitle: uploadedFile.name,
                    lines: [
                        upload ? "El archivo se guardo correctamente." : "Se preparo una base visual local para continuar.",
                        "No se detectaron lotes automaticamente desde PDF en el navegador.",
                        "Podes seguir con una base visual o volver despues con un DXF o SVG.",
                    ],
                    meta: {
                        sourceKind: "pdf",
                        sourceName: uploadedFile.name,
                        sourceMime: uploadedFile.type || undefined,
                        sourceUrl: upload?.url,
                        processingMode: "visual-only",
                        warnings: [
                            "El PDF se mantiene como referencia visual; la deteccion automatica no esta disponible en esta pasada.",
                            ...(uploadWarning ? [uploadWarning] : []),
                        ],
                    },
                });
                setVisualOnlyResult(uploadedFile, "pdf", svg, {
                    sourceUrl: upload?.url,
                    warnings: [
                        "PDF cargado como referencia visual sin deteccion automatica.",
                        ...(uploadWarning ? [uploadWarning] : []),
                    ],
                    message: upload
                        ? "El PDF quedo guardado y disponible como referencia visual."
                        : "El PDF quedo cargado como base visual local aunque la fuente no se pudo persistir en este intento.",
                });
                return;
            }

            if (kind === "dwg") {
                const { upload, warning: uploadWarning } = await tryUploadMasterplanSource(uploadedFile);
                const svg = buildFallbackBlueprintSVG({
                    title: "DWG recibido",
                    subtitle: uploadedFile.name,
                    lines: [
                        upload ? "El archivo original se guardo correctamente." : "Se genero una referencia local para no perder el flujo.",
                        "El navegador no puede convertir DWG a lotes de forma segura en esta etapa.",
                        "Si tenes DXF o SVG, podes reintentar luego sin perder esta referencia.",
                    ],
                    meta: {
                        sourceKind: "dwg",
                        sourceName: uploadedFile.name,
                        sourceMime: uploadedFile.type || undefined,
                        sourceUrl: upload?.url,
                        processingMode: "source-only",
                        warnings: [
                            "DWG almacenado como fuente original; conversion automatica pendiente.",
                            ...(uploadWarning ? [uploadWarning] : []),
                        ],
                    },
                });
                setVisualOnlyResult(uploadedFile, "dwg", svg, {
                    sourceUrl: upload?.url,
                    warnings: [
                        "DWG guardado como archivo original. No se genero deteccion automatica.",
                        ...(uploadWarning ? [uploadWarning] : []),
                    ],
                    message: upload
                        ? "El DWG se guardo y quedo trazado para continuar sin perder el archivo."
                        : "El DWG quedo cargado en modo referencia aunque la fuente no se pudo persistir en este intento.",
                    mode: "source-only",
                });
                return;
            }

            throw new Error("Formato no soportado para este flujo");
        } catch {
            toast.error("No se pudo procesar el plano. Verificá el formato del archivo e intentá nuevamente.");
            resetBlueprintState();
            return;
        } finally {
            setProcessing(false);
        }
                    
    };

    const handleClear = () => {
        setFile(null);
        resetBlueprintState();
        setViewMode("analysis");
        setLoadedFromDB(false);
        setTooltip({ visible: false, lot: "", area: "", x: 0, y: 0 });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
    };

    const handleDeleteBlueprint = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/developments/${proyectoId}/blueprint`, { method: "DELETE" });
            const data = await readJsonResponse(res);
            if (!res.ok) {
                toast.error(data?.error || "No se pudo eliminar el plano.");
                return;
            }
            handleClear();
            toast.success("Plano eliminado correctamente.");
            router.refresh();
        } catch {
            toast.error("Error de conexión al eliminar el plano.");
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSync = async () => {
        if (!svgContent) return;
        setProcessing(true);
        try {
            const lotDataMap: Record<string, LotRecord> = {};
            lotRecords.forEach((record) => { lotDataMap[record.pathId] = record; });

            const meta: BlueprintEmbeddedMeta = {
                sourceKind: processingReport?.sourceKind || "svg",
                sourceName: file?.name || undefined,
                sourceMime: file?.type || undefined,
                sourceUrl: processingReport?.sourceUrl,
                processingMode: processingReport?.mode || "detected-lots",
                warnings: processingReport?.warnings || [],
                detectedPaths: extractedPaths.length,
                detectedLots: extractedPaths.filter((path) => path.lotNumber).length,
                anchorPoints: anchorPoints.length > 0 ? anchorPoints : undefined,
            };

            const res = await fetch(`/api/developments/${proyectoId}/blueprint/sync?orgSlug=${orgSlug}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    svgContent,
                    meta,
                    paths: extractedPaths.map((path) => {
                        const ld = lotDataMap[path.id];
                        return {
                            internalId: path.internalId,
                            lotNumber: path.lotNumber,
                            pathData: path.pathData,
                            center: path.center,
                            areaSqm: path.areaSqm,
                            estado: ld?.estado ?? "DISPONIBLE",
                            precio: ld?.precio ? parseFloat(ld.precio) : null,
                            frente: ld?.frente ? parseFloat(ld.frente) : null,
                            fondo: ld?.fondo ? parseFloat(ld.fondo) : null,
                        };
                    }),
                }),
            });

            if (res.ok) {
                const data = await readJsonResponse(res);
                const created = data.created ?? 0;
                const updated = data.updated ?? 0;
                toast.success(
                    `${data.message || "Plano sincronizado con éxito."} — ${created} unidades creadas, ${updated} actualizadas.`
                );
                return;
            }

            const err = await readJsonResponse(res).catch(() => ({}));
            throw new Error(err.error || "Error del servidor");
        } catch {
            toast.error("No se pudo sincronizar el plano. Intentá nuevamente.");
            return;
        } finally {
            setProcessing(false);
        }
    };

    const handleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) { containerRef.current.requestFullscreen(); setIsFullscreen(true); }
        else { document.exitFullscreen(); setIsFullscreen(false); }
    }, []);

    // ─── SVG mouse events ─────────────────────────────────────────────────────
    const handleMouseOver = (e: React.MouseEvent) => {
        if (viewMode === "anchor") {
            if (tooltip.visible) setTooltip(prev => ({ ...prev, visible: false }));
            return;
        }
        const t = e.target as Element;
        const lot = t.getAttribute?.("data-lot"), area = t.getAttribute?.("data-area");
        if (lot) {
            setTooltip({ visible: true, lot, area: area || "", x: e.clientX, y: e.clientY });
        } else {
            if (tooltip.visible) setTooltip(prev => ({ ...prev, visible: false }));
        }
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (viewMode === "anchor") return;
        if (tooltip.visible) setTooltip(t => ({ ...t, x: e.clientX, y: e.clientY }));
    };
    const handleMouseLeave = () => setTooltip(t => ({ ...t, visible: false }));
    const handleSvgClick = (e: React.MouseEvent) => {
        if (viewMode === "anchor") {
            if (isAnchorClosed) return; // Ya está cerrado, no agregar más puntos
            const svgEl = containerRef.current?.querySelector(".blueprint-render svg");
            if (svgEl && svgEl instanceof SVGSVGElement) {
                const pt = svgEl.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const ctm = svgEl.getScreenCTM();
                if (ctm) {
                    const localPt = pt.matrixTransform(ctm.inverse());
                    setAnchorPoints(prev => {
                        if (prev.length >= 3) {
                            const first = prev[0];
                            const dist = Math.hypot(first.x - localPt.x, first.y - localPt.y);
                            // ViewBox typically 0..2000, threshold of ~20 units to close
                            if (dist < 40) {
                                setIsAnchorClosed(true);
                                return prev;
                            }
                        }
                        return [...prev, { x: localPt.x, y: localPt.y }];
                    });
                }
            }
            return;
        }

        const t = e.target as Element;
        const lot = t.getAttribute?.("data-lot");
        if (lot) {
            setActiveLotNumber(lot);

        }
    };


    // ─── Area formatter with scale factor ────────────────────────────────────
    const formatArea = (u2: number): string => {
        const s = parseFloat(scaleMeters) || 1;
        const m2 = u2 * s * s;
        return s === 1 ? `${u2.toFixed(2)} u²` : `${m2.toFixed(0)} m²`;
    };

    // ─── Dynamic SVG status colors ────────────────────────────────────────────
    const dynamicStyles = lotRecords.map(r =>
        `.blueprint-render path[data-lot="${r.lotNumber}"] { fill: ${ESTADO_FILL[r.estado]} !important; }`
    ).join("\n");

    const activeStyle = activeLotNumber
        ? `.blueprint-render path[data-lot="${activeLotNumber}"] { fill: rgba(249,115,22,0.4) !important; stroke: #f97316 !important; stroke-width: 2 !important; }`
        : "";
    const shouldApplyLotStatusStyles =
        viewMode === "analysis" &&
        (loadedFromDB || lotRecords.some((record) => record.estado !== "DISPONIBLE"));

    // ─── Status count map ─────────────────────────────────────────────────────
    const statusCounts = (Object.keys(ESTADO_CONFIG) as LotEstado[]).reduce((acc, key) => {
        acc[key] = lotRecords.filter(r => r.estado === key).length;
        return acc;
    }, {} as Record<LotEstado, number>);

    const draggingAnchorIndexRef = useRef<number | null>(null);
    const liveAnchorPointsRef = useRef<{ x: number; y: number }[]>([]);

    useEffect(() => {
        liveAnchorPointsRef.current = [...anchorPoints];
    }, [anchorPoints]);

    // Global pointer move/up for dragging anchors
    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (draggingAnchorIndexRef.current === null) return;
            const svgEl = containerRef.current?.querySelector(".blueprint-render svg");
            if (svgEl && svgEl instanceof SVGSVGElement) {
                const pt = svgEl.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const ctm = svgEl.getScreenCTM();
                if (ctm) {
                    const localPt = pt.matrixTransform(ctm.inverse());
                    const i = draggingAnchorIndexRef.current;
                    
                    // Update live ref
                    liveAnchorPointsRef.current[i] = { x: localPt.x, y: localPt.y };
                    
                    // Mutate DOM directly for 60fps smooth drag without React re-renders
                    const group = svgEl.querySelector(".anchor-overlay");
                    if (group) {
                        const circles = group.querySelectorAll("circle");
                        if (circles[i]) {
                            circles[i].setAttribute("cx", localPt.x.toString());
                            circles[i].setAttribute("cy", localPt.y.toString());
                        }
                        const texts = group.querySelectorAll("text");
                        if (texts[i]) {
                            texts[i].setAttribute("x", localPt.x.toString());
                            texts[i].setAttribute("y", (localPt.y + 20).toString());
                        }
                        const poly = group.querySelector("polygon") || group.querySelector("polyline");
                        if (poly) {
                            poly.setAttribute("points", liveAnchorPointsRef.current.map(p => `${p.x},${p.y}`).join(" "));
                        }
                    }
                }
            }
        };
        const handlePointerUp = () => {
            if (draggingAnchorIndexRef.current !== null) {
                // Commit the final position to React state
                setAnchorPoints([...liveAnchorPointsRef.current]);
                draggingAnchorIndexRef.current = null;
            }
        };
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, []);

    useEffect(() => {
        if (!containerRef.current || !svgContent) return;
        const svg = containerRef.current.querySelector(".blueprint-render svg");
        if (!svg) return;

        // Limpiar anclas previas
        svg.querySelectorAll(".anchor-overlay").forEach(el => el.remove());

        if (viewMode === "anchor" && anchorPoints.length > 0) {
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.setAttribute("class", "anchor-overlay");

            if (anchorPoints.length > 1) {
                const poly = document.createElementNS("http://www.w3.org/2000/svg", isAnchorClosed ? "polygon" : "polyline");
                poly.setAttribute("points", anchorPoints.map(p => `${p.x},${p.y}`).join(" "));
                poly.setAttribute("fill", "none");
                poly.setAttribute("stroke", "#06b6d4"); // cyan-500
                poly.setAttribute("stroke-width", "3");
                poly.setAttribute("stroke-dasharray", isAnchorClosed ? "none" : "5 5");
                group.appendChild(poly);
            }

            anchorPoints.forEach((p, i) => {
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", p.x.toString());
                circle.setAttribute("cy", p.y.toString());
                circle.setAttribute("r", "8");
                circle.setAttribute("fill", "#06b6d4");
                circle.setAttribute("stroke", "white");
                circle.setAttribute("stroke-width", "2");
                circle.style.cursor = "move";
                circle.addEventListener("pointerdown", (e) => {
                    e.stopPropagation(); // prevent panning
                    e.preventDefault();
                    draggingAnchorIndexRef.current = i;
                });
                group.appendChild(circle);

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", p.x.toString());
                text.setAttribute("y", (p.y + 20).toString());
                text.setAttribute("fill", "white");
                text.setAttribute("font-size", "14");
                text.setAttribute("font-weight", "bold");
                text.setAttribute("text-anchor", "middle");
                text.style.filter = "drop-shadow(0px 0px 2px rgba(0,0,0,0.8))";
                text.style.pointerEvents = "none";
                text.textContent = (i + 1).toString();
                group.appendChild(text);
            });

            svg.appendChild(group);
        }
    }); // No dependency array: runs after every render to prevent React from wiping out the overlay

    return (
        <div ref={containerRef} className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="bg-brand-500/10 p-1.5 rounded-lg shrink-0"><FileCode className="w-4 h-4 text-brand-500" /></div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-sm leading-none">Procesador de Planos AI</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tight mt-0.5">Carga flexible y detección tolerante</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <input ref={fileInputRef} type="file" className="hidden" accept=".svg,.dxf,.dwg,.pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileUpload} />

                    {/* View mode toggle */}
                    {svgContent && (
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
                            {(["analysis", "blueprint", "anchor"] as const).map(mode => (
                                <button key={mode} onClick={() => setViewMode(mode)}
                                    className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                                        viewMode === mode ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                                    {mode === "analysis" ? <><ScanSearch className="w-3 h-3" />Análisis</> : mode === "blueprint" ? <><Map className="w-3 h-3" />Plano</> : <><Move className="w-3 h-3" />Esquinas</>}
                                </button>
                            ))}
                        </div>
                    )}
                    {viewMode === "anchor" && anchorPoints.length > 0 && (
                        <button onClick={() => setAnchorPoints(prev => prev.slice(0, -1))}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors">
                            <RotateCcw className="w-3 h-3" /> Deshacer ancla
                        </button>
                    )}

                    {/* File name badge */}
                    {file && (
                        <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{file.name}</span>
                        </div>
                    )}

                    {/* DB-loaded badge */}
                    {loadedFromDB && !file && (
                        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Plano guardado</span>
                        </div>
                    )}

                    {/* Upload / Clear */}
                    {svgContent ? (
                        <button onClick={() => setShowDeleteConfirm(true)} className="cursor-pointer bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                            <Trash2 className="w-3 h-3" />Eliminar
                        </button>
                    ) : (
                        <button onClick={() => fileInputRef.current?.click()} className="cursor-pointer bg-brand-500 hover:bg-brand-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1.5">
                            <Upload className="w-3 h-3" />Subir plano
                        </button>
                    )}

                    {/* Scale factor */}
                    {svgContent && (
                        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <Ruler className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-[10px] text-slate-500">1u =</span>
                            <input
                                type="number" min="0.01" step="0.1"
                                value={scaleMeters}
                                onChange={e => setScaleMeters(e.target.value)}
                                className="w-12 text-xs bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 font-semibold"
                            />
                            <span className="text-[10px] text-slate-500">m</span>
                        </div>
                    )}


                    <button
                        onClick={() => setShowPlanGallery(v => !v)}
                        className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                            showPlanGallery
                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500/40")}
                    >
                        <Grid3x3 className="w-3 h-3" />
                        Galeria de planos
                    </button>

                    {/* Help */}
                    <div className="relative group">
                        <button className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                            <HelpCircle className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-9 w-64 bg-slate-900 text-white text-[10px] rounded-xl p-3 shadow-2xl border border-slate-700 leading-relaxed z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                            <p className="font-bold mb-1 text-slate-200">Formatos soportados</p>
                            <p className="text-slate-400 mb-2">DXF, DWG, SVG, PDF e imagenes comunes · Max 50 MB</p>
                            <p className="font-bold mb-1 text-slate-200">El sistema detecta</p>
                            <p className="text-slate-400 mb-2">Detecta lotes cuando el archivo lo permite y, si no, guarda una base visual segura.</p>
                            <p className="font-bold mb-1 text-slate-200">Factor de escala</p>
                            <p className="text-slate-400">Ajusta "1u = X m" para ver areas reales cuando haya poligonos detectados.</p>
                        </div>
                    </div>

                    {/* Summary toggle */}
                    <button
                        onClick={() => setShowSummary(v => !v)}
                        className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                            showSummary
                                ? "bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-500/40")}
                        title="Ver estadísticas del plano"
                    >
                        <Layers className="w-3 h-3" />
                        {showSummary ? "Ocultar panel" : "Ver estadísticas"}
                    </button>

                    {/* Sync */}
                    {(stats || processingReport) && (
                        <button onClick={handleSync} disabled={processing} className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5">
                            <RefreshCw className={cn("w-3 h-3", processing && "animate-spin")} />{extractedPaths.length > 0 ? "Sincronizar" : "Guardar base visual"}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main workspace: viewer + summary panel ──────────────────── */}
            {processingReport && (
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-500/5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{processingReport.message}</p>
                            {processingReport.warnings.length > 0 && (
                                <p className="text-[11px] text-slate-500 mt-1">
                                    {processingReport.warnings.join(" ")}
                                </p>
                            )}
                        </div>
                        {sourcePreviewUrl && (
                            <a
                                href={sourcePreviewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-bold text-brand-500 whitespace-nowrap"
                            >
                                Ver archivo original
                            </a>
                        )}
                    </div>
                </div>
            )}

            {showPlanGallery && (
                <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Galeria de planos</p>
                            <p className="text-xs text-slate-500">Todos los planos cargados en este proyecto quedan disponibles para reutilizarlos.</p>
                        </div>
                        <button
                            onClick={() => setShowPlanGallery(false)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                            Cerrar
                        </button>
                    </div>
                    <PlanGalleryPicker
                        proyectoId={proyectoId}
                        items={planGalleryItems}
                        selectedId={selectedGalleryPlanId}
                        onSelect={applyGalleryPlan}
                        onItemsChange={setPlanGalleryItems}
                        allowUpload={false}
                    />
                </div>
            )}

            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* ── SVG Viewer ──────────────────────────────────────────── */}
                <div
                    className={cn("flex-1 relative overflow-hidden min-h-0 transition-colors duration-200",
                        !svgContent && (isDragging ? "bg-brand-500/10 border-2 border-dashed border-brand-500 cursor-copy" : "bg-slate-100 dark:bg-slate-950 cursor-pointer"),
                        svgContent && (viewMode === "blueprint" ? "bg-white" : "bg-slate-900 dark:bg-slate-950"))}
                    onClick={() => !svgContent && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={handleDrop}
                >
                    {svgContent && (shouldApplyLotStatusStyles || !!activeLotNumber) && (
                        <style dangerouslySetInnerHTML={{ __html: `${shouldApplyLotStatusStyles ? dynamicStyles : ""}\n${activeStyle}` }} />
                    )}
                    {svgContent && (
                        <style>{`.blueprint-render { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; } .blueprint-render svg { max-width: 100%; max-height: 100%; width: auto; height: auto; }`}</style>
                    )}

                    {!svgContent ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none select-none">
                            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center shadow-sm transition-colors", isDragging ? "bg-brand-500/20" : "bg-white dark:bg-slate-900")}>
                                <Upload className={cn("w-9 h-9 transition-colors", isDragging ? "text-brand-500" : "text-slate-300")} />
                            </div>
                            <p className={cn("text-base font-semibold", isDragging ? "text-brand-500" : "text-slate-400")}>
                                {isDragging ? "Soltá para cargar el plano" : "Hacé clic o arrastrá tu plano aquí"}
                            </p>
                            <p className="text-xs text-slate-400">Formatos: DXF, DWG, SVG, PDF e imagenes comunes · Maximo 50 MB</p>
                        </div>
                    ) : sourceKind === "pdf" && sourcePreviewUrl && viewMode === "blueprint" ? (
                        <div className="absolute inset-0 p-4">
                            <iframe
                                src={sourcePreviewUrl}
                                title="Vista PDF del plano"
                                className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
                            />
                        </div>
                    ) : (
                        <TransformWrapper 
                            initialScale={1} 
                            minScale={0.35} 
                            maxScale={6} 
                            centerOnInit 
                            limitToBounds={true}
                            wheel={{ step: 0.001 }}
                        >
                            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
                                <div
                                    className={cn("blueprint-render", viewMode === "blueprint" && "blueprint-mode-raw")}
                                    dangerouslySetInnerHTML={{ __html: svgContent }}
                                    onMouseOver={handleMouseOver}
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeave}
                                    onClick={handleSvgClick}
                                />
                            </TransformComponent>

                            {/* Top-left badges */}
                            <div className="absolute top-3 left-3 z-10 flex gap-2 pointer-events-none">
                                <div className="text-[9px] font-mono text-slate-400 bg-black/40 backdrop-blur-sm px-2 py-1 rounded border border-white/10 flex items-center gap-1">
                                    <Layers className="w-2.5 h-2.5" />{processingReport?.mode === "detected-lots" ? (isDXF ? "DXF Processed" : "SVG Mapping") : `Base ${sourceKind.toUpperCase()}`}
                                </div>
                                {isDXF && <div className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 backdrop-blur-sm px-2 py-1 rounded border border-emerald-500/20">ASCII DXF</div>}
                                {stats && <div className="text-[9px] font-mono text-blue-400 bg-blue-500/10 backdrop-blur-sm px-2 py-1 rounded border border-blue-500/20">{stats.pathsFound} polígonos · {stats.labeled} lotes</div>}
                            </div>

                            {/* Status legend */}
                            {viewMode === "analysis" && lotRecords.length > 0 && (
                                <div className="absolute bottom-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-xl p-2.5 border border-white/10 flex flex-col gap-1">
                                    {(Object.entries(ESTADO_CONFIG) as [LotEstado, typeof ESTADO_CONFIG[LotEstado]][]).map(([key, cfg]) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <div className={cn("w-3 h-3 rounded-sm border", cfg.bg)} />
                                            <span className={cn("text-[9px] font-medium", cfg.color)}>{cfg.label} ({statusCounts[key]})</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <ZoomControls onFullscreen={handleFullscreen} isFullscreen={isFullscreen} />
                        </TransformWrapper>
                    )}

                    {processing && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/70 backdrop-blur-sm z-30 flex items-center justify-center">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                <div className="text-center">
                                    <p className="font-bold text-sm">Escaneando Geometrías...</p>
                                    <p className="text-[10px] text-slate-500">Leyendo lotes, etiquetas y calculando áreas</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Summary Sidebar (colapsable) ─────────────────────────── */}
                {showSummary && <div className="w-56 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumen</p>
                    </div>

                    <div className="p-3 flex flex-col gap-3 flex-1">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-1.5">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[9px] text-slate-500 mb-0.5">Polígonos</p>
                                <p className="text-xl font-bold">{stats?.pathsFound || 0}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[9px] text-slate-500 mb-0.5">Lotes ID</p>
                                <p className="text-xl font-bold text-emerald-500">{stats?.labeled || 0}</p>
                            </div>
                        </div>

                        {/* Status counts */}
                        {lotRecords.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Por Estado</p>
                                {(Object.entries(ESTADO_CONFIG) as [LotEstado, typeof ESTADO_CONFIG[LotEstado]][]).map(([key, cfg]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn("w-2.5 h-2.5 rounded-sm border", cfg.bg)} />
                                            <span className="text-[10px] text-slate-600 dark:text-slate-300">{cfg.label}</span>
                                        </div>
                                        <span className={cn("text-[10px] font-bold", cfg.color)}>{statusCounts[key]}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Hint */}
                        {svgContent && (
                            <div className={cn("p-2.5 rounded-xl border text-[10px] leading-relaxed mt-auto",
                                viewMode === "analysis"
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500")}>
                                {processingReport?.mode !== "detected-lots"
                                    ? "Este archivo quedo como base visual o referencia. Podes guardarlo sin bloquear el proyecto."
                                    : viewMode === "analysis"
                                        ? "Clic en un lote para seleccionarlo. Los colores reflejan el estado comercial."
                                        : "Vista tecnica. Cambia a Analisis para interactuar con los lotes."}
                            </div>
                        )}

                        {!svgContent && (
                            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center py-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <FileCode className="w-5 h-5 text-slate-300" />
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    Carga un plano DXF, DWG, SVG, PDF o imagen para iniciar el procesamiento.
                                </p>
                            </div>
                        )}
                    </div>
                </div>}
            </div>


            {/* ── Tooltip ─────────────────────────────────────────────────── */}
            {tooltip.visible && tooltip.lot && (
                <div className="fixed z-[9999] pointer-events-none" style={{ left: tooltip.x + 14, top: tooltip.y - 56 }}>
                    <div className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 shadow-2xl min-w-[130px]">
                        <p className="text-xs font-bold text-emerald-400">Lote {tooltip.lot}</p>
                        {tooltip.area && (
                            <p className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                                <Ruler className="w-2.5 h-2.5" />{formatArea(parseFloat(tooltip.area))}
                            </p>
                        )}
                        <p className="text-[9px] text-slate-500 mt-1">Clic para seleccionar</p>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .blueprint-render {
                    display: flex; align-items: center; justify-content: center;
                    min-width: 600px; min-height: 400px; padding: 32px;
                }
                .blueprint-render svg { width: 100%; height: auto; display: block; }

                /* Hide original DXF text labels in analysis mode */
                .blueprint-render:not(.blueprint-mode-raw) .dxf-text { display: none; }

                /* Lot polygons: hover + transition */
                .blueprint-render:not(.blueprint-mode-raw) path[data-lot] {
                    cursor: pointer;
                    transition: opacity 0.15s ease, stroke 0.15s ease;
                }
                .blueprint-render:not(.blueprint-mode-raw) path[data-lot]:hover { opacity: 0.75; }

                /* Lot labels: hide in blueprint mode */
                .blueprint-render.blueprint-mode-raw .lot-label { display: none; }

                /* Blueprint mode: clean technical drawing */
                .blueprint-render.blueprint-mode-raw svg { background: white; }
                .blueprint-render.blueprint-mode-raw path,
                .blueprint-render.blueprint-mode-raw polygon { fill: none !important; stroke: #1e293b !important; }
                .blueprint-render.blueprint-mode-raw text { fill: #334155 !important; }
            `}</style>

        {/* Confirmation modal — delete blueprint */}
        {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0 bg-red-100 dark:bg-red-500/10 rounded-full p-2">
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Eliminar plano del proyecto</h3>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Se eliminarán el plano SVG y todos los lotes detectados. Los pasos Masterplan y Mapa Interactivo volverán a estar incompletos.
                            </p>
                            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                                Esta acción no se puede deshacer.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeleting}
                            className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDeleteBlueprint}
                            disabled={isDeleting}
                            className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {isDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            {isDeleting ? "Eliminando…" : "Eliminar plano"}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}


