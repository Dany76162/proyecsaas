import { create } from "zustand";
import { CadState, CadShape, CadTool, LocalPresetId } from "./visual-cad-types";

export const useCadStore = create<CadState>((set) => ({
  shapes: [],
  selectedId: null,
  activeTool: "select",
  activePresetId: "verde",
  zoom: 1,
  pan: { x: 0, y: 0 },

  setShapes: (shapes) => set({ shapes }),
  
  addShape: (shape) =>
    set((state) => ({
      shapes: [...state.shapes, shape],
      selectedId: shape.id, // Auto select newly created shape
    })),

  updateShape: (id, data) =>
    set((state) => ({
      shapes: state.shapes.map((s) => (s.id === id ? { ...s, ...data } : s)),
    })),

  deleteShape: (id) =>
    set((state) => ({
      shapes: state.shapes.filter((s) => s.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  setSelectedId: (id) => set({ selectedId: id }),

  setActiveTool: (tool) =>
    set((state) => ({
      activeTool: tool,
      // Clear selection when changing tool to something that draws
      selectedId: tool !== "select" ? null : state.selectedId,
    })),

  setActivePresetId: (presetId) => set({ activePresetId: presetId }),

  setZoom: (zoom) => set({ zoom }),

  setPan: (pan) => set({ pan }),

  resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),

  clearAll: () => set({ shapes: [], selectedId: null, activeTool: "select", activePresetId: "verde" }),
}));
