export const VISUAL_GEOMETRY_KINDS = [
  "POLYGON",
  "POLYLINE",
  "RECT",
  "CIRCLE",
  "POINT",
  "TEXT",
] as const;

export type VisualGeometryKind = (typeof VISUAL_GEOMETRY_KINDS)[number];

export const VISUAL_COORDINATE_SPACES = [
  "PLAN_VIEWBOX",
  "PLAN_NORMALIZED",
] as const;

export type VisualCoordinateSpace = (typeof VISUAL_COORDINATE_SPACES)[number];

export const VISUAL_VISIBILITIES = [
  "ADMIN_ONLY",
  "PUBLIC",
  "BOTH",
] as const;

export type VisualVisibility = (typeof VISUAL_VISIBILITIES)[number];

export interface VisualPoint {
  x: number;
  y: number;
}

export interface VisualRectGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualCircleGeometry {
  cx: number;
  cy: number;
  r: number;
}

export interface VisualPointGeometry {
  x: number;
  y: number;
}

export interface VisualTextGeometry {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
}

export interface VisualPathGeometry {
  points: VisualPoint[];
}

export type VisualObjectGeometry =
  | VisualRectGeometry
  | VisualCircleGeometry
  | VisualPointGeometry
  | VisualTextGeometry
  | VisualPathGeometry;

export interface DevelopmentVisualObjectDto {
  id: string;
  developmentId: string;
  name: string;
  type: string;
  description: string | null;
  tooltip: string | null;
  geometry: VisualObjectGeometry;
  geometryKind: VisualGeometryKind;
  coordinateSpace: VisualCoordinateSpace;
  fillColor: string | null;
  strokeColor: string | null;
  opacity: number | null;
  strokeWidth: number | null;
  zIndex: number | null;
  visibility: VisualVisibility;
  interactive: boolean;
  locked: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDevelopmentVisualObjectInput {
  name: string;
  type: string;
  description?: string | null;
  tooltip?: string | null;
  geometry: VisualObjectGeometry;
  geometryKind: VisualGeometryKind;
  coordinateSpace?: VisualCoordinateSpace;
  fillColor?: string | null;
  strokeColor?: string | null;
  opacity?: number | null;
  strokeWidth?: number | null;
  zIndex?: number | null;
  visibility?: VisualVisibility;
  interactive?: boolean;
  locked?: boolean;
}

export type UpdateDevelopmentVisualObjectInput =
  Partial<CreateDevelopmentVisualObjectInput>;

export function isVisualGeometryKind(value: unknown): value is VisualGeometryKind {
  return typeof value === "string" && VISUAL_GEOMETRY_KINDS.includes(value as VisualGeometryKind);
}

export function isVisualCoordinateSpace(value: unknown): value is VisualCoordinateSpace {
  return typeof value === "string" && VISUAL_COORDINATE_SPACES.includes(value as VisualCoordinateSpace);
}

export function isVisualVisibility(value: unknown): value is VisualVisibility {
  return typeof value === "string" && VISUAL_VISIBILITIES.includes(value as VisualVisibility);
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPoint(value: unknown): value is VisualPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as VisualPoint;
  return isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

export function isVisualGeometry(
  kind: VisualGeometryKind,
  value: unknown,
): value is VisualObjectGeometry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const geometry = value as Record<string, unknown>;
  if (kind === "RECT") {
    return (
      isFiniteNumber(geometry.x) &&
      isFiniteNumber(geometry.y) &&
      isFiniteNumber(geometry.width) &&
      isFiniteNumber(geometry.height) &&
      geometry.width > 0 &&
      geometry.height > 0
    );
  }

  if (kind === "CIRCLE") {
    return (
      isFiniteNumber(geometry.cx) &&
      isFiniteNumber(geometry.cy) &&
      isFiniteNumber(geometry.r) &&
      geometry.r > 0
    );
  }

  if (kind === "POINT") {
    return isFiniteNumber(geometry.x) && isFiniteNumber(geometry.y);
  }

  if (kind === "TEXT") {
    return (
      isFiniteNumber(geometry.x) &&
      isFiniteNumber(geometry.y) &&
      typeof geometry.text === "string"
    );
  }

  if (kind === "POLYGON" || kind === "POLYLINE") {
    const points = geometry.points;
    if (!Array.isArray(points)) return false;
    const minimum = kind === "POLYGON" ? 3 : 2;
    return points.length >= minimum && points.every(isPoint);
  }

  return false;
}
