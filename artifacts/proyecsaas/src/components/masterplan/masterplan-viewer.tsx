"use client";

import React, { memo, useCallback, useRef, useState, useEffect, useMemo } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { motion, AnimatePresence } from "framer-motion";
import {
    ZoomIn, ZoomOut, Maximize, Maximize2, Minimize2, Filter, Layers as LayersIcon,
    GitCompare, X, FileSpreadsheet, Scissors
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    useMasterplanStore,
    useFilteredUnits,
    MasterplanUnit,
    selectUnits,
} from "@/lib/masterplan-store";
import MasterplanSidePanel from "./masterplan-side-panel";
import MasterplanFilters from "./masterplan-filters";
import MasterplanComparator from "./masterplan-comparator";
import { getProjectBlueprintData } from "@/lib/actions/unidades";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher";

// ─── Zoom wiring component (must live inside TransformWrapper to use useControls) ───
function ZoomButtonWiring({
    zoomInRef,
    zoomOutRef,
    zoomResetRef,
}: {
    zoomInRef: React.RefObject<HTMLButtonElement | null>;
    zoomOutRef: React.RefObject<HTMLButtonElement | null>;
    zoomResetRef: React.RefObject<HTMLButtonElement | null>;
}) {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    useEffect(() => {
        const ziBtn = zoomInRef.current;
        const zoBtn = zoomOutRef.current;
        const zrBtn = zoomResetRef.current;
        const hZi = () => zoomIn(0.15, 200, "easeOut");
        const hZo = () => zoomOut(0.15, 200, "easeOut");
        const hZr = () => resetTransform();
        ziBtn?.addEventListener("click", hZi);
        zoBtn?.addEventListener("click", hZo);
        zrBtn?.addEventListener("click", hZr);
        return () => {
            ziBtn?.removeEventListener("click", hZi);
            zoBtn?.removeEventListener("click", hZo);
            zrBtn?.removeEventListener("click", hZr);
        };
    }, [zoomIn, zoomOut, resetTransform, zoomInRef, zoomOutRef, zoomResetRef]);
    return null;
}

// ─── Status colors ───
const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#facc15",
    RESERVADA: "#f59e0b",
    VENDIDA: "#ef4444",
    SUSPENDIDO: "#64748b",
};

// ─── Stage color palette (up to 5 etapas) ───
const ETAPA_PALETTE = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"] as const;

const STATUS_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADA: "Reservada",
    VENDIDA: "Vendida",
    SUSPENDIDO: "Suspendido",
};

// ─── Division line types ───
type DivisionPoint = { x: number; y: number };
type DivisionLine = { a: DivisionPoint; b: DivisionPoint };

// Extract lot centroid (path bounding-box midpoint fallback)
function getLotCentroid(u: MasterplanUnit): DivisionPoint | null {
    let cx = u.cx;
    let cy = u.cy;
    if (cx == null || cy == null) {
        let path = u.path;
        if (!path && (u as any).coordenadasMasterplan) {
            try { const c = JSON.parse((u as any).coordenadasMasterplan); path = c.path; } catch {}
        }
        if (path) {
            const nums = path.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
            if (nums) {
                let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
                for (let i = 0; i + 1 < nums.length; i += 2) {
                    const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
                    if (!isNaN(x) && !isNaN(y)) {
                        if (x < mnX) mnX = x; if (x > mxX) mxX = x;
                        if (y < mnY) mnY = y; if (y > mxY) mxY = y;
                    }
                }
                if (mnX !== Infinity) { cx = (mnX + mxX) / 2; cy = (mnY + mxY) / 2; }
            }
        }
    }
    if (cx == null || cy == null) return null;
    return { x: cx, y: cy };
}

// Normalize line direction so cross products are consistent
// Guarantees the line always points "rightward or downward"
function normalizeLine(a: DivisionPoint, b: DivisionPoint): [DivisionPoint, DivisionPoint] {
    if (b.x < a.x || (b.x === a.x && b.y < a.y)) return [b, a];
    return [a, b];
}

// Compute zone index for a lot given N division lines.
// With N lines there are N+1 zones (0 … N).
// Zone = number of lines where the lot is on the "positive" (left-of-normalized) side.
function computeLotZone(cx: number, cy: number, lines: DivisionLine[]): number {
    let zone = 0;
    for (const line of lines) {
        const [A, B] = normalizeLine(line.a, line.b);
        const cross = (B.x - A.x) * (cy - A.y) - (B.y - A.y) * (cx - A.x);
        if (cross > 0) zone++;
    }
    return zone;
}

// ─── Tooltip component ───
interface TooltipData {
    x: number;
    y: number;
    unit: MasterplanUnit;
}

const Tooltip = memo(function Tooltip({ data }: { data: TooltipData | null }) {
    if (!data) return null;
    const { unit } = data;
    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 pointer-events-none"
            style={{ left: data.x + 16, top: data.y - 10 }}
        >
            <div className="bg-slate-900/95 backdrop-blur-sm text-white rounded-xl px-3.5 py-2.5 shadow-xl border border-slate-700/50 min-w-[160px]">
                <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">Lote {unit.numero}</span>
                    <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ backgroundColor: `${STATUS_COLORS[unit.estado]}20`, color: STATUS_COLORS[unit.estado] }}
                    >
                        {STATUS_LABELS[unit.estado]}
                    </span>
                </div>
                <div className="space-y-0.5 text-xs text-slate-300">
                    {unit.superficie && (
                        <p>Superficie: <span className="text-white font-medium">{unit.superficie} m²</span></p>
                    )}
                    <p>
                        Precio:{" "}
                        <span className="text-white font-medium">
                            {unit.precio
                                ? `${unit.moneda ?? "USD"} ${unit.precio.toLocaleString("es-AR")}`
                                : "Consultar precio"}
                        </span>
                    </p>
                    {unit.esEsquina && <p className="text-amber-400 font-medium">★ Esquina</p>}
                </div>
            </div>
        </motion.div>
    );
});

// ─── Single Unit polygon ───
const UnitPolygon = memo(function UnitPolygon({
    unit, isFiltered, isSelected, isHovered, isComparing, showLabels, globalFontSize,
    onMouseEnter, onMouseLeave, onClick, onCompareToggle, onTouchLongPress,
    highlightColor,
}: {
    unit: MasterplanUnit;
    isFiltered: boolean;
    isSelected: boolean;
    isHovered: boolean;
    isComparing: boolean;
    showLabels: boolean;
    globalFontSize: number;
    onMouseEnter: (e: React.MouseEvent, unit: MasterplanUnit) => void;
    onMouseLeave: () => void;
    onClick: () => void;
    onCompareToggle: (e: React.MouseEvent) => void;
    onTouchLongPress: () => void;
    highlightColor?: string;
}) {
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleTouchStart = useCallback(() => {
        longPressTimer.current = setTimeout(() => {
            onTouchLongPress();
        }, 500);
    }, [onTouchLongPress]);
    const cancelLongPress = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);
    // Determine geometry from coordenadasMasterplan string
    let path = unit.path;
    let cx = unit.cx;
    let cy = unit.cy;
    let internalId: number | undefined;
    let lotLabel: string | undefined;

    if (!path && (unit as any).coordenadasMasterplan) {
        try {
            const coords = JSON.parse((unit as any).coordenadasMasterplan);
            path = coords.path;
            cx = coords.center?.x;
            cy = coords.center?.y;
            internalId = coords.internalId;
            lotLabel = coords.lotLabel ?? undefined;
        } catch (e) {
            return null;
        }
    }

    if (!path) return null;

    // Parse M/L vertices once: compute BOTH centroid and polygon dimensions for font sizing.
    // Using only uppercase M and L (absolute coords) avoids arc/bezier parameters inflating the box.
    let fontSize = globalFontSize * 0.7; // safe fallback
    let computedCx: number | undefined = cx;
    let computedCy: number | undefined = cy;
    {
        const verts: [number, number][] = [];
        const segments = path.split(/(?=[A-Za-z])/).filter(Boolean);
        for (const seg of segments) {
            const cmd = seg[0];
            if (cmd !== "M" && cmd !== "L") continue;
            const nums = seg.slice(1).match(/-?[\d.]+(?:e[+-]?\d+)?/g);
            if (!nums) continue;
            for (let i = 0; i + 1 < nums.length; i += 2) {
                const px = parseFloat(nums[i]), py = parseFloat(nums[i + 1]);
                if (!isNaN(px) && !isNaN(py)) verts.push([px, py]);
            }
        }
        if (verts.length > 0) {
            const xs = verts.map(v => v[0]);
            const ys = verts.map(v => v[1]);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            // Bounding box center: keeps label at consistent visual height across a row of irregular lots
            computedCx = (minX + maxX) / 2;
            computedCy = (minY + maxY) / 2;
            const pW = maxX - minX;
            const pH = maxY - minY;
            // Use blueprint-utils-style formula — larger coefficients so numbers are readable at default zoom
            fontSize = Math.min(pW * 0.42, pH * 0.54, globalFontSize);
            fontSize = Math.max(fontSize, globalFontSize * 0.20); // floor: always legible
        }
    }

    const fillColor = highlightColor || STATUS_COLORS[unit.estado] || "#94a3b8";
    const opacity = highlightColor ? 0.55 : (isFiltered ? (isHovered ? 0.85 : 0.55) : 0.12);
    // strokeWidth is in SVG user units; vectorEffect="non-scaling-stroke" keeps
    // the rendered width constant in screen pixels at any zoom level.
    const strokeWidth = isSelected ? 1.5 : isComparing ? 1.2 : isHovered ? 1.0 : 0.5;
    const strokeColor = isSelected ? "#fff" : isComparing ? "#6366f1" : isHovered ? "#fff" : "rgba(255,255,255,0.35)";
    const labelText = internalId != null ? String(internalId) : (unit.numero.split("-")[1] || unit.numero);
    // Sanitize unit.id for use as an XML ID (UUIDs contain hyphens — replace with underscores)
    const clipId = `lp_${unit.id.replace(/[^a-zA-Z0-9]/g, "_")}`;

    return (
        <g
            className="cursor-pointer"
            onMouseEnter={(e) => onMouseEnter(e, unit)}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            onContextMenu={(e) => { e.preventDefault(); onCompareToggle(e); }}
            onTouchStart={handleTouchStart}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
        >
            <defs>
                <clipPath id={clipId}>
                    <path d={path} />
                </clipPath>
            </defs>
            <path
                d={path}
                fill={fillColor}
                fillOpacity={opacity}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
                style={{ transition: "fill-opacity 0.2s, stroke 0.2s, fill 0.3s" }}
            />
            {isFiltered && (showLabels || isSelected || isHovered) && computedCx !== undefined && computedCy !== undefined && (
                <text
                    x={computedCx}
                    y={computedCy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fontWeight="700"
                    fill="#fff"
                    fillOpacity={1}
                    stroke="rgba(0,0,0,0.65)"
                    strokeWidth={fontSize * 0.05}
                    paintOrder="stroke"
                    clipPath={`url(#${clipId})`}
                    className="pointer-events-none select-none"
                >
                    {labelText}
                </text>
            )}
            {isComparing && computedCx !== undefined && computedCy !== undefined && (
                <circle cx={computedCx! + fontSize * 2} cy={computedCy! - fontSize * 1.8} r={fontSize * 0.75} fill="#6366f1" stroke="#fff" strokeWidth={fontSize * 0.15} />
            )}
        </g>
    );
});

interface MasterplanViewerProps {
    proyectoId: string;
    modo: "admin" | "public";
    canEdit?: boolean;
    initialUnits?: MasterplanUnit[];
    backgroundAssetUrl?: string | null;
    variant?: "inventory" | "visual-editor";
}

export default function MasterplanViewer({
    proyectoId,
    modo,
    canEdit = false,
    initialUnits = [],
    backgroundAssetUrl = null,
    variant = "inventory",
}: MasterplanViewerProps) {
    const {
        setUnits,
        updateUnitState,
        selectedUnitId, setSelectedUnitId,
        hoveredUnitId, setHoveredUnitId,
        comparisonIds, toggleComparison, clearComparison,
        showComparator, setShowComparator,
        showFilters, setShowFilters,
        layers, toggleLayer,
        zoom, setZoom,
    } = useMasterplanStore();

    const units = useMasterplanStore(selectUnits);
    const filteredUnits = useFilteredUnits();
    const isVisualEditor = variant === "visual-editor";
    const filteredIds = useMemo(
        () => new Set((isVisualEditor ? units : filteredUnits).map((u) => u.id)),
        [filteredUnits, isVisualEditor, units]
    );

    // Only show lot-number labels when zoomed in enough (avoids wall-of-numbers at overview zoom)
    const showLabels = zoom >= 0.8;

    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [showLayers, setShowLayers] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    // ─── Stage division state ───────────────────────────────────────
    const [isDividingStages, setIsDividingStages] = useState(false);
    const [divisionLines, setDivisionLines] = useState<DivisionLine[]>([]);
    const [drawingPointA, setDrawingPointA] = useState<DivisionPoint | null>(null);
    const [mousePos, setMousePos] = useState<DivisionPoint | null>(null);
    const [stageCount, setStageCount] = useState(2); // 2–5 stages
    const [stageNames, setStageNames] = useState<string[]>(["Etapa 1", "Etapa 2"]);
    const [savingDivision, setSavingDivision] = useState(false);
    const [targetStageFilter, setTargetStageFilter] = useState<string>("all");
    // ────────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<"status" | "stage">("status");

    useEffect(() => {
        if (!isVisualEditor) return;
        setSelectedUnitId(null);
        setHoveredUnitId(null);
        setShowFilters(false);
        setShowLayers(false);
        setShowComparator(false);
        clearComparison();
    }, [
        clearComparison,
        isVisualEditor,
        setHoveredUnitId,
        setSelectedUnitId,
        setShowComparator,
        setShowFilters,
    ]);

    const existingStages = useMemo(() => {
        const stages = new Set<string>();
        units.forEach((u) => {
            if (u.etapaNombre) {
                stages.add(u.etapaNombre);
            }
        });
        return Array.from(stages).sort();
    }, [units]);

    const hasUnassignedLots = useMemo(() => {
        return units.some((u) => !u.etapaNombre);
    }, [units]);

    const getNextStageName = useCallback((stages: string[]) => {
        let maxNum = 0;
        stages.forEach(s => {
            const match = s.match(/\d+/);
            if (match) {
                const num = parseInt(match[0]);
                if (num > maxNum) maxNum = num;
            }
        });
        return `Etapa ${maxNum + 1}`;
    }, []);

    const matchesFilter = useCallback((unitStage: string | null | undefined, filter: string) => {
        if (filter === "all") return true;
        if (filter === "unassigned") return !unitStage;
        return unitStage === filter;
    }, []);

    const handleCancelDivision = useCallback(() => {
        setIsDividingStages(false);
        setDivisionLines([]);
        setDrawingPointA(null);
        setMousePos(null);
        setStageCount(2);
        setStageNames(["Etapa 1", "Etapa 2"]);
        setSavingDivision(false);
        setTargetStageFilter("all");
    }, []);

    const getHighlightColor = useCallback((unit: MasterplanUnit): string | undefined => {
        if (!isDividingStages) return undefined;
        if (!matchesFilter(unit.etapaNombre, targetStageFilter)) return undefined;

        // Build the effective line set: committed lines + active preview line
        const allLines: DivisionLine[] = [
            ...divisionLines,
            ...(drawingPointA && mousePos ? [{ a: drawingPointA, b: mousePos }] : []),
        ];
        if (allLines.length === 0) return undefined;

        const centroid = getLotCentroid(unit);
        if (!centroid) return undefined;

        const zone = computeLotZone(centroid.x, centroid.y, allLines);
        return ETAPA_PALETTE[zone % ETAPA_PALETTE.length] ?? "#94a3b8";
    }, [isDividingStages, divisionLines, drawingPointA, mousePos, targetStageFilter, matchesFilter]);

    const handleConfirmDivision = async () => {
        const neededLines = stageCount - 1;
        if (divisionLines.length < neededLines) return;
        setSavingDivision(true);
        try {
            const activeLines = divisionLines.slice(0, neededLines);
            // Group lots by zone index
            const zoneGroups: Record<number, string[]> = {};
            units.forEach(u => {
                if (!matchesFilter(u.etapaNombre, targetStageFilter)) return;
                const centroid = getLotCentroid(u);
                if (!centroid) return;
                const zone = computeLotZone(centroid.x, centroid.y, activeLines);
                if (!zoneGroups[zone]) zoneGroups[zone] = [];
                zoneGroups[zone].push(u.id);
            });

            const divisions = Object.entries(zoneGroups).map(([zoneStr, lotIds]) => {
                const zone = parseInt(zoneStr);
                const stageName = stageNames[zone]?.trim() || `Etapa ${zone + 1}`;
                return { stageName, lotIds };
            });

            const res = await fetch("/api/developments/lots/divide-stages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ developmentId: proyectoId, divisions }),
            });

            if (res.ok) {
                const updatedUnits = units.map(u => {
                    const centroid = getLotCentroid(u);
                    if (!centroid || !matchesFilter(u.etapaNombre, targetStageFilter)) return u;
                    const zone = computeLotZone(centroid.x, centroid.y, activeLines);
                    const stageName = stageNames[zone]?.trim() || `Etapa ${zone + 1}`;
                    const anyU = u as any;
                    return {
                        ...u,
                        etapaNombre: stageName,
                        manzana: { ...anyU.manzana, etapa: { ...anyU.manzana?.etapa, nombre: stageName } },
                    };
                });
                setUnits(updatedUnits as any);
                toast.success(`División en ${stageCount} etapas guardada exitosamente`);
                handleCancelDivision();
            } else {
                toast.error("Error al guardar la división de etapas");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar la división");
        } finally {
            setSavingDivision(false);
        }
    };

    const getStageColor = useCallback((etapaNombre: string | null | undefined): string => {
        if (!etapaNombre) return "#94a3b8";
        const idx = existingStages.indexOf(etapaNombre);
        return ETAPA_PALETTE[idx % ETAPA_PALETTE.length] ?? "#94a3b8";
    }, [existingStages]);

    const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDividingStages) return;
        const maxLines = stageCount - 1;
        if (divisionLines.length >= maxLines && !drawingPointA) return; // all lines placed
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        if (!svgPoint) return;

        if (!drawingPointA) {
            // First click → fix point A
            setDrawingPointA({ x: svgPoint.x, y: svgPoint.y });
        } else {
            // Second click → complete line, add to list
            const newLine: DivisionLine = { a: drawingPointA, b: { x: svgPoint.x, y: svgPoint.y } };
            setDivisionLines(prev => [...prev, newLine]);
            setDrawingPointA(null);
            setMousePos(null);
        }
    }, [isDividingStages, drawingPointA, divisionLines, stageCount]);

    const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDividingStages || !drawingPointA) return;
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        if (svgPoint) {
            setMousePos({ x: svgPoint.x, y: svgPoint.y });
        }
    }, [isDividingStages, drawingPointA]);

    const containerRef = useRef<HTMLDivElement>(null);
    const zoomInRef = useRef<HTMLButtonElement>(null);
    const zoomOutRef = useRef<HTMLButtonElement>(null);
    const zoomResetRef = useRef<HTMLButtonElement>(null);

    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;
        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch { /* fullscreen not supported */ }
    }, []);

    useEffect(() => {
        const onFSChange = () => {
            if (!document.fullscreenElement) setIsFullscreen(false);
        };
        document.addEventListener("fullscreenchange", onFSChange);
        return () => document.removeEventListener("fullscreenchange", onFSChange);
    }, []);

    // Reset zoom to 1 on mount — prevents stale zoom state from a previous session triggering labels at load
    useEffect(() => {
        setZoom(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 1. Fetch real-world business data from DB
    useEffect(() => {
        const fetchProjectUnits = async () => {
            // Priority to initialUnits if provided
            if (initialUnits && initialUnits.length > 0) {
                if (units.length === 0) {
                    setUnits(initialUnits as any);
                }
                setLoading(false);
                return;
            }

            // Only show loading skeleton if we don't have units yet
            // This prevents flicker during background syncs
            if (units.length === 0) {
                setLoading(true);
            }

            const res = await getProjectBlueprintData(proyectoId);
            if (res.success && res.data) {
                setUnits(res.data as any);
            }
            setLoading(false);
        };
        fetchProjectUnits();
    }, [proyectoId, setUnits, initialUnits, units.length]);

    // 2. Implementation of Real-time sync via Pusher
    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(CHANNELS.UNIDADES);

        channel.bind(EVENTS.UNIDAD_STATUS_CHANGED, (data: { id: string; estado: MasterplanUnit["estado"]; proyectoId?: string }) => {
            // Only update if it belongs to this project
            if (!data.proyectoId || data.proyectoId === proyectoId) {
                updateUnitState(data.id, { estado: data.estado });
            }
        });

        return () => {
            pusher.unsubscribe(CHANNELS.UNIDADES);
        };
    }, [proyectoId, updateUnitState]);

    const handleUnitHover = useCallback((e: React.MouseEvent, unit: MasterplanUnit) => {
        if (isVisualEditor) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                unit,
            });
        }
        setHoveredUnitId(unit.id);
    }, [isVisualEditor, setHoveredUnitId]);

    const handleUnitLeave = useCallback(() => {
        setTooltip(null);
        setHoveredUnitId(null);
    }, [setHoveredUnitId]);

    const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;

    // ─── Dynamic viewBox: computed from actual unit geometry ─────────────────
    const svgViewBox = useMemo(() => {
        if (units.length === 0) return "0 0 1000 800";
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const u of units) {
            let path = u.path;
            if (!path && (u as any).coordenadasMasterplan) {
                try {
                    const c = JSON.parse((u as any).coordenadasMasterplan);
                    path = c.path;
                } catch { }
            }
            if (!path) continue;
            const nums = path.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
            if (!nums) continue;
            for (let i = 0; i + 1 < nums.length; i += 2) {
                const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
                if (isNaN(x) || isNaN(y)) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        if (minX === Infinity) return "0 0 1000 800";
        const w = maxX - minX || 1000;
        const h = maxY - minY || 800;
        const pad = Math.max(w, h) * 0.06;
        return `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
    }, [units]);

    // Parse viewBox for use in grid rect
    const vbParts = svgViewBox.split(" ").map(parseFloat);
    const [vbX, vbY, vbW, vbH] = vbParts;
    const globalFontSize = Math.min(vbW, vbH) / 80;

    const handleExportExcel = () => {
        const headers = ["Lote", "Estado", "Superficie", "Precio", "Moneda", "Tipo", "Esquina", "Orientacion", "Manzana", "Etapa"];
        const rows = units.map(u => [
            u.numero,
            u.estado,
            u.superficie || "",
            u.precio || "",
            u.moneda,
            u.tipo,
            u.esEsquina ? "SI" : "NO",
            u.orientacion || "N/A",
            (u as any).manzana?.nombre || "N/A",
            (u as any).manzana?.etapa?.nombre || "N/A"
        ]);

        const csvContent = "\uFEFF" + [
            headers.join(";"),
            ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Inventario-${proyectoId}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && units.length === 0) {
        return (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-500">Sincronizando Masterplan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-b-2xl" ref={containerRef}>
            {/* Top controls */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                {!isVisualEditor && (
                    <>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm transition-all",
                                showFilters
                                    ? "bg-brand-500 text-white"
                                    : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                            )}
                        >
                            <Filter className="w-3.5 h-3.5" />Filtros
                        </button>
                        <button
                            onClick={() => setShowLayers(!showLayers)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm transition-all",
                                showLayers
                                    ? "bg-brand-500 text-white"
                                    : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                            )}
                        >
                            <LayersIcon className="w-3.5 h-3.5" />Capas
                        </button>

                        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />Exportar CSV
                        </button>
                    </>
                )}

                {canEdit && !isVisualEditor && (
                    <>
                        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                        <button
                            id="btn-dividir-etapas"
                            onClick={() => {
                                if (isDividingStages) {
                                    handleCancelDivision();
                                } else {
                                    setIsDividingStages(true);
                                }
                            }}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm transition-all",
                                isDividingStages
                                    ? "bg-orange-500 text-white ring-2 ring-orange-300"
                                    : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                            )}
                        >
                            <Scissors className="w-3.5 h-3.5" />
                            {isDividingStages ? "Cancelar" : "Dividir Etapas"}
                        </button>
                    </>
                )}

                <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                <button ref={zoomInRef} title="Acercar" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button ref={zoomOutRef} title="Alejar" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button ref={zoomResetRef} title="Restablecer zoom" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <Maximize className="w-4 h-4" />
                </button>

                {/* Fullscreen — moved here so it doesn't overlap the side panel close button */}
                <button
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm"
                >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>

            {/* Legend + view toggle */}
            {!isVisualEditor && (
            <div className="absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 space-y-2">
                {/* Toggle */}
                {modo === "admin" && existingStages.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px]">
                        <button
                            onClick={() => setViewMode("status")}
                            className={`px-2 py-0.5 rounded font-bold transition ${viewMode === "status" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Por estado
                        </button>
                        <button
                            onClick={() => setViewMode("stage")}
                            className={`px-2 py-0.5 rounded font-bold transition ${viewMode === "stage" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Por etapa
                        </button>
                    </div>
                )}
                {/* Status legend */}
                {viewMode === "status" && (
                    <div className="flex items-center gap-3">
                        {Object.entries(STATUS_COLORS).map(([key, color]) => (
                            <div key={key} className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 uppercase">{STATUS_LABELS[key]}</span>
                            </div>
                        ))}
                    </div>
                )}
                {/* Stage legend */}
                {viewMode === "stage" && (
                    <div className="flex flex-wrap items-center gap-3">
                        {existingStages.map((stage, idx) => (
                            <div key={stage} className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: ETAPA_PALETTE[idx % ETAPA_PALETTE.length] }} />
                                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{stage}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-slate-400" />
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Sin etapa</span>
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* SVG Canvas with Zoom/Pan */}
            <TransformWrapper
                initialScale={1}
                minScale={0.4}
                maxScale={6}
                limitToBounds={true}
                wheel={{ step: 0.001 }}
                panning={{ velocityDisabled: true }}
                onZoomStop={(ref) => setZoom(ref.state.scale)}
            >
                <ZoomButtonWiring zoomInRef={zoomInRef} zoomOutRef={zoomOutRef} zoomResetRef={zoomResetRef} />
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <svg
                        viewBox={svgViewBox}
                        className="w-full h-full"
                        style={{ minWidth: "min(100%, 600px)", minHeight: "min(100%, 400px)", cursor: isDividingStages ? "crosshair" : "default" }}
                        onClick={handleSvgClick}
                        onMouseMove={handleSvgMouseMove}
                    >
                        <defs>
                            <pattern id="mp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-slate-300 dark:text-slate-700" />
                            </pattern>
                        </defs>
                        {/* Grid covers the full computed viewBox — not a fixed 1000×800 */}
                        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#mp-grid)" />

                        {units.map((unit) => (
                            <UnitPolygon
                                key={unit.id}
                                unit={unit}
                                isFiltered={filteredIds.has(unit.id)}
                                isSelected={selectedUnitId === unit.id}
                                isHovered={hoveredUnitId === unit.id}
                                isComparing={comparisonIds.includes(unit.id)}
                                showLabels={showLabels}
                                globalFontSize={globalFontSize}
                                onMouseEnter={handleUnitHover}
                                onMouseLeave={handleUnitLeave}
                                onClick={() => {
                                    if (!isVisualEditor && !isDividingStages) {
                                        setSelectedUnitId(selectedUnitId === unit.id ? null : unit.id);
                                    }
                                }}
                                onCompareToggle={(e) => {
                                    e.stopPropagation();
                                    if (!isVisualEditor) toggleComparison(unit.id);
                                }}
                                onTouchLongPress={() => {
                                    if (!isVisualEditor) toggleComparison(unit.id);
                                }}
                                highlightColor={
                                    getHighlightColor(unit) ??
                                    (viewMode === "stage" ? getStageColor(unit.etapaNombre) : undefined)
                                }
                            />
                        ))}

                        {/* Division lines — committed + active preview */}
                        {isDividingStages && (() => {
                            const extend = Math.max(vbW, vbH) * 2;
                            const renderLine = (pa: DivisionPoint, pb: DivisionPoint, key: string | number, color: string) => {
                                const dx = pb.x - pa.x, dy = pb.y - pa.y;
                                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                                const x1 = pa.x - (dx / len) * extend;
                                const y1 = pa.y - (dy / len) * extend;
                                const x2 = pa.x + (dx / len) * (len + extend);
                                const y2 = pa.y + (dy / len) * (len + extend);
                                return (
                                    <g key={key}>
                                        <line x1={x1} y1={y1} x2={x2} y2={y2}
                                            stroke={`${color}40`} strokeWidth={globalFontSize * 1.8}
                                            vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                                        <line x1={x1} y1={y1} x2={x2} y2={y2}
                                            stroke={color} strokeWidth={globalFontSize * 0.6}
                                            strokeDasharray={`${globalFontSize * 2} ${globalFontSize * 1}`}
                                            vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                                        <circle cx={pa.x} cy={pa.y} r={globalFontSize * 1.2}
                                            fill={color} stroke="white" strokeWidth={globalFontSize * 0.25}
                                            vectorEffect="non-scaling-stroke" />
                                        <circle cx={pb.x} cy={pb.y} r={globalFontSize * 1.2}
                                            fill={color} stroke="white" strokeWidth={globalFontSize * 0.25}
                                            vectorEffect="non-scaling-stroke" />
                                    </g>
                                );
                            };
                            return (
                                <>
                                    {divisionLines.map((line, i) => renderLine(line.a, line.b, i, "#f97316"))}
                                    {drawingPointA && mousePos && renderLine(drawingPointA, mousePos, "preview", "#fb923c")}
                                    {drawingPointA && !mousePos && (
                                        <circle cx={drawingPointA.x} cy={drawingPointA.y} r={globalFontSize * 1.2}
                                            fill="#f97316" stroke="white" strokeWidth={globalFontSize * 0.25}
                                            vectorEffect="non-scaling-stroke" />
                                    )}
                                </>
                            );
                        })()}
                    </svg>
                </TransformComponent>
            </TransformWrapper>

            {/* Tooltip */}
            <AnimatePresence>
                {!isVisualEditor && !isDividingStages && tooltip && <Tooltip data={tooltip} />}
            </AnimatePresence>

            {/* ─── Stage Division Instruction Banner ─────────────────────────── */}
            <AnimatePresence>
                {isDividingStages && divisionLines.length < stageCount - 1 && (
                    <motion.div
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -40, opacity: 0 }}
                        className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-xl bg-orange-500/95 text-white text-xs font-bold shadow-xl backdrop-blur-sm flex items-center gap-2 pointer-events-none"
                    >
                        <Scissors className="w-3.5 h-3.5 shrink-0" />
                        {!drawingPointA
                            ? `Clic para fijar el Punto A — línea ${divisionLines.length + 1} de ${stageCount - 1}`
                            : `Clic para completar la línea ${divisionLines.length + 1} de ${stageCount - 1}`}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Stage Division Panel ───────────────────────────────────────── */}
            <AnimatePresence>
                {isDividingStages && (() => {
                    const neededLines = stageCount - 1;
                    const linesReady = divisionLines.length >= neededLines;

                    // Compute lot count per zone (only when all lines are drawn)
                    const zoneCounts: Record<number, number> = {};
                    if (linesReady) {
                        const activeLines = divisionLines.slice(0, neededLines);
                        units.forEach(u => {
                            if (!matchesFilter(u.etapaNombre, targetStageFilter)) return;
                            const centroid = getLotCentroid(u);
                            if (!centroid) return;
                            const zone = computeLotZone(centroid.x, centroid.y, activeLines);
                            zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
                        });
                    }

                    const allNamesValid = stageNames.slice(0, stageCount).every(n => n.trim().length > 0);

                    return (
                        <motion.div
                            key="division-panel"
                            initial={{ x: 340, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 340, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 260 }}
                            className="absolute top-14 right-4 z-30 w-[300px] bg-white/97 dark:bg-slate-900/97 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Scissors className="w-4 h-4 text-white" />
                                    <span className="text-white font-bold text-sm">División de Etapas</span>
                                </div>
                                <button onClick={handleCancelDivision} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
                                    <X className="w-3.5 h-3.5 text-white" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Stage count selector */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                                        ¿Cuántas etapas?
                                    </label>
                                    <div className="flex gap-1.5">
                                        {[2, 3, 4, 5].map(n => (
                                            <button
                                                key={n}
                                                onClick={() => {
                                                    setStageCount(n);
                                                    setDivisionLines([]);
                                                    setDrawingPointA(null);
                                                    setMousePos(null);
                                                    setStageNames(Array.from({ length: n }, (_, i) => `Etapa ${i + 1}`));
                                                }}
                                                className={cn(
                                                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border",
                                                    stageCount === n
                                                        ? "bg-orange-500 text-white border-orange-500 shadow"
                                                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300"
                                                )}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Necesitás {neededLines} línea{neededLines !== 1 ? "s" : ""} de corte
                                    </p>
                                </div>

                                {/* Lines progress */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Líneas dibujadas
                                    </label>
                                    <div className="flex gap-1.5">
                                        {Array.from({ length: neededLines }, (_, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "flex-1 h-2 rounded-full transition-all",
                                                    i < divisionLines.length
                                                        ? "bg-orange-500"
                                                        : "bg-slate-200 dark:bg-slate-700"
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <p className={cn(
                                        "text-[10px] mt-1 font-semibold",
                                        linesReady ? "text-emerald-600" : "text-slate-400"
                                    )}>
                                        {linesReady
                                            ? "Listo para confirmar"
                                            : `Dibujá ${neededLines - divisionLines.length} línea${neededLines - divisionLines.length !== 1 ? "s" : ""} más en el plano`}
                                    </p>
                                </div>

                                {/* Filter selector */}
                                {(existingStages.length > 0 || hasUnassignedLots) && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                                            Aplicar a:
                                        </label>
                                        <select
                                            value={targetStageFilter}
                                            onChange={(e) => setTargetStageFilter(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        >
                                            <option value="all">Todo el mapa</option>
                                            {hasUnassignedLots && <option value="unassigned">Sin etapa asignada</option>}
                                            {existingStages.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Stage name inputs */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                                        Nombre de cada etapa
                                    </label>
                                    <div className="space-y-2">
                                        {Array.from({ length: stageCount }, (_, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: ETAPA_PALETTE[i % ETAPA_PALETTE.length] }}
                                                />
                                                <input
                                                    type="text"
                                                    value={stageNames[i] ?? `Etapa ${i + 1}`}
                                                    onChange={(e) => {
                                                        const updated = [...stageNames];
                                                        updated[i] = e.target.value;
                                                        setStageNames(updated);
                                                    }}
                                                    placeholder={`Etapa ${i + 1}`}
                                                    className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                                />
                                                {linesReady && (
                                                    <span className="text-[10px] text-slate-400 shrink-0 w-14 text-right">
                                                        {zoneCounts[i] ?? 0} lotes
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="space-y-2 pt-1">
                                    {divisionLines.length > 0 && (
                                        <button
                                            onClick={() => {
                                                setDivisionLines(prev => prev.slice(0, -1));
                                                setDrawingPointA(null);
                                                setMousePos(null);
                                            }}
                                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                        >
                                            Eliminar última línea
                                        </button>
                                    )}
                                    <button
                                        id="btn-confirmar-division"
                                        onClick={handleConfirmDivision}
                                        disabled={savingDivision || !linesReady || !allNamesValid}
                                        className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    >
                                        {savingDivision ? "Guardando..." : `Confirmar división en ${stageCount} etapas`}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Side Panel */}
            <AnimatePresence>
                {!isVisualEditor && selectedUnit && (
                    <MasterplanSidePanel
                        unit={selectedUnit}
                        modo={modo}
                        canEdit={canEdit}
                        onClose={() => setSelectedUnitId(null)}
                    />
                )}
            </AnimatePresence>

            {/* Filters sidebar */}
            <AnimatePresence>
                {!isVisualEditor && showFilters && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute top-14 left-4 bottom-4 z-20 w-[260px]"
                    >
                        <MasterplanFilters onClose={() => setShowFilters(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Layers panel */}
            <AnimatePresence>
                {!isVisualEditor && showLayers && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={cn(
                            "absolute top-14 bottom-4 z-20 w-[180px]",
                            showFilters ? "left-[280px]" : "left-4"
                        )}
                    >
                        <div className="h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Capas</h4>
                                <button onClick={() => setShowLayers(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <X className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                            </div>
                            <div className="p-3 space-y-1.5">
                                {layers.map((layer) => (
                                    <label key={layer.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={layer.visible}
                                            onChange={() => toggleLayer(layer.id)}
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                        />
                                        <span className="text-sm mr-1">{layer.icon}</span>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{layer.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Compare bar — appears when units are selected for comparison */}
            <AnimatePresence>
                {!isVisualEditor && comparisonIds.length > 0 && (
                    <motion.div
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 60, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/50"
                    >
                        <span className="text-xs text-slate-300 font-medium">
                            {comparisonIds.length} unidad{comparisonIds.length > 1 ? "es" : ""} seleccionada{comparisonIds.length > 1 ? "s" : ""}
                        </span>
                        <button
                            onClick={() => setShowComparator(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all shadow-lg"
                        >
                            <GitCompare className="w-3.5 h-3.5" />
                            Comparar
                        </button>
                        <button
                            onClick={clearComparison}
                            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                            title="Cancelar comparación"
                        >
                            <X className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Comparator modal */}
            <AnimatePresence>
                {!isVisualEditor && showComparator && comparisonIds.length > 0 && (
                    <MasterplanComparator
                        units={units.filter((u) => comparisonIds.includes(u.id))}
                        onClose={() => { clearComparison(); setShowComparator(false); }}
                        onRemove={(id) => toggleComparison(id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
