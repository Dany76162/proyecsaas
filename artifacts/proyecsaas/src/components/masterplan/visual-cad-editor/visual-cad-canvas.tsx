"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Line as KonvaLine,
  Text as KonvaText,
  Transformer,
} from "react-konva";
import { useCadStore } from "./visual-cad-store";
import { CadShape, CadShapeType } from "./visual-cad-types";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

export default function VisualCadCanvas() {
  const {
    shapes,
    selectedId,
    activeTool,
    zoom,
    pan,
    addShape,
    updateShape,
    setSelectedId,
    setZoom,
    setPan,
  } = useCadStore();

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const shapeRefs = useRef<{ [key: string]: any }>({});
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Handle stage click to add new shapes or deselect
  const handleStageClick = (e: any) => {
    const clickedOnStage = e.target === e.target.getStage();
    const stage = stageRef.current;
    if (!stage) return;

    // Get pointer position relative to stage/zoom/pan
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coordinates to world coordinates (taking zoom & pan into account)
    const worldX = (pointer.x - pan.x) / zoom;
    const worldY = (pointer.y - pan.y) / zoom;

    if (clickedOnStage) {
      if (activeTool === "select") {
        setSelectedId(null);
        return;
      }

      // Add new shape based on active tool
      let newShape: CadShape;
      const id = generateId();

      switch (activeTool) {
        case "rect":
          newShape = {
            id,
            type: "RECT",
            x: worldX - 40,
            y: worldY - 30,
            width: 80,
            height: 60,
            fillColor: "rgba(59, 130, 246, 0.4)",
            strokeColor: "#3b82f6",
            strokeWidth: 2,
            label: `Rectángulo ${shapes.length + 1}`,
          };
          break;

        case "circle":
          newShape = {
            id,
            type: "CIRCLE",
            x: worldX,
            y: worldY,
            radius: 40,
            fillColor: "rgba(16, 185, 129, 0.4)",
            strokeColor: "#10b981",
            strokeWidth: 2,
            label: `Círculo ${shapes.length + 1}`,
          };
          break;

        case "line":
          newShape = {
            id,
            type: "LINE",
            x: worldX,
            y: worldY,
            points: [worldX - 50, worldY - 50, worldX + 50, worldY + 50],
            strokeColor: "#f59e0b",
            strokeWidth: 3,
            label: `Línea ${shapes.length + 1}`,
          };
          break;

        case "text":
          newShape = {
            id,
            type: "TEXT",
            x: worldX,
            y: worldY,
            text: "Etiqueta",
            fontSize: 16,
            fillColor: "#ffffff",
            label: `Texto ${shapes.length + 1}`,
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

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    // Bounded zoom
    const boundedScale = Math.max(0.1, Math.min(newScale, 20));

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

  // Drag shapes
  const handleShapeDragEnd = (id: string, e: any) => {
    const node = e.target;
    updateShape(id, {
      x: node.x(),
      y: node.y(),
    });
  };

  // Transform shapes
  const handleTransformEnd = (id: string, e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale to 1 and update width/height instead (only for RECT/CIRCLE/TEXT)
    node.scaleX(1);
    node.scaleY(1);

    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;

    if (shape.type === "RECT") {
      updateShape(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, (shape.width ?? 10) * scaleX),
        height: Math.max(5, (shape.height ?? 10) * scaleY),
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
      className="relative h-full w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950"
      style={{
        backgroundImage: `
          radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(to right, rgba(255, 255, 255, 0.01) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.01) 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px, 100px 100px, 100px 100px",
      }}
    >
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
        onDragEnd={handleStageDragEnd}
        className="cursor-crosshair active:cursor-grabbing"
      >
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
                  fontSize={shape.fontSize ?? 16}
                  fill={shape.fillColor}
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

            return null;
          })}

          {activeTool === "select" && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit minimum size
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>

      {/* Floating Zoom Display */}
      <div className="absolute bottom-4 right-4 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] font-mono text-slate-400 backdrop-blur-sm">
        Zoom: {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
