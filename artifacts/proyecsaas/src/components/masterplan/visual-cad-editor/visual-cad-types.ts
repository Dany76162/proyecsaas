export type CadShapeType = "RECT" | "CIRCLE" | "LINE" | "TEXT";

export interface CadShape {
  id: string;
  type: CadShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[]; // [x1, y1, x2, y2] for LINE
  text?: string;
  fontSize?: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  label?: string;
  layer?: string; // Maps to semantic type/preset
}

export type CadTool = "select" | "rect" | "circle" | "line" | "text";

export type LocalPresetId = "verde" | "agua" | "amenity" | "calle" | "etiqueta";

export interface CadState {
  shapes: CadShape[];
  selectedId: string | null;
  activeTool: CadTool;
  activePresetId: LocalPresetId;
  zoom: number;
  pan: { x: number; y: number };
  
  // Actions
  setShapes: (shapes: CadShape[]) => void;
  addShape: (shape: CadShape) => void;
  updateShape: (id: string, data: Partial<CadShape>) => void;
  deleteShape: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setActiveTool: (tool: CadTool) => void;
  setActivePresetId: (presetId: LocalPresetId) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;
  clearAll: () => void;
}
