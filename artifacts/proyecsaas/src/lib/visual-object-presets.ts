// src/lib/visual-object-presets.ts
import type { ComponentType } from "react";
import {
  Map,
  Route,
  Navigation,
  MapPin,
  Footprints,
  Waves,
  TreePine,
  Trees,
  Goal,
  Dumbbell,
  Building2,
  House,
  Shield,
  ParkingCircle,
  Circle,
  Tag
} from "lucide-react";

export type VisualToolPresetId = string;

export type VisualToolPreset = {
  id: VisualToolPresetId; // value stored in `type`
  label: string;
  geometryKind: "RECT" | "POLYLINE" | "TEXT"; // supported kinds
  fillColor?: string; // HEX, optional
  strokeColor?: string; // HEX, optional
  strokeWidth?: number; // in pixels, optional
  opacity?: number; // 0‑1, optional
  icon: ComponentType<{ className?: string }>;
  description?: string;
};

export const VISUAL_TOOL_PRESETS: Record<VisualToolPresetId, VisualToolPreset> = {
  // CALLES
  calle_tierra: {
    id: "calle_tierra",
    label: "Calle de tierra",
    geometryKind: "POLYLINE",
    strokeColor: "#8B5E34", // Marrón tierra
    strokeWidth: 8,
    opacity: 0.9,
    icon: Route,
  },
  calle_asfaltada: {
    id: "calle_asfaltada",
    label: "Calle asfaltada",
    geometryKind: "POLYLINE",
    strokeColor: "#555555", // Gris oscuro
    strokeWidth: 8,
    opacity: 0.9,
    icon: Map,
  },
  avenida: {
    id: "avenida",
    label: "Avenida",
    geometryKind: "POLYLINE",
    strokeColor: "#333333", // Casi negro
    strokeWidth: 12,
    opacity: 0.9,
    icon: Navigation,
  },
  acceso: {
    id: "acceso",
    label: "Acceso",
    geometryKind: "POLYLINE",
    strokeColor: "#F59E0B", // Naranja
    strokeWidth: 6,
    opacity: 0.9,
    icon: MapPin,
  },
  sendero: {
    id: "sendero",
    label: "Sendero",
    geometryKind: "POLYLINE",
    strokeColor: "#65A30D", // Verde claro
    strokeWidth: 4,
    opacity: 0.8,
    icon: Footprints,
  },
  // AGUA
  laguna: {
    id: "laguna",
    label: "Laguna",
    geometryKind: "RECT", // Temporalmente RECT
    fillColor: "#3B82F6", // Azul
    strokeColor: "#1D4ED8", // Azul oscuro
    strokeWidth: 2,
    opacity: 0.7,
    icon: Waves,
  },
  // ÁREAS VERDES / PLAZAS
  area_verde: {
    id: "area_verde",
    label: "Área verde",
    geometryKind: "RECT",
    fillColor: "#22C55E", // Verde
    strokeColor: "#15803D", // Verde oscuro
    strokeWidth: 2,
    opacity: 0.45,
    icon: TreePine,
  },
  plaza: {
    id: "plaza",
    label: "Plaza",
    geometryKind: "RECT",
    fillColor: "#4ADE80", // Verde más claro
    strokeColor: "#166534", // Verde oscuro
    strokeWidth: 2,
    opacity: 0.6,
    icon: Trees,
  },
  // CANCHAS
  cancha_futbol: {
    id: "cancha_futbol",
    label: "Cancha de fútbol",
    geometryKind: "RECT",
    fillColor: "#16A34A", // Verde intenso
    strokeColor: "#14532D", // Verde muy oscuro
    strokeWidth: 2,
    opacity: 0.8,
    icon: Goal,
  },
  cancha_tenis: {
    id: "cancha_tenis",
    label: "Cancha de tenis",
    geometryKind: "RECT",
    fillColor: "#DC2626", // Rojo teja
    strokeColor: "#7F1D1D", // Rojo oscuro
    strokeWidth: 2,
    opacity: 0.8,
    icon: Dumbbell, // Usando Dumbbell a falta de TennisBall
  },
  // AMENITIES
  club_house: {
    id: "club_house",
    label: "Club House",
    geometryKind: "RECT",
    fillColor: "#D97706", // Naranja ámbar
    strokeColor: "#92400E", // Naranja oscuro
    strokeWidth: 2,
    opacity: 0.9,
    icon: Building2,
  },
  sum: {
    id: "sum",
    label: "SUM",
    geometryKind: "RECT",
    fillColor: "#F59E0B", // Naranja
    strokeColor: "#B45309",
    strokeWidth: 2,
    opacity: 0.9,
    icon: House,
  },
  garita: {
    id: "garita",
    label: "Garita",
    geometryKind: "RECT",
    fillColor: "#94A3B8", // Gris azulado
    strokeColor: "#475569", // Gris oscuro
    strokeWidth: 2,
    opacity: 0.9,
    icon: Shield,
  },
  estacionamiento: {
    id: "estacionamiento",
    label: "Estacionamiento",
    geometryKind: "RECT",
    fillColor: "#64748B", // Gris
    strokeColor: "#334155",
    strokeWidth: 2,
    opacity: 0.8,
    icon: ParkingCircle,
  },
  rotonda: {
    id: "rotonda",
    label: "Rotonda",
    geometryKind: "RECT", // Temporalmente RECT
    fillColor: "#E2E8F0", // Gris clarito
    strokeColor: "#94A3B8",
    strokeWidth: 2,
    opacity: 0.9,
    icon: Circle,
  },
  // MISC
  etiqueta: {
    id: "etiqueta",
    label: "Etiqueta Pro",
    geometryKind: "TEXT",
    fillColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 2,
    opacity: 1,
    icon: Tag,
  }
};
