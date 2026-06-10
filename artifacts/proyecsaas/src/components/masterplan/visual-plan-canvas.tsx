"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

import type {
  DevelopmentVisualObjectDto,
  VisualObjectGeometry,
  VisualRectGeometry,
  VisualTextGeometry,
  VisualPathGeometry,
  VisualPoint,
  UpdateDevelopmentVisualObjectInput,
} from "@/types/development-visual-objects";
import type { VisualEditorTool } from "./visual-editor-toolbar";

interface VisualPlanCanvasProps {
  masterplanSVG?: string | null;
  objects: DevelopmentVisualObjectDto[];
  selectedObjectId: string | null;
  activeTool: VisualEditorTool;
  onSelectObject: (objectId: string | null) => void;
  onCreateRect: (geometry: VisualRectGeometry) => void;
  onCreateText: (geometry: VisualTextGeometry) => void;
  onCreatePolyline: (geometry: VisualPathGeometry) => void;
  // New callback to persist geometry updates
  onUpdateObject: (objectId: string, input: UpdateDevelopmentVisualObjectInput) => void;
}

function getRectGeometry(geometry: VisualObjectGeometry): VisualRectGeometry | null {
  if (
    "x" in geometry &&
    "y" in geometry &&
    "width" in geometry &&
    "height" in geometry
  ) {
    return geometry as VisualRectGeometry;
  }
  return null;
}

function getTextGeometry(geometry: VisualObjectGeometry): VisualTextGeometry | null {
  if ("x" in geometry && "y" in geometry && "text" in geometry) {
    return geometry as VisualTextGeometry;
  }
  return null;
}

function getPathGeometry(geometry: VisualObjectGeometry): VisualPathGeometry | null {
  if ("points" in geometry && Array.isArray(geometry.points)) {
    return geometry as VisualPathGeometry;
  }
  return null;
}

function CanvasControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/95 p-1 text-slate-100 shadow-xl">
      <button
        type="button"
        onClick={() => zoomIn(0.25)}
        title="Acercar"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => zoomOut(0.25)}
        title="Alejar"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => resetTransform()}
        title="Restaurar vista"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function VisualPlanCanvas({
  masterplanSVG,
  objects,
  selectedObjectId,
  activeTool,
  onSelectObject,
  onCreateRect,
  onCreateText,
  onCreatePolyline,
  onUpdateObject,
}: VisualPlanCanvasProps) {
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    width: number;
    height: number;
  } | null>(null);
  // Resize state
  const [resizeInfo, setResizeInfo] = useState<
    | { id: string; handle: 'tl' | 'tr' | 'bl' | 'br'; start: { x: number; y: number; width: number; height: number; clientX: number; clientY: number } }
    | null
  >(null);
  const [tempResize, setTempResize] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});

  // ViewBox dimensions – keep in sync with canvas rendering
  const viewBox = "0 0 1000 800";
  const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = viewBox
    .split(" ")
    .map(Number);

  const CANVAS_MARGIN = 200;
  const minX = -CANVAS_MARGIN;
  const maxX = viewBoxWidth + CANVAS_MARGIN;
  const minY = -CANVAS_MARGIN;
  const maxY = viewBoxHeight + CANVAS_MARGIN;

  const [lineStartPoint, setLineStartPoint] = useState<VisualPoint | null>(null);
  const [hoverPoint, setHoverPoint] = useState<VisualPoint | null>(null);

  const sortedObjects = useMemo(
    () => [...objects].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
    [objects],
  );

  const handleCanvasClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool !== "rect" && activeTool !== "text" && activeTool !== "line") {
      onSelectObject(null);
      return;
    }

    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const svgPoint = point.matrixTransform(matrix.inverse());
    const clickedX = Math.round(svgPoint.x);
    const clickedY = Math.round(svgPoint.y);

    if (activeTool === "rect") {
      onCreateRect({
        x: clickedX - 60,
        y: clickedY - 35,
        width: 120,
        height: 70,
      });
    } else if (activeTool === "text") {
      onCreateText({
        x: clickedX,
        y: clickedY,
        text: "Nueva etiqueta",
        fontSize: 24,
      });
    } else if (activeTool === "line") {
      if (!lineStartPoint) {
        setLineStartPoint({ x: clickedX, y: clickedY });
        setHoverPoint({ x: clickedX, y: clickedY });
      } else {
        onCreatePolyline({
          points: [lineStartPoint, { x: clickedX, y: clickedY }],
        });
        setLineStartPoint(null);
        setHoverPoint(null);
      }
    }
  };

  // Pointer down on an object – start drag
  const handlePointerDown = (
    event: React.PointerEvent<SVGElement>,
    object: DevelopmentVisualObjectDto,
  ) => {
    if (!object.interactive) return;

    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    if (object.geometryKind === "RECT") {
      const geometry = getRectGeometry(object.geometry);
      if (!geometry) return;
      startX = geometry.x;
      startY = geometry.y;
      startWidth = geometry.width;
      startHeight = geometry.height;
    } else if (object.geometryKind === "TEXT") {
      const geometry = getTextGeometry(object.geometry);
      if (!geometry) return;
      startX = geometry.x;
      startY = geometry.y;
      startWidth = 0;
      startHeight = 0;
    } else if (object.geometryKind === "POLYLINE") {
      const geometry = getPathGeometry(object.geometry);
      if (!geometry || geometry.points.length === 0) return;
      startX = geometry.points[0].x;
      startY = geometry.points[0].y;
      startWidth = 0;
      startHeight = 0;
    } else {
      return;
    }

    setDraggingId(object.id);
    setDragStart({
      x: startX,
      y: startY,
      width: startWidth,
      height: startHeight,
      clientX: event.clientX,
      clientY: event.clientY,
    });
    event.stopPropagation();
    (event.target as SVGElement).setPointerCapture(event.pointerId);
  };

  // While dragging – update temporary visual position
  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    // If we are drawing a line, update hoverPoint for preview
    if (activeTool === "line" && lineStartPoint) {
      const svg = event.currentTarget;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const matrix = svg.getScreenCTM();
      if (matrix) {
        const svgPoint = point.matrixTransform(matrix.inverse());
        setHoverPoint({ x: Math.round(svgPoint.x), y: Math.round(svgPoint.y) });
      }
    }

    // If we are resizing, handle that first
    if (resizeInfo) {
      const { id, handle, start } = resizeInfo;
      const deltaClientX = event.clientX - start.clientX;
      const deltaClientY = event.clientY - start.clientY;
      const svg = event.currentTarget;
      const matrix = svg.getScreenCTM();
      const scaleX = matrix?.a ?? 1;
      const scaleY = matrix?.d ?? 1;
      const deltaViewBoxX = deltaClientX / scaleX;
      const deltaViewBoxY = deltaClientY / scaleY;
      let newX = start.x;
      let newY = start.y;
      let newWidth = start.width;
      let newHeight = start.height;
      const minSize = 20;
      switch (handle) {
        case 'tl':
          newX = Math.max(minX, start.x + deltaViewBoxX);
          newY = Math.max(minY, start.y + deltaViewBoxY);
          newWidth = Math.max(minSize, start.width - deltaViewBoxX);
          newHeight = Math.max(minSize, start.height - deltaViewBoxY);
          break;
        case 'tr':
          newY = Math.max(minY, start.y + deltaViewBoxY);
          newWidth = Math.max(minSize, start.width + deltaViewBoxX);
          newHeight = Math.max(minSize, start.height - deltaViewBoxY);
          break;
        case 'bl':
          newX = Math.max(minX, start.x + deltaViewBoxX);
          newWidth = Math.max(minSize, start.width - deltaViewBoxX);
          newHeight = Math.max(minSize, start.height + deltaViewBoxY);
          break;
        case 'br':
          newWidth = Math.max(minSize, start.width + deltaViewBoxX);
          newHeight = Math.max(minSize, start.height + deltaViewBoxY);
          break;
      }
      // Clamp to viewBox bounds + margins
      if (newX + newWidth > maxX) newWidth = maxX - newX;
      if (newY + newHeight > maxY) newHeight = maxY - newY;
      setTempResize((prev) => ({
        ...prev,
        [id]: { x: newX, y: newY, width: newWidth, height: newHeight },
      }));
      return;
    }
    // Existing drag handling
    if (!draggingId || !dragStart) return;
    const deltaClientX = event.clientX - dragStart.clientX;
    const deltaClientY = event.clientY - dragStart.clientY;
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    const scaleX = matrix?.a ?? 1;
    const scaleY = matrix?.d ?? 1;
    const deltaViewBoxX = deltaClientX / scaleX;
    const deltaViewBoxY = deltaClientY / scaleY;
    const newX = Math.max(
      minX,
      Math.min(maxX - dragStart.width, dragStart.x + deltaViewBoxX),
    );
    const newY = Math.max(
      minY,
      Math.min(maxY - dragStart.height, dragStart.y + deltaViewBoxY),
    );
    setTempPositions((prev) => ({
      ...prev,
      [draggingId]: { x: newX, y: newY },
    }));
  };

  // Pointer up – finalize drag and persist via PATCH
  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    // If we were resizing, finalize and persist
    if (resizeInfo) {
      const { id } = resizeInfo;
      const final = tempResize[id];
      if (final) {
        const updatePayload: UpdateDevelopmentVisualObjectInput = {
          geometry: { x: final.x, y: final.y, width: final.width, height: final.height },
          geometryKind: "RECT",
          coordinateSpace: "PLAN_VIEWBOX",
        };
        onUpdateObject(id, updatePayload);
      }
      setResizeInfo(null);
      setTempResize((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      return;
    }
    // Existing drag finalization
    if (!draggingId || !dragStart) return;
    (event.target as SVGSVGElement).releasePointerCapture(event.pointerId);
    const deltaClientX = event.clientX - dragStart.clientX;
    const deltaClientY = event.clientY - dragStart.clientY;
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    const scaleX = matrix?.a ?? 1;
    const scaleY = matrix?.d ?? 1;
    const deltaViewBoxX = deltaClientX / scaleX;
    const deltaViewBoxY = deltaClientY / scaleY;
    const newX = Math.max(
      minX,
      Math.min(maxX - dragStart.width, dragStart.x + deltaViewBoxX),
    );
    const newY = Math.max(
      minY,
      Math.min(maxY - dragStart.height, dragStart.y + deltaViewBoxY),
    );

    const draggedObject = objects.find((o) => o.id === draggingId);
    if (!draggedObject) return;

    let finalGeometry: VisualObjectGeometry;
    if (draggedObject.geometryKind === "TEXT") {
      const currentTextGeom = getTextGeometry(draggedObject.geometry);
      finalGeometry = {
        ...currentTextGeom,
        x: newX,
        y: newY,
        text: currentTextGeom?.text ?? "Etiqueta",
      };
    } else if (draggedObject.geometryKind === "POLYLINE") {
      const currentPathGeom = getPathGeometry(draggedObject.geometry);
      if (currentPathGeom) {
        const dx = newX - dragStart.x;
        const dy = newY - dragStart.y;
        finalGeometry = {
          points: currentPathGeom.points.map((p) => ({
            x: Math.round(p.x + dx),
            y: Math.round(p.y + dy),
          })),
        };
      } else {
        return;
      }
    } else {
      finalGeometry = {
        x: newX,
        y: newY,
        width: dragStart.width,
        height: dragStart.height,
      };
    }

    const updatePayload: UpdateDevelopmentVisualObjectInput = {
      geometry: finalGeometry,
      geometryKind: draggedObject.geometryKind,
      coordinateSpace: "PLAN_VIEWBOX",
    };
    onUpdateObject(draggingId, updatePayload);
    setDraggingId(null);
    setDragStart(null);
    setTempPositions((prev) => {
      const { [draggingId]: _, ...rest } = prev;
      return rest;
    });
  };

  // Temporary positions during drag (objectId -> {x,y})
  const [tempPositions, setTempPositions] = useState<Record<string, { x: number; y: number }>>({});
  const didPanRef = useRef(false);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-b-2xl bg-slate-950">
      {activeTool === "line" && (
        <div className="absolute left-3 top-3 rounded-lg bg-brand-500/90 px-3 py-1.5 text-xs font-bold text-white shadow-md z-30">
          {lineStartPoint
            ? "Paso 2: Hacé click en el plano para definir el punto final."
            : "Paso 1: Hacé click en el plano para iniciar la línea."}
        </div>
      )}
      {activeTool === "text" && (
        <div className="absolute left-3 top-3 rounded-lg bg-brand-500/90 px-3 py-1.5 text-xs font-bold text-white shadow-md z-30">
          Hacé click en el plano para crear una etiqueta.
        </div>
      )}
      {activeTool === "rect" && (
        <div className="absolute left-3 top-3 rounded-lg bg-brand-500/90 px-3 py-1.5 text-xs font-bold text-white shadow-md z-30">
          Hacé click en el plano para colocar un rectángulo.
        </div>
      )}

      <TransformWrapper
        initialScale={1}
        minScale={0.35}
        maxScale={6}
        centerOnInit
        limitToBounds={true}
        wheel={{ step: 0.05 }}
        panning={{ excluded: ["interactive-object"] }}
        onPanning={() => {
          didPanRef.current = true;
        }}
        onPanningStop={() => {
          setTimeout(() => {
            didPanRef.current = false;
          }, 50);
        }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: "100%", height: "100%" }}
          wrapperClass="!w-full !h-full"
          contentClass="!w-full !h-full"
        >
          {/* Synchronized container with fixed 1000x800 dimensions matching our viewBox */}
          <div className="relative w-[1000px] h-[800px]">
            {masterplanSVG && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30 [\&_svg]:h-full [\&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: masterplanSVG }}
              />
            )}

            <svg
              viewBox={viewBox}
              className="relative h-full w-full"
              role="img"
              aria-label="Editor visual SVG del plano"
              onClick={handleCanvasClick}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <defs>
                <pattern id="visual-editor-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="0.7" />
                </pattern>
              </defs>

              <rect x="0" y="0" width="1000" height="800" fill="url(#visual-editor-grid)" />

              {sortedObjects.map((object) => {
                const selected = object.id === selectedObjectId;
                const hovered = object.id === hoveredObjectId;

                if (object.geometryKind === "RECT") {
                  const geometry = getRectGeometry(object.geometry);
                  if (!geometry) return null;
                  const tempDrag = tempPositions[object.id];
                  const tempResizeObj = tempResize[object.id];
                  const renderX = tempResizeObj?.x ?? tempDrag?.x ?? geometry.x;
                  const renderY = tempResizeObj?.y ?? tempDrag?.y ?? geometry.y;
                  const renderWidth = tempResizeObj?.width ?? geometry.width;
                  const renderHeight = tempResizeObj?.height ?? geometry.height;

                  return (
                    <g
                      key={object.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectObject(object.id);
                      }}
                      onMouseEnter={() => setHoveredObjectId(object.id)}
                      onMouseLeave={() => setHoveredObjectId(null)}
                      className={cn("interactive-object", object.interactive ? "cursor-pointer" : "")}
                    >
                      <rect
                        x={renderX}
                        y={renderY}
                        width={renderWidth}
                        height={renderHeight}
                        rx="4"
                        fill={object.fillColor ?? "#22c55e"}
                        fillOpacity={object.opacity ?? 0.45}
                        stroke={object.strokeColor ?? "#166534"}
                        strokeWidth={selected ? (object.strokeWidth ?? 2) + 1.5 : object.strokeWidth ?? 2}
                        strokeDasharray={selected ? "8 5" : undefined}
                        vectorEffect="non-scaling-stroke"
                        opacity={draggingId === object.id ? 0.6 : undefined}
                        style={draggingId === object.id ? { cursor: "move" } : undefined}
                        onPointerDown={(e) => handlePointerDown(e, object)}
                        className="interactive-object"
                      />
                      {selected && (
                        <>
                          <rect x={renderX - 4} y={renderY - 4} width={8} height={8} fill="#ffffff" stroke="#0000ff" strokeWidth={1} cursor="nwse-resize" className="interactive-object" onPointerDown={(e) => { e.stopPropagation(); setResizeInfo({ id: object.id, handle: 'tl', start: { x: renderX, y: renderY, width: renderWidth, height: renderHeight, clientX: e.clientX, clientY: e.clientY } }); (e.target as SVGRectElement).setPointerCapture(e.pointerId); }} />
                          <rect x={renderX + renderWidth - 4} y={renderY - 4} width={8} height={8} fill="#ffffff" stroke="#0000ff" strokeWidth={1} cursor="nesw-resize" className="interactive-object" onPointerDown={(e) => { e.stopPropagation(); setResizeInfo({ id: object.id, handle: 'tr', start: { x: renderX, y: renderY, width: renderWidth, height: renderHeight, clientX: e.clientX, clientY: e.clientY } }); (e.target as SVGRectElement).setPointerCapture(e.pointerId); }} />
                          <rect x={renderX - 4} y={renderY + renderHeight - 4} width={8} height={8} fill="#ffffff" stroke="#0000ff" strokeWidth={1} cursor="nesw-resize" className="interactive-object" onPointerDown={(e) => { e.stopPropagation(); setResizeInfo({ id: object.id, handle: 'bl', start: { x: renderX, y: renderY, width: renderWidth, height: renderHeight, clientX: e.clientX, clientY: e.clientY } }); (e.target as SVGRectElement).setPointerCapture(e.pointerId); }} />
                          <rect x={renderX + renderWidth - 4} y={renderY + renderHeight - 4} width={8} height={8} fill="#ffffff" stroke="#0000ff" strokeWidth={1} cursor="nwse-resize" className="interactive-object" onPointerDown={(e) => { e.stopPropagation(); setResizeInfo({ id: object.id, handle: 'br', start: { x: renderX, y: renderY, width: renderWidth, height: renderHeight, clientX: e.clientX, clientY: e.clientY } }); (e.target as SVGRectElement).setPointerCapture(e.pointerId); }} />
                        </>
                      )}
                      {(hovered || selected) && (
                        <text
                          x={renderX + renderWidth / 2}
                          y={renderY - 8}
                          textAnchor="middle"
                          className="pointer-events-none fill-white text-[13px] font-black interactive-object"
                          paintOrder="stroke"
                          stroke="#020617"
                          strokeWidth="3"
                        >
                          {object.tooltip || object.name}
                        </text>
                      )}
                    </g>
                  );
                }

                if (object.geometryKind === "TEXT") {
                  const geometry = getTextGeometry(object.geometry);
                  if (!geometry) return null;

                  const tempDrag = tempPositions[object.id];
                  const renderX = tempDrag?.x ?? geometry.x;
                  const renderY = tempDrag?.y ?? geometry.y;
                  const selected = object.id === selectedObjectId;
                  const hovered = object.id === hoveredObjectId;
                  const fontSize = geometry.fontSize ?? 18;

                  const estCharWidth = fontSize * 0.6;
                  const textWidth = geometry.text.length * estCharWidth;
                  const boxPadding = 6;
                  const boxX = renderX - boxPadding;
                  const boxY = renderY - fontSize;
                  const boxW = textWidth + boxPadding * 2;
                  const boxH = fontSize + boxPadding;

                  return (
                    <g
                      key={object.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectObject(object.id);
                      }}
                      onMouseEnter={() => setHoveredObjectId(object.id)}
                      onMouseLeave={() => setHoveredObjectId(null)}
                      className={cn("interactive-object", object.interactive ? "cursor-pointer" : "")}
                    >
                      {(selected || hovered) && (
                        <rect
                          x={boxX}
                          y={boxY}
                          width={boxW}
                          height={boxH}
                          fill="none"
                          stroke={selected ? "#3b82f6" : "#64748b"}
                          strokeWidth="1.5"
                          strokeDasharray={selected ? "4 3" : "2 2"}
                          rx="4"
                          className="pointer-events-none interactive-object"
                        />
                      )}

                      <text
                        x={renderX}
                        y={renderY}
                        fontSize={fontSize}
                        fill={object.fillColor ?? "#e2e8f0"}
                        fillOpacity={object.opacity ?? 1}
                        stroke={object.strokeColor ?? "#0f172a"}
                        strokeWidth={object.strokeWidth ?? 1.5}
                        paintOrder="stroke"
                        className="select-none font-black interactive-object"
                        style={draggingId === object.id ? { cursor: "move" } : undefined}
                        onPointerDown={(e) => handlePointerDown(e, object)}
                      >
                        {geometry.text}
                      </text>

                      {hovered && (object.tooltip || object.name) && (
                        <text
                          x={renderX}
                          y={boxY - 8}
                          textAnchor="start"
                          className="pointer-events-none fill-white text-[11px] font-black interactive-object"
                          paintOrder="stroke"
                          stroke="#020617"
                          strokeWidth="3"
                        >
                          {object.tooltip || object.name}
                        </text>
                      )}
                    </g>
                  );
                }

                if (object.geometryKind === "POLYLINE") {
                  const geometry = getPathGeometry(object.geometry);
                  if (!geometry || geometry.points.length === 0) return null;

                  const tempDrag = tempPositions[object.id];
                  let renderPoints = geometry.points;
                  if (tempDrag) {
                    const dx = tempDrag.x - geometry.points[0].x;
                    const dy = tempDrag.y - geometry.points[0].y;
                    renderPoints = geometry.points.map((p) => ({
                      x: p.x + dx,
                      y: p.y + dy,
                    }));
                  }

                  const pointsString = renderPoints.map((p) => `${p.x},${p.y}`).join(" ");

                  const xs = renderPoints.map((p) => p.x);
                  const ys = renderPoints.map((p) => p.y);
                  const minXPt = Math.min(...xs);
                  const maxXPt = Math.max(...xs);
                  const minYPt = Math.min(...ys);
                  const maxYPt = Math.max(...ys);
                  const boxPadding = 6;
                  const boxX = minXPt - boxPadding;
                  const boxY = minYPt - boxPadding;
                  const boxW = (maxXPt - minXPt) + boxPadding * 2;
                  const boxH = (maxYPt - minYPt) + boxPadding * 2;

                  return (
                    <g
                      key={object.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectObject(object.id);
                      }}
                      onMouseEnter={() => setHoveredObjectId(object.id)}
                      onMouseLeave={() => setHoveredObjectId(null)}
                      className={cn("interactive-object", object.interactive ? "cursor-pointer" : "")}
                    >
                      {(selected || hovered) && (
                        <rect
                          x={boxX}
                          y={boxY}
                          width={boxW}
                          height={boxH}
                          fill="none"
                          stroke={selected ? "#3b82f6" : "#64748b"}
                          strokeWidth="1.5"
                          strokeDasharray={selected ? "4 3" : "2 2"}
                          rx="4"
                          className="pointer-events-none interactive-object"
                        />
                      )}

                      <polyline
                        points={pointsString}
                        fill="none"
                        stroke={object.strokeColor ?? "#3b82f6"}
                        strokeWidth={object.strokeWidth ?? 8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={object.opacity ?? 0.8}
                        style={draggingId === object.id ? { cursor: "move" } : undefined}
                        onPointerDown={(e) => handlePointerDown(e, object)}
                        className="interactive-object"
                      />

                      {hovered && (object.tooltip || object.name) && (
                        <text
                          x={(minXPt + maxXPt) / 2}
                          y={boxY - 8}
                          textAnchor="middle"
                          className="pointer-events-none fill-white text-[11px] font-black interactive-object"
                          paintOrder="stroke"
                          stroke="#020617"
                          strokeWidth="3"
                        >
                          {object.tooltip || object.name}
                        </text>
                      )}
                    </g>
                  );
                }

                return null;
              })}

              {lineStartPoint && hoverPoint && (
                <line
                  x1={lineStartPoint.x}
                  y1={lineStartPoint.y}
                  x2={hoverPoint.x}
                  y2={hoverPoint.y}
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeDasharray="4 4"
                  opacity="0.7"
                  className="pointer-events-none"
                />
              )}
            </svg>
          </div>
        </TransformComponent>

        <CanvasControls />
      </TransformWrapper>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-[11px] font-semibold text-slate-400 z-30">
        Coordenadas PLAN_VIEWBOX. Integracion con mapa real queda para Fase 2D.
      </div>
    </div>
  );
}
