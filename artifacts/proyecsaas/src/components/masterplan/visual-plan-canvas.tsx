"use client";

import { useMemo, useState, useCallback } from "react";

import type {
  DevelopmentVisualObjectDto,
  VisualObjectGeometry,
  VisualRectGeometry,
  VisualTextGeometry,
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

export default function VisualPlanCanvas({
  masterplanSVG,
  objects,
  selectedObjectId,
  activeTool,
  onSelectObject,
  onCreateRect,
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

  // ViewBox dimensions – keep in sync with canvas rendering
  const viewBox = "0 0 1000 800";
  const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = viewBox
    .split(" ")
    .map(Number);

  const sortedObjects = useMemo(
    () => [...objects].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
    [objects],
  );

  const handleCanvasClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool !== "rect") {
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

    onCreateRect({
      x: Math.round(svgPoint.x - 60),
      y: Math.round(svgPoint.y - 35),
      width: 120,
      height: 70,
    });
  };

  // Pointer down on a rectangle – start drag
  const handlePointerDown = (
    event: React.PointerEvent<SVGRectElement>,
    object: DevelopmentVisualObjectDto,
  ) => {
    if (!object.interactive) return;
    const geometry = getRectGeometry(object.geometry);
    if (!geometry) return;
    setDraggingId(object.id);
    setDragStart({
      x: geometry.x,
      y: geometry.y,
      width: geometry.width,
      height: geometry.height,
      clientX: event.clientX,
      clientY: event.clientY,
    });
    event.stopPropagation();
    (event.target as SVGRectElement).setPointerCapture(event.pointerId);
  };

  // While dragging – update temporary visual position
  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingId || !dragStart) return;
    const deltaClientX = event.clientX - dragStart.clientX;
    const deltaClientY = event.clientY - dragStart.clientY;
    // Convert delta from client pixels to viewBox units using SVG matrix scaling
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    const scaleX = matrix?.a ?? 1;
    const scaleY = matrix?.d ?? 1;
    const deltaViewBoxX = deltaClientX / scaleX;
    const deltaViewBoxY = deltaClientY / scaleY;
    const newX = Math.max(
      0,
      Math.min(viewBoxWidth - dragStart.width, dragStart.x + deltaViewBoxX),
    );
    const newY = Math.max(
      0,
      Math.min(viewBoxHeight - dragStart.height, dragStart.y + deltaViewBoxY),
    );
    setTempPositions((prev) => ({
      ...prev,
      [draggingId]: { x: newX, y: newY },
    }));
  };

  // Pointer up – finalize drag and persist via PATCH
  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingId || !dragStart) return;
    (event.target as SVGSVGElement).releasePointerCapture(event.pointerId);
    const deltaClientX = event.clientX - dragStart.clientX;
    const deltaClientY = event.clientY - dragStart.clientY;
    // Convert delta using SVG matrix scaling
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    const scaleX = matrix?.a ?? 1;
    const scaleY = matrix?.d ?? 1;
    const deltaViewBoxX = deltaClientX / scaleX;
    const deltaViewBoxY = deltaClientY / scaleY;
    const newX = Math.max(
      0,
      Math.min(viewBoxWidth - dragStart.width, dragStart.x + deltaViewBoxX),
    );
    const newY = Math.max(
      0,
      Math.min(viewBoxHeight - dragStart.height, dragStart.y + deltaViewBoxY),
    );
    const updatePayload: UpdateDevelopmentVisualObjectInput = {
      geometry: { x: newX, y: newY, width: dragStart.width, height: dragStart.height },
      geometryKind: "RECT",
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

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-b-2xl bg-slate-950">
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
            const temp = tempPositions[object.id];
            const renderX = temp?.x ?? geometry.x;
            const renderY = temp?.y ?? geometry.y;

            return (
              <g
                key={object.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectObject(object.id);
                }}
                onMouseEnter={() => setHoveredObjectId(object.id)}
                onMouseLeave={() => setHoveredObjectId(null)}
                className={object.interactive ? "cursor-pointer" : ""}
              >
                <rect
                  x={renderX}
                  y={renderY}
                  width={geometry.width}
                  height={geometry.height}
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
                />
                {(hovered || selected) && (
                  <text
                    x={renderX + geometry.width / 2}
                    y={renderY - 8}
                    textAnchor="middle"
                    className="pointer-events-none fill-white text-[13px] font-black"
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
            return (
              <text
                key={object.id}
                x={geometry.x}
                y={geometry.y}
                fontSize={geometry.fontSize ?? 18}
                fill={object.fillColor ?? "#e2e8f0"}
                className="cursor-pointer font-black"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectObject(object.id);
                }}
              >
                {geometry.text}
              </text>
            );
          }

          return null;
        })}
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-[11px] font-semibold text-slate-400">
        Coordenadas PLAN_VIEWBOX. Integracion con mapa real queda para Fase 2D.
      </div>
    </div>
  );
}
