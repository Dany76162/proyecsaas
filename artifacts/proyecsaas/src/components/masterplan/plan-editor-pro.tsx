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
  icon: React.ComponentType<{ className?: string }>;
};

const TOOLS: Tool[] = [
  { id: "calle", label: "Calle", kind: "POLYLINE", fill: "none", stroke: "#475569", strokeWidth: 6, opacity: 0.9, icon: Route },
  { id: "laguna", label: "Lago", kind: "POLYGON", fill: "#3B82F6", stroke: "#1D4ED8", strokeWidth: 2, opacity: 0.5, icon: Waves },
  { id: "area_verde", label: "Área verde", kind: "POLYGON", fill: "#22C55E", stroke: "#15803D", strokeWidth: 2, opacity: 0.4, icon: TreePine },
  { id: "plaza", label: "Plaza", kind: "POLYGON", fill: "#4ADE80", stroke: "#166534", strokeWidth: 2, opacity: 0.5, icon: Trees },
  { id: "cancha", label: "Cancha", kind: "POLYGON", fill: "#16A34A", stroke: "#14532D", strokeWidth: 2, opacity: 0.6, icon: Goal },
  { id: "amenity", label: "Amenity", kind: "POLYGON", fill: "#D97706", stroke: "#92400E", strokeWidth: 2, opacity: 0.6, icon: Building2 },
  { id: "etiqueta", label: "Etiqueta", kind: "TEXT", fill: "#0f172a", stroke: "#ffffff", strokeWidth: 1, opacity: 1, icon: Tag },
];

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

  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeTool = TOOLS.find((t) => t.id === activeToolId) ?? null;
  const drawing = activeTool !== null;

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

  const finishShape = useCallback(() => {
    if (!activeTool || activeTool.kind === "TEXT") return;
    const min = activeTool.kind === "POLYGON" ? 3 : 2;
    if (draftPoints.length < min) {
      toast.error(`Marcá al menos ${min} puntos.`);
      return;
    }
    setPending({ tool: activeTool, points: draftPoints });
    setNameValue("");
    setDraftPoints([]);
    setCursor(null);
    setActiveToolId(null);
  }, [activeTool, draftPoints]);

  const cancelDraft = useCallback(() => {
    setDraftPoints([]);
    setCursor(null);
    setPending(null);
    setNameValue("");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && drawing && draftPoints.length > 0) finishShape();
      if (e.key === "Escape") {
        cancelDraft();
        setActiveToolId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing, draftPoints.length, finishShape, cancelDraft]);

  const savePending = useCallback(async () => {
    if (!pending) return;
    const name = nameValue.trim();
    if (!name) {
      toast.error("Poné un nombre.");
      return;
    }
    const { tool, points } = pending;
    let geometry: any;
    if (tool.kind === "TEXT") {
      geometry = { x: points[0].x, y: points[0].y, text: name };
    } else {
      geometry = { points };
    }

    setSaving(true);
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
          strokeWidth: tool.strokeWidth,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "No se pudo guardar.");
        return;
      }
      toast.success(`"${name}" agregado.`);
      setPending(null);
      setNameValue("");
      await loadObjects();
    } catch {
      toast.error("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  }, [pending, nameValue, developmentId, loadObjects]);

  const pointsToStr = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

  if (!masterplanSVG) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] -mx-4 -my-5 flex-col items-center justify-center gap-3 bg-slate-100 p-8 text-center sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 dark:bg-slate-950">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Todavía no hay un plano cargado</p>
        <p className="max-w-sm text-xs font-medium text-slate-400">
          Subí el plano del proyecto en el Paso 2 y volvé acá para editarlo.
        </p>
        <Link href={backHref} className="mt-2 inline-flex h-10 items-center rounded-xl bg-slate-900 px-5 text-xs font-bold uppercase tracking-widest text-white">
          Ir a subir el plano
        </Link>
      </div>
    );
  }

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

        {/* Paleta de herramientas */}
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
                onClick={() => { setActiveToolId(tool.id); setDraftPoints([]); setCursor(null); }}
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
        <div className="shrink-0 bg-brand-600 px-4 py-1.5 text-center text-[11px] font-bold text-white">
          {activeTool?.kind === "TEXT"
            ? "Hacé clic donde querés poner la etiqueta."
            : `Dibujando "${activeTool?.label}": clic para marcar puntos · doble clic o Enter para terminar · Esc para cancelar`}
        </div>
      )}

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden">
        <TransformWrapper
          minScale={0.2}
          maxScale={10}
          limitToBounds={false}
          centerOnInit
          panning={{ disabled: drawing }}
          doubleClick={{ disabled: drawing }}
          wheel={{ step: 0.15 }}
        >
          <ZoomControls />
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
            <div className="flex h-full w-full items-center justify-center p-6">
              <div className="relative" style={{ aspectRatio: `${vb.w} / ${vb.h}`, width: "min(100%, 1400px)" }}>
                {/* Plano vivo (lectura) */}
                <div
                  className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: masterplanSVG }}
                />
                {/* Capa de dibujo */}
                <svg
                  ref={svgRef}
                  viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
                  preserveAspectRatio="xMidYMid meet"
                  className={cn("absolute inset-0 h-full w-full", drawing ? "cursor-crosshair" : "pointer-events-none")}
                  onClick={handleCanvasClick}
                  onDoubleClick={(e) => { e.preventDefault(); finishShape(); }}
                  onMouseMove={handleMouseMove}
                >
                  {/* Objetos guardados */}
                  {objects.map((o) => {
                    const fill = o.fillColor ?? "none";
                    const stroke = o.strokeColor ?? "#166534";
                    const sw = o.strokeWidth ?? 2;
                    const op = o.opacity ?? 0.5;
                    if (o.geometryKind === "POLYGON" && o.geometry?.points) {
                      return <polygon key={o.id} points={pointsToStr(o.geometry.points)} fill={fill} stroke={stroke} strokeWidth={sw} fillOpacity={op} />;
                    }
                    if (o.geometryKind === "POLYLINE" && o.geometry?.points) {
                      return <polyline key={o.id} points={pointsToStr(o.geometry.points)} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={op} />;
                    }
                    if (o.geometryKind === "TEXT" && o.geometry) {
                      return (
                        <text key={o.id} x={o.geometry.x} y={o.geometry.y} fontSize={vb.h / 40} fontWeight="700" fill={o.fillColor ?? "#0f172a"} stroke={o.strokeColor ?? "#fff"} strokeWidth={vb.h / 800} paintOrder="stroke">
                          {o.geometry.text}
                        </text>
                      );
                    }
                    if (o.geometryKind === "RECT" && o.geometry) {
                      return <rect key={o.id} x={o.geometry.x} y={o.geometry.y} width={o.geometry.width} height={o.geometry.height} fill={fill} stroke={stroke} strokeWidth={sw} fillOpacity={op} />;
                    }
                    if (o.geometryKind === "CIRCLE" && o.geometry) {
                      return <circle key={o.id} cx={o.geometry.cx} cy={o.geometry.cy} r={o.geometry.r} fill={fill} stroke={stroke} strokeWidth={sw} fillOpacity={op} />;
                    }
                    return null;
                  })}

                  {/* Borrador en curso */}
                  {draftPoints.length > 0 && activeTool && (
                    <>
                      {activeTool.kind === "POLYGON" ? (
                        <polygon
                          points={pointsToStr(cursor ? [...draftPoints, cursor] : draftPoints)}
                          fill={activeTool.fill === "none" ? "rgba(37,99,235,0.15)" : activeTool.fill}
                          fillOpacity={0.3}
                          stroke={activeTool.stroke}
                          strokeWidth={activeTool.strokeWidth}
                          strokeDasharray={`${vb.h / 120} ${vb.h / 120}`}
                        />
                      ) : (
                        <polyline
                          points={pointsToStr(cursor ? [...draftPoints, cursor] : draftPoints)}
                          fill="none"
                          stroke={activeTool.stroke}
                          strokeWidth={activeTool.strokeWidth}
                          strokeDasharray={`${vb.h / 120} ${vb.h / 120}`}
                        />
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

        {/* Tarjeta de nombrado */}
        {pending && (
          <div className="absolute left-1/2 top-5 z-40 w-[320px] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Nombrar {pending.tool.label}
            </p>
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") savePending(); if (e.key === "Escape") cancelDraft(); }}
              placeholder={pending.tool.kind === "TEXT" ? "Texto a mostrar…" : `Ej: ${pending.tool.label} principal`}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={cancelDraft} disabled={saving} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-700">
                <X className="h-3.5 w-3.5" /> Cancelar
              </button>
              <button type="button" onClick={savePending} disabled={saving} className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-4 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Guardar
              </button>
            </div>
          </div>
        )}

        {/* Contador */}
        <div className="absolute left-5 top-5 z-20 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
          {objects.length} objeto{objects.length !== 1 ? "s" : ""} en el plano
        </div>
      </div>
    </div>
  );
}
