"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer2,
  Route,
  Waves,
  TreePine,
  Trees,
  Goal,
  Building2,
  Tag,
  Check,
  X,
  Loader2,
  Undo2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { VisualGeometryKind } from "@/types/development-visual-objects";

type PlanEditorProProps = {
  orgSlug: string;
  developmentId: string;
  developmentName: string;
  masterplanSVG: string | null;
};

type Point = { x: number; y: number };

type Tool = {
  id: string;
  label: string;
  kind: Extract<VisualGeometryKind, "POLYGON" | "POLYLINE" | "TEXT">;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  smooth?: boolean;
  /** Si está, el ancho por defecto se calcula como vb.h * widthFactor. */
  widthFactor?: number;
  /** Calles: no piden nombre y la herramienta queda activa para dibujar varias. */
  autoName?: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

const TOOLS: Tool[] = [
  { id: "calle_tierra", label: "Calle de tierra", kind: "POLYLINE", fill: "none", stroke: "#8B5E34", strokeWidth: 6, widthFactor: 0.018, opacity: 1, autoName: true, icon: Route },
  { id: "calle_asfalto", label: "Calle de asfalto", kind: "POLYLINE", fill: "none", stroke: "#6B7280", strokeWidth: 6, widthFactor: 0.018, opacity: 1, autoName: true, icon: Route },
  { id: "laguna", label: "Lago", kind: "POLYGON", fill: "#3B82F6", stroke: "#1D4ED8", strokeWidth: 2, opacity: 0.5, smooth: true, icon: Waves },
  { id: "area_verde", label: "Área verde", kind: "POLYGON", fill: "#22C55E", stroke: "#15803D", strokeWidth: 2, opacity: 0.4, icon: TreePine },
  { id: "plaza", label: "Plaza", kind: "POLYGON", fill: "#4ADE80", stroke: "#166534", strokeWidth: 2, opacity: 0.5, icon: Trees },
  { id: "cancha", label: "Cancha", kind: "POLYGON", fill: "#16A34A", stroke: "#14532D", strokeWidth: 2, opacity: 0.6, icon: Goal },
  { id: "amenity", label: "Amenity", kind: "POLYGON", fill: "#D97706", stroke: "#92400E", strokeWidth: 2, opacity: 0.6, icon: Building2 },
  { id: "etiqueta", label: "Etiqueta", kind: "TEXT", fill: "#0f172a", stroke: "#ffffff", strokeWidth: 1, opacity: 1, icon: Tag },
];

// Color de la "arena"/playa que rodea al lago.
const SAND_COLOR = "#E8D8A0";

type VisualObject = {
  id: string;
  name: string;
  type: string;
  geometryKind: VisualGeometryKind;
  geometry: any;
  fillColor: string | null;
  strokeColor: string | null;
  opacity: number | null;
  strokeWidth: number | null;
};

function parseViewBox(svg: string | null): { x: number; y: number; w: number; h: number } {
  const fallback = { x: 0, y: 0, w: 1000, h: 1000 };
  if (!svg) return fallback;
  const vb = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (vb) {
    const parts = vb[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n)) && parts[2] > 0 && parts[3] > 0) {
      return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    }
  }
  const w = svg.match(/width\s*=\s*["']?([\d.]+)/i);
  const h = svg.match(/height\s*=\s*["']?([\d.]+)/i);
  if (w && h) return { x: 0, y: 0, w: Number(w[1]), h: Number(h[1]) };
  return fallback;
}

const pointsToStr = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

// Curva cerrada suave (Catmull-Rom → Bézier) a través de los puntos.
function smoothClosedPath(points: Point[]): string {
  const n = points.length;
  if (n < 3) return `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
  const at = (i: number) => points[((i % n) + n) % n];
  let d = `M ${at(0).x} ${at(0).y}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return `${d} Z`;
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";
  return (
    <div className="absolute bottom-5 right-5 z-30 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <button type="button" onClick={() => zoomIn()} className={btn} title="Acercar"><ZoomIn className="h-4.5 w-4.5" /></button>
      <button type="button" onClick={() => zoomOut()} className={btn} title="Alejar"><ZoomOut className="h-4.5 w-4.5" /></button>
      <button type="button" onClick={() => resetTransform()} className={btn} title="Centrar"><Maximize2 className="h-4.5 w-4.5" /></button>
    </div>
  );
}

export function PlanEditorPro({ orgSlug, developmentId, developmentName, masterplanSVG }: PlanEditorProProps) {
  const backHref = `/${orgSlug}/developments/${developmentId}?tab=blueprint`;
  const vb = useMemo(() => parseViewBox(masterplanSVG), [masterplanSVG]);

  const [objects, setObjects] = useState<VisualObject[]>([]);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [pending, setPending] = useState<{ tool: Tool; points: Point[] } | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#22c55e");
  const [editWidth, setEditWidth] = useState(2);
  const [drawWidth, setDrawWidth] = useState(8);
  const [busy, setBusy] = useState(false);
  const [editGeometry, setEditGeometry] = useState<Point[] | null>(null);
  const [draggingVertex, setDraggingVertex] = useState<number | null>(null);
  const editGeometryRef = useRef<Point[] | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeTool = TOOLS.find((t) => t.id === activeToolId) ?? null;
  const drawing = activeTool !== null;
  const selectedObject = objects.find((o) => o.id === selectedId) ?? null;

  const loadObjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/developments/${developmentId}/visual-objects`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setObjects(data.objects ?? []);
    } catch {
      /* noop */
    }
  }, [developmentId]);

  useEffect(() => {
    loadObjects();
  }, [loadObjects]);

  useEffect(() => {
    if (selectedObject) {
      setEditName(selectedObject.name);
      setEditColor(
        (selectedObject.geometryKind === "POLYLINE"
          ? selectedObject.strokeColor
          : selectedObject.fillColor) ?? "#22c55e",
      );
      setEditWidth(selectedObject.strokeWidth ?? 2);
    }
  }, [selectedObject]);

  const toSvgPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!activeTool || pending) return;
      const p = toSvgPoint(e.clientX, e.clientY);
      if (!p) return;
      if (activeTool.kind === "TEXT") {
        setPending({ tool: activeTool, points: [p] });
        setNameValue("");
        setActiveToolId(null);
        return;
      }
      setDraftPoints((prev) => [...prev, p]);
    },
    [activeTool, pending, toSvgPoint],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing || draftPoints.length === 0) return;
      const p = toSvgPoint(e.clientX, e.clientY);
      if (p) setCursor(p);
    },
    [drawing, draftPoints.length, toSvgPoint],
  );

  const undoPoint = useCallback(() => setDraftPoints((prev) => prev.slice(0, -1)), []);

  const postObject = useCallback(
    async (tool: Tool, points: Point[], name: string, strokeWidth: number): Promise<boolean> => {
      const geometry = tool.kind === "TEXT" ? { x: points[0].x, y: points[0].y, text: name } : { points };
      try {
        const res = await fetch(`/api/developments/${developmentId}/visual-objects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            type: tool.id,
            geometryKind: tool.kind,
            geometry,
            coordinateSpace: "PLAN_VIEWBOX",
            fillColor: tool.fill === "none" ? null : tool.fill,
            strokeColor: tool.stroke,
            opacity: tool.opacity,
            strokeWidth,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "No se pudo guardar.");
          return false;
        }
        await loadObjects();
        return true;
      } catch {
        toast.error("Error de red al guardar.");
        return false;
      }
    },
    [developmentId, loadObjects],
  );

  const finishShape = useCallback(() => {
    if (!activeTool || activeTool.kind === "TEXT") return;
    const min = activeTool.kind === "POLYGON" ? 3 : 2;
    if (draftPoints.length < min) {
      toast.error(`Marcá al menos ${min} puntos.`);
      return;
    }
    if (activeTool.autoName) {
      const idx = objects.filter((o) => o.type === activeTool.id).length + 1;
      void postObject(activeTool, draftPoints, `${activeTool.label} ${idx}`, drawWidth);
      setDraftPoints([]);
      setCursor(null);
      // La herramienta queda activa para seguir dibujando calles.
      return;
    }
    setPending({ tool: activeTool, points: draftPoints });
    setNameValue("");
    setDraftPoints([]);
    setCursor(null);
    setActiveToolId(null);
  }, [activeTool, draftPoints, objects, postObject, drawWidth]);

  const cancelDraft = useCallback(() => {
    setDraftPoints([]);
    setCursor(null);
    setPending(null);
    setNameValue("");
  }, []);

  const deleteObject = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/developments/${developmentId}/visual-objects/${id}`, { method: "DELETE" });
        if (!res.ok) {
          toast.error("No se pudo borrar.");
          return;
        }
        toast.success("Objeto borrado.");
        setSelectedId(null);
        await loadObjects();
      } catch {
        toast.error("Error de red al borrar.");
      } finally {
        setBusy(false);
      }
    },
    [developmentId, loadObjects],
  );

  const saveEdit = useCallback(async () => {
    if (!selectedObject) return;
    const name = editName.trim();
    if (!name) {
      toast.error("Poné un nombre.");
      return;
    }
    const colorField = selectedObject.geometryKind === "POLYLINE" ? "strokeColor" : "fillColor";
    setBusy(true);
    try {
      const res = await fetch(`/api/developments/${developmentId}/visual-objects/${selectedObject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, [colorField]: editColor, strokeWidth: editWidth }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "No se pudo guardar.");
        return;
      }
      toast.success("Cambios guardados.");
      await loadObjects();
    } catch {
      toast.error("Error de red.");
    } finally {
      setBusy(false);
    }
  }, [selectedObject, editName, editColor, developmentId, loadObjects]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && drawing && draftPoints.length > 0) finishShape();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && drawing && draftPoints.length > 0) {
        e.preventDefault();
        undoPoint();
      }
      if (e.key === "Escape") {
        cancelDraft();
        setActiveToolId(null);
        setSelectedId(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !pending) {
        deleteObject(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing, draftPoints.length, finishShape, cancelDraft, undoPoint, selectedId, pending, deleteObject]);

  const savePending = useCallback(async () => {
    if (!pending) return;
    const name = nameValue.trim();
    if (!name) {
      toast.error("Poné un nombre.");
      return;
    }
    const { tool, points } = pending;
    const strokeWidth = tool.widthFactor ? Math.max(1, Math.round(vb.h * tool.widthFactor)) : tool.strokeWidth;
    setSaving(true);
    const ok = await postObject(tool, points, name, strokeWidth);
    setSaving(false);
    if (ok) {
      toast.success(`"${name}" agregado.`);
      setPending(null);
      setNameValue("");
    }
  }, [pending, nameValue, postObject, vb.h]);

  // Inicializa las manijas de vértices al seleccionar un objeto editable.
  useEffect(() => {
    if (!selectedObject) {
      setEditGeometry(null);
      return;
    }
    if (
      (selectedObject.geometryKind === "POLYGON" || selectedObject.geometryKind === "POLYLINE") &&
      selectedObject.geometry?.points
    ) {
      setEditGeometry(selectedObject.geometry.points.map((p: any) => ({ x: p.x, y: p.y })));
    } else if (selectedObject.geometryKind === "TEXT" && selectedObject.geometry) {
      setEditGeometry([{ x: selectedObject.geometry.x, y: selectedObject.geometry.y }]);
    } else {
      setEditGeometry(null);
    }
  }, [selectedObject]);

  useEffect(() => {
    editGeometryRef.current = editGeometry;
  }, [editGeometry]);

  const persistGeometry = useCallback(
    async (obj: VisualObject, pts: Point[]) => {
      const geometry =
        obj.geometryKind === "TEXT"
          ? { x: pts[0].x, y: pts[0].y, text: obj.geometry?.text ?? "" }
          : { points: pts };
      setObjects((prev) => prev.map((o) => (o.id === obj.id ? { ...o, geometry } : o)));
      try {
        const res = await fetch(`/api/developments/${developmentId}/visual-objects/${obj.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geometry }),
        });
        if (!res.ok) {
          toast.error("No se pudo mover el punto.");
          await loadObjects();
        }
      } catch {
        toast.error("Error de red al mover.");
        await loadObjects();
      }
    },
    [developmentId, loadObjects],
  );

  // Arrastre de un vértice: actualiza en vivo y persiste al soltar.
  useEffect(() => {
    if (draggingVertex === null) return;
    const onMove = (e: PointerEvent) => {
      const p = toSvgPoint(e.clientX, e.clientY);
      if (!p) return;
      setEditGeometry((prev) => (prev ? prev.map((pt, idx) => (idx === draggingVertex ? p : pt)) : prev));
    };
    const onUp = () => {
      setDraggingVertex(null);
      const pts = editGeometryRef.current;
      if (selectedObject && pts) persistGeometry(selectedObject, pts);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingVertex, toSvgPoint, selectedObject, persistGeometry]);

  if (!masterplanSVG) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] -mx-4 -my-5 flex-col items-center justify-center gap-3 bg-slate-100 p-8 text-center sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 dark:bg-slate-950">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Todavía no hay un plano cargado</p>
        <p className="max-w-sm text-xs font-medium text-slate-400">Subí el plano en el Paso 2 y volvé acá para editarlo.</p>
        <Link href={backHref} className="mt-2 inline-flex h-10 items-center rounded-xl bg-slate-900 px-5 text-xs font-bold uppercase tracking-widest text-white">Ir a subir el plano</Link>
      </div>
    );
  }

  const dash = `${vb.h / 120} ${vb.h / 120}`;

  return (
    <div className="flex flex-col overflow-hidden bg-slate-100 h-[calc(100dvh-3.5rem)] -mx-4 -my-5 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 dark:bg-slate-950">
      {/* Toolbar */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href={backHref} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver
          </Link>
          <div className="leading-tight">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">{developmentName}</h1>
            <p className="text-[11px] font-medium text-slate-500">Editor de plano — Pro</p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => { setActiveToolId(null); cancelDraft(); }}
            title="Seleccionar / mover"
            className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition", !activeToolId ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-white dark:hover:bg-slate-700")}
          >
            <MousePointer2 className="h-4 w-4" />
          </button>
          <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-600" />
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const active = activeToolId === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => { setActiveToolId(tool.id); setDraftPoints([]); setCursor(null); setSelectedId(null); if (tool.widthFactor) setDrawWidth(Math.max(1, Math.round(vb.h * tool.widthFactor))); }}
                title={tool.label}
                className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold transition", active ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-white dark:hover:bg-slate-700")}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Hint de dibujo */}
      {drawing && (
        <div className="shrink-0 flex items-center justify-center gap-3 bg-brand-600 px-4 py-1.5 text-center text-[11px] font-bold text-white">
          <span>
            {activeTool?.kind === "TEXT"
              ? "Hacé clic donde querés poner la etiqueta."
              : `"${activeTool?.label}": clic = punto · doble clic / Enter = terminar · Esc = cancelar · no pide nombre`}
          </span>
          {activeTool?.autoName && (
            <label className="flex items-center gap-1.5">
              Ancho
              <input
                type="range"
                min={2}
                max={Math.max(40, Math.round(vb.h * 0.08))}
                value={drawWidth}
                onChange={(e) => setDrawWidth(Number(e.target.value))}
                className="w-28 accent-white"
              />
              <span className="tabular-nums">{Math.round(drawWidth)}</span>
            </label>
          )}
          {draftPoints.length > 0 && activeTool?.kind !== "TEXT" && (
            <button type="button" onClick={undoPoint} className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 hover:bg-white/30">
              <Undo2 className="h-3 w-3" /> Deshacer punto
            </button>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden">
        <TransformWrapper minScale={0.2} maxScale={10} limitToBounds={false} centerOnInit panning={{ disabled: drawing || draggingVertex !== null }} doubleClick={{ disabled: drawing }} wheel={{ step: 0.15 }}>
          <ZoomControls />
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
            <div className="flex h-full w-full items-center justify-center p-6">
              <div className="relative" style={{ aspectRatio: `${vb.w} / ${vb.h}`, width: "min(100%, 1400px)" }}>
                <div className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: masterplanSVG }} />
                <svg
                  ref={svgRef}
                  viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
                  preserveAspectRatio="xMidYMid meet"
                  className={cn("absolute inset-0 h-full w-full", drawing ? "cursor-crosshair" : "pointer-events-none")}
                  onClick={handleCanvasClick}
                  onDoubleClick={(e) => { e.preventDefault(); finishShape(); }}
                  onMouseMove={handleMouseMove}
                >
                  {objects.map((o) => {
                    const fill = o.fillColor ?? "none";
                    const stroke = o.strokeColor ?? "#166534";
                    const sw = o.strokeWidth ?? 2;
                    const op = o.opacity ?? 0.5;
                    const isSel = o.id === selectedId;
                    const selStroke = isSel ? "#2356d9" : stroke;
                    const selSw = isSel ? sw + vb.h / 300 : sw;
                    const pts: Point[] = isSel && editGeometry ? editGeometry : (o.geometry?.points ?? []);
                    const common = {
                      style: { pointerEvents: (drawing ? "none" : "auto") as React.CSSProperties["pointerEvents"], cursor: "pointer" },
                      onPointerDown: (e: React.PointerEvent) => { if (!drawing) { e.stopPropagation(); setSelectedId(o.id); } },
                    };
                    if (o.geometryKind === "POLYGON" && pts.length) {
                      if (o.type === "laguna") {
                        const d = smoothClosedPath(pts);
                        const sandW = Math.max((o.strokeWidth ?? 2) * 2, vb.h / 90);
                        return (
                          <g key={o.id} {...common}>
                            <path d={d} fill="none" stroke={SAND_COLOR} strokeWidth={sandW} strokeLinejoin="round" strokeLinecap="round" />
                            <path d={d} fill={fill} fillOpacity={op} stroke={selStroke} strokeWidth={selSw} />
                          </g>
                        );
                      }
                      return <polygon key={o.id} points={pointsToStr(pts)} fill={fill} stroke={selStroke} strokeWidth={selSw} fillOpacity={op} {...common} />;
                    }
                    if (o.geometryKind === "POLYLINE" && pts.length) {
                      return <polyline key={o.id} points={pointsToStr(pts)} fill="none" stroke={selStroke} strokeWidth={isSel ? editWidth : sw} strokeLinecap="butt" strokeLinejoin="round" opacity={op} {...common} />;
                    }
                    if (o.geometryKind === "TEXT" && o.geometry) {
                      const tx = isSel && editGeometry ? editGeometry[0].x : o.geometry.x;
                      const ty = isSel && editGeometry ? editGeometry[0].y : o.geometry.y;
                      return <text key={o.id} x={tx} y={ty} fontSize={vb.h / 40} fontWeight="700" fill={o.fillColor ?? "#0f172a"} stroke={isSel ? "#2356d9" : (o.strokeColor ?? "#fff")} strokeWidth={vb.h / 800} paintOrder="stroke" {...common}>{o.geometry.text}</text>;
                    }
                    if (o.geometryKind === "RECT" && o.geometry) {
                      return <rect key={o.id} x={o.geometry.x} y={o.geometry.y} width={o.geometry.width} height={o.geometry.height} fill={fill} stroke={selStroke} strokeWidth={selSw} fillOpacity={op} {...common} />;
                    }
                    if (o.geometryKind === "CIRCLE" && o.geometry) {
                      return <circle key={o.id} cx={o.geometry.cx} cy={o.geometry.cy} r={o.geometry.r} fill={fill} stroke={selStroke} strokeWidth={selSw} fillOpacity={op} {...common} />;
                    }
                    return null;
                  })}

                  {/* Manijas de vértices del objeto seleccionado (arrastrables) */}
                  {!drawing && selectedObject && editGeometry && editGeometry.map((p, i) => (
                    <circle
                      key={`handle-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={draggingVertex === i ? vb.h / 110 : vb.h / 140}
                      fill="#ffffff"
                      stroke="#2356d9"
                      strokeWidth={vb.h / 500}
                      style={{ pointerEvents: "auto", cursor: "grab" }}
                      onPointerDown={(e) => { e.stopPropagation(); setDraggingVertex(i); }}
                    />
                  ))}

                  {/* Borrador en curso */}
                  {draftPoints.length > 0 && activeTool && (
                    <>
                      {activeTool.kind === "POLYGON" ? (
                        activeTool.smooth ? (
                          <>
                            <path d={smoothClosedPath(cursor ? [...draftPoints, cursor] : draftPoints)} fill="none" stroke={SAND_COLOR} strokeWidth={Math.max(activeTool.strokeWidth * 2, vb.h / 90)} strokeLinejoin="round" strokeLinecap="round" opacity={0.6} />
                            <path d={smoothClosedPath(cursor ? [...draftPoints, cursor] : draftPoints)} fill={activeTool.fill} fillOpacity={0.3} stroke={activeTool.stroke} strokeWidth={activeTool.strokeWidth} strokeDasharray={dash} />
                          </>
                        ) : (
                          <polygon points={pointsToStr(cursor ? [...draftPoints, cursor] : draftPoints)} fill={activeTool.fill} fillOpacity={0.3} stroke={activeTool.stroke} strokeWidth={activeTool.strokeWidth} strokeDasharray={dash} />
                        )
                      ) : (
                        <polyline points={pointsToStr(cursor ? [...draftPoints, cursor] : draftPoints)} fill="none" stroke={activeTool.stroke} strokeWidth={activeTool.autoName ? drawWidth : (activeTool.widthFactor ? Math.max(1, vb.h * activeTool.widthFactor) : activeTool.strokeWidth)} strokeLinecap="butt" strokeLinejoin="round" opacity={0.85} />
                      )}
                      {draftPoints.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={vb.h / 200} fill="#fff" stroke="#2356d9" strokeWidth={vb.h / 600} />
                      ))}
                    </>
                  )}
                </svg>
              </div>
            </div>
          </TransformComponent>
        </TransformWrapper>

        {/* Tarjeta de nombrado (al crear) */}
        {pending && (
          <div className="absolute left-1/2 top-5 z-40 w-[320px] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nombrar {pending.tool.label}</p>
            <input autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") savePending(); if (e.key === "Escape") cancelDraft(); }} placeholder={pending.tool.kind === "TEXT" ? "Texto a mostrar…" : `Ej: ${pending.tool.label} principal`} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={cancelDraft} disabled={saving} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-700"><X className="h-3.5 w-3.5" /> Cancelar</button>
              <button type="button" onClick={savePending} disabled={saving} className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-4 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Guardar</button>
            </div>
          </div>
        )}

        {/* Inspector (al seleccionar) */}
        {selectedObject && !pending && (
          <div className="absolute right-5 top-5 z-40 w-[280px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Editar objeto</p>
              <button type="button" onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-3 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Nombre</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <label className="mt-3 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Color</label>
            <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700" />
            {selectedObject.geometryKind === "POLYLINE" && (
              <>
                <label className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Ancho de la calle</span>
                  <span className="tabular-nums text-slate-500">{Math.round(editWidth)}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={Math.max(40, Math.round(vb.h * 0.08))}
                  value={editWidth}
                  onChange={(e) => setEditWidth(Number(e.target.value))}
                  className="mt-1 w-full accent-brand-600"
                />
              </>
            )}
            {editGeometry && editGeometry.length > 1 && (
              <p className="mt-3 text-[11px] font-medium leading-relaxed text-slate-400">
                Arrastrá los <span className="font-bold text-brand-600">puntos azules</span> sobre el plano para acomodar las líneas.
              </p>
            )}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button type="button" onClick={() => deleteObject(selectedObject.id)} disabled={busy} className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Borrar</button>
              <button type="button" onClick={saveEdit} disabled={busy} className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-4 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Guardar</button>
            </div>
          </div>
        )}

        {/* Contador / ayuda */}
        <div className="absolute left-5 top-5 z-20 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
          {objects.length} objeto{objects.length !== 1 ? "s" : ""}
          {!drawing && objects.length > 0 ? " · clic para editar/borrar" : ""}
        </div>
      </div>
    </div>
  );
}
