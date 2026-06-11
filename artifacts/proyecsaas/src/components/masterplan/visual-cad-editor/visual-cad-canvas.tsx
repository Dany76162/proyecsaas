"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Line as KonvaLine,
  Text as KonvaText,
  Image as KonvaImage,
  Transformer,
} from "react-konva";
import { useCadStore } from "./visual-cad-store";
import { CadShape } from "./visual-cad-types";

const generateId = () => Math.random().toString(36).substring(2, 9);

interface VisualCadCanvasProps {
  masterplanSVG: string | null;
  loading?: boolean;
}

const PRESET_STYLES = {
  verde: {
    label: "Área Verde",
    fillColor: "rgba(16, 185, 129, 0.22)",
    strokeColor: "#10b981",
    strokeWidth: 2,
    layer: "area-verde",
  },
  agua: {
    label: "Laguna",
    fillColor: "rgba(14, 165, 233, 0.25)",
    strokeColor: "#0ea5e9",
    strokeWidth: 2,
    layer: "laguna",
  },
  amenity: {
    label: "Amenity",
    fillColor: "rgba(249, 115, 22, 0.22)",
    strokeColor: "#f97316",
    strokeWidth: 2,
    layer: "amenity",
  },
  calle: {
    label: "Calle / Lote",
    fillColor: "rgba(100, 116, 139, 0.15)",
    strokeColor: "#94a3b8",
    strokeWidth: 3,
    layer: "calle",
  },
  etiqueta: {
    label: "Etiqueta",
    fillColor: "#f1f5f9",
    strokeColor: "#f1f5f9",
    strokeWidth: 1,
    layer: "etiqueta",
  },
};

export default function VisualCadCanvas({ masterplanSVG, loading = false }: VisualCadCanvasProps) {
  const {
    shapes,
    selectedId,
    activeTool,
    activePresetId,
    zoom,
    pan,
    addShape,
    updateShape,
    setSelectedId,
    setZoom,
    setPan,
    clearAll,
  } = useCadStore();

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const shapeRefs = useRef<{ [key: string]: any }>({});
  const coordsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [svgSize, setSvgSize] = useState({ width: 1000, height: 800 });

  // Clear CAD store shapes on initial mount to start clean
  useEffect(() => {
    clearAll();
  }, [clearAll]);

  // Resize canvas to container
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 500,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Convert raw SVG string to Image blob for Konva rendering and detect natural dimensions
  useEffect(() => {
    if (!masterplanSVG) {
      setImage(null);
      return;
    }

    const blob = new Blob([masterplanSVG], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setImage(img);
      setSvgSize({
        width: img.naturalWidth || 1000,
        height: img.naturalHeight || 800,
      });
    };

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [masterplanSVG]);

  // Auto-center blueprint on load with scale-to-fit aspect preservation
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0 && svgSize.width > 0 && svgSize.height > 0) {
      const scale = Math.min(dimensions.width / svgSize.width, dimensions.height / svgSize.height) * 0.9;
      const panX = (dimensions.width - svgSize.width * scale) / 2;
      const panY = (dimensions.height - svgSize.height * scale) / 2;

      setZoom(scale);
      setPan({ x: panX, y: panY });
    }
  }, [dimensions.width, dimensions.height, svgSize.width, svgSize.height, setZoom, setPan]);

  // Update Transformer nodes when selection changes
  useEffect(() => {
    if (!transformerRef.current) return;

    if (selectedId && shapeRefs.current[selectedId] && activeTool === "select") {
      const selectedNode = shapeRefs.current[selectedId];
      transformerRef.current.nodes([selectedNode]);
      transformerRef.current.getLayer().batchDraw();
    } else {
      transformerRef.current.nodes([]);
    }
  }, [selectedId, activeTool, shapes]);

  // Handle stage mouse move for high-performance coordinate tracking
  const handleMouseMove = (e: any) => {
    const stage = stageRef.current;
    if (!stage || !coordsRef.current) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coordinate to world coordinate
    const worldX = Math.round((pointer.x - pan.x) / zoom);
    const worldY = Math.round((pointer.y - pan.y) / zoom);

    coordsRef.current.textContent = `X: ${worldX}m | Y: ${worldY}m`;
  };

  // Handle stage click to add new shapes or deselect
  const handleStageClick = (e: any) => {
    const clickedOnStage = e.target === e.target.getStage();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    let worldX = (pointer.x - pan.x) / zoom;
    let worldY = (pointer.y - pan.y) / zoom;

    // Snap to grid (20px increments)
    if (snapEnabled) {
      worldX = Math.round(worldX / 20) * 20;
      worldY = Math.round(worldY / 20) * 20;
    }

    if (clickedOnStage) {
      if (activeTool === "select") {
        setSelectedId(null);
        return;
      }

      let newShape: CadShape;
      const id = generateId();
      const currentStyle = PRESET_STYLES[activePresetId] || PRESET_STYLES.verde;

      switch (activeTool) {
        case "rect":
          newShape = {
            id,
            type: "RECT",
            x: worldX - 40,
            y: worldY - 30,
            width: 80,
            height: 60,
            fillColor: currentStyle.fillColor,
            strokeColor: currentStyle.strokeColor,
            strokeWidth: currentStyle.strokeWidth,
            label: `${currentStyle.label} ${shapes.length + 1}`,
            layer: currentStyle.layer,
          };
          break;

        case "circle":
          newShape = {
            id,
            type: "CIRCLE",
            x: worldX,
            y: worldY,
            radius: 40,
            fillColor: currentStyle.fillColor,
            strokeColor: currentStyle.strokeColor,
            strokeWidth: currentStyle.strokeWidth,
            label: `${currentStyle.label} ${shapes.length + 1}`,
            layer: currentStyle.layer,
          };
          break;

        case "line":
          newShape = {
            id,
            type: "LINE",
            x: worldX,
            y: worldY,
            points: [worldX - 60, worldY, worldX + 60, worldY],
            strokeColor: currentStyle.strokeColor,
            strokeWidth: currentStyle.strokeWidth,
            label: `${currentStyle.label} ${shapes.length + 1}`,
            layer: currentStyle.layer,
          };
          break;

        case "text":
          newShape = {
            id,
            type: "TEXT",
            x: worldX,
            y: worldY,
            text: "Etiqueta",
            fontSize: 14,
            fillColor: currentStyle.fillColor,
            label: `${currentStyle.label} ${shapes.length + 1}`,
            layer: currentStyle.layer,
          };
          break;

        default:
          return;
      }

      addShape(newShape);
    }
  };

  // Zoom on wheel
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.15;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const boundedScale = Math.max(0.1, Math.min(newScale, 15));

    setZoom(boundedScale);
    setPan({
      x: pointer.x - mousePointTo.x * boundedScale,
      y: pointer.y - mousePointTo.y * boundedScale,
    });
  };

  // Drag stage to pan
  const handleStageDragEnd = (e: any) => {
    if (e.target === stageRef.current) {
      setPan({ x: e.target.x(), y: e.target.y() });
    }
  };

  // Drag shapes with optional snap
  const handleShapeDragEnd = (id: string, e: any) => {
    const node = e.target;
    let newX = node.x();
    let newY = node.y();

    if (snapEnabled) {
      newX = Math.round(newX / 20) * 20;
      newY = Math.round(newY / 20) * 20;
      node.x(newX);
      node.y(newY);
    }

    updateShape(id, { x: newX, y: newY });
  };

  // Transform shapes
  const handleTransformEnd = (id: string, e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;

    if (shape.type === "RECT") {
      updateShape(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(10, (shape.width ?? 10) * scaleX),
        height: Math.max(10, (shape.height ?? 10) * scaleY),
      });
    } else if (shape.type === "CIRCLE") {
      updateShape(id, {
        x: node.x(),
        y: node.y(),
        radius: Math.max(5, (shape.radius ?? 10) * scaleX),
      });
    } else if (shape.type === "TEXT") {
      updateShape(id, {
        x: node.x(),
        y: node.y(),
        fontSize: Math.max(8, Math.round((shape.fontSize ?? 12) * scaleX)),
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#080d16] shadow-2xl"
    >
      {/* CAD Grid viewport */}
      <div
        className="relative flex-1 min-h-0 w-full overflow-hidden"
        style={{
          backgroundImage: gridEnabled
            ? `
              radial-gradient(circle, rgba(59, 130, 246, 0.08) 1.2px, transparent 1.2px),
              linear-gradient(to right, rgba(59, 130, 246, 0.02) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
            `
            : "none",
          backgroundSize: "20px 20px, 100px 100px, 100px 100px",
          backgroundColor: "#070b12",
        }}
      >
        {/* Dynamic Layer indicators / legends */}
        <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-col gap-1 rounded-lg border border-slate-800/80 bg-slate-950/80 p-2 text-[10px] font-mono shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500/80" />
            <span className="text-slate-400 font-bold">Plano base:</span>
            <span className="text-slate-500">Solo lectura</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-slate-400 font-bold">Capa CAD:</span>
            <span className="text-blue-400/90 font-semibold">Temporal en memoria</span>
          </div>
        </div>

        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          x={pan.x}
          y={pan.y}
          scaleX={zoom}
          scaleY={zoom}
          draggable={activeTool === "select"}
          onClick={handleStageClick}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onDragEnd={handleStageDragEnd}
          className="cursor-crosshair active:cursor-grabbing"
        >
          {/* Layer 1: Read-only background masterplan SVG blueprint */}
          <Layer>
            {image ? (
              <KonvaImage
                image={image}
                x={0}
                y={0}
                width={svgSize.width}
                height={svgSize.height}
                opacity={0.35}
                listening={false} // completely locked
              />
            ) : (
              // Discrete technical placeholder if no blueprint loaded
              <KonvaText
                x={svgSize.width / 2 - 120}
                y={svgSize.height / 2 - 10}
                text={loading ? "CARGANDO PLANO BASE..." : "SIN PLANO BASE DE REFERENCIA"}
                fontSize={12}
                fontFamily="monospace"
                fill="rgba(148, 163, 184, 0.3)"
                align="center"
                listening={false}
              />
            )}
          </Layer>

          {/* Layer 2: Editable user drawing entities on top */}
          <Layer>
            {shapes.map((shape) => {
              const isSelected = shape.id === selectedId;

              if (shape.type === "RECT") {
                return (
                  <Rect
                    key={shape.id}
                    ref={(node) => {
                      if (node) shapeRefs.current[shape.id] = node;
                    }}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width ?? 80}
                    height={shape.height ?? 60}
                    fill={shape.fillColor}
                    stroke={shape.strokeColor}
                    strokeWidth={shape.strokeWidth}
                    draggable={activeTool === "select"}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (activeTool === "select") setSelectedId(shape.id);
                    }}
                    onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                    cornerRadius={2}
                  />
                );
              }

              if (shape.type === "CIRCLE") {
                return (
                  <Circle
                    key={shape.id}
                    ref={(node) => {
                      if (node) shapeRefs.current[shape.id] = node;
                    }}
                    x={shape.x}
                    y={shape.y}
                    radius={shape.radius ?? 40}
                    fill={shape.fillColor}
                    stroke={shape.strokeColor}
                    strokeWidth={shape.strokeWidth}
                    draggable={activeTool === "select"}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (activeTool === "select") setSelectedId(shape.id);
                    }}
                    onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                  />
                );
              }

              if (shape.type === "LINE") {
                return (
                  <KonvaLine
                    key={shape.id}
                    ref={(node) => {
                      if (node) shapeRefs.current[shape.id] = node;
                    }}
                    points={shape.points ?? []}
                    stroke={shape.strokeColor}
                    strokeWidth={shape.strokeWidth}
                    draggable={activeTool === "select"}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (activeTool === "select") setSelectedId(shape.id);
                    }}
                    onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                  />
                );
              }

              if (shape.type === "TEXT") {
                return (
                  <KonvaText
                    key={shape.id}
                    ref={(node) => {
                      if (node) shapeRefs.current[shape.id] = node;
                    }}
                    x={shape.x}
                    y={shape.y}
                    text={shape.text ?? "Texto"}
                    fontSize={shape.fontSize ?? 14}
                    fill={shape.fillColor}
                    draggable={activeTool === "select"}
                    fontFamily="sans-serif"
                    fontStyle="bold"
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (activeTool === "select") setSelectedId(shape.id);
                    }}
                    onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                    onTransformEnd={(e) => handleTransformEnd(shape.id, e)}
                  />
                );
              }

              return null;
            })}

            {activeTool === "select" && (
              <Transformer
                ref={transformerRef}
                borderStroke="#3b82f6"
                anchorStroke="#3b82f6"
                anchorFill="#1e293b"
                anchorSize={8}
                keepRatio={false}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 10 || newBox.height < 10) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            )}
          </Layer>
        </Stage>

        {/* Floating Canvas controls */}
        <div className="absolute right-4 top-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setGridEnabled(!gridEnabled)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-mono backdrop-blur-md transition-all ${
              gridEnabled
                ? "border-blue-500/30 bg-blue-950/70 text-blue-400"
                : "border-slate-800 bg-slate-950/70 text-slate-500 hover:text-slate-300"
            }`}
            title="Alternar Rejilla (GRID)"
          >
            G
          </button>

          <button
            type="button"
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-mono backdrop-blur-md transition-all ${
              snapEnabled
                ? "border-emerald-500/30 bg-emerald-950/70 text-emerald-400"
                : "border-slate-800 bg-slate-950/70 text-slate-500 hover:text-slate-300"
            }`}
            title="Forzar Cursor (SNAP 20m)"
          >
            S
          </button>
        </div>
      </div>

      {/* CAD Status Bar */}
      <div className="flex h-8 w-full items-center justify-between border-t border-slate-800/80 bg-[#060a10] px-4 text-[10px] font-mono text-slate-400">
        <div ref={coordsRef} className="font-semibold text-slate-300">
          X: 0m | Y: 0m
        </div>

        <div className="flex items-center gap-3">
          <span className={snapEnabled ? "text-emerald-400 font-bold" : "text-slate-600"}>
            SNAP ON
          </span>
          <span className="text-slate-700">|</span>
          <span className={gridEnabled ? "text-blue-400 font-bold" : "text-slate-600"}>
            GRID ON
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500">
            ZOOM: {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
