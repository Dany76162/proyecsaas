"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MasterplanUnit } from "@/lib/masterplan-store";
import type { OverlayCornerAdjustment } from "@/lib/tour-overlay";
import {
  SvgViewBox,
  svgPathToLatLng,
  geoToPitchYaw,
  projectSphericalToScreen,
} from "@/lib/geo-projection";
import earcut from "earcut";

const ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE: "#10b981",
  BLOQUEADO: "#facc15",
  RESERVADA: "#f59e0b",
  VENDIDA: "#ef4444",
  SUSPENDIDO: "#64748b",
};

const HANDLE_R = 8;
const HANDLE_HIT = 18;
const NS = "http://www.w3.org/2000/svg";
const ROT_GAP = 36;

interface ScreenPt {
  x: number;
  y: number;
}

interface Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centX: number;
  centY: number;
}

type DragMode = "translate" | "scale" | "rotate" | "corner" | "edge";

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  startLat: number;
  startLng: number;
  startAlt: number;
  startHdg: number;
  startViewYaw: number;
  startPlanRot: number;
  startPlanScale: number;
  startPlanScaleX: number;
  startPlanScaleY: number;
  startCornerAdjustments: OverlayCornerAdjustment[];
  startAngle: number;
  centX: number;
  centY: number;
  handleIndex?: number;
}

interface LiveDelta {
  latM: number;
  lngM: number;
  scaleFactor: number;
  hdgDelta: number;
  planRotDelta: number;
  cornerAdjustments: OverlayCornerAdjustment[] | null;
  cornersAbsolute: { pitch: number; yaw: number }[] | null;
}

interface FrameData {
  corners: ScreenPt[];
  edgeMidpoints: ScreenPt[];
  centroid: ScreenPt;
  topEdgeMidpoint: ScreenPt;
}

export interface Viewer360LotesOverlayProps {
  viewer: any;
  mode?: "geo-calibrated" | "manual";
  units?: MasterplanUnit[];
  overlayImageUrl?: string;
  overlayBounds?: [[number, number], [number, number]];
  overlayRotation?: number;
  svgViewBox?: SvgViewBox;
  anchorPoints?: { x: number; y: number }[];
  camLat: number;
  camLng: number;
  camAlt: number;
  imageHeading: number;
  latOffset: number;
  lngOffset: number;
  planRotation: number;
  planScale: number;
  planScaleX?: number;
  planScaleY?: number;
  planCornerAdjustments?: OverlayCornerAdjustment[];
  planCornersAbsolute?: { pitch: number; yaw: number }[];
  pitchBias?: number;
  cameraRoll?: number;
  opacity?: number;
  showLabels?: boolean;
  showPerimeter?: boolean;
  showPlanImage?: boolean;
  cleanMode?: boolean;
  transformLocked?: boolean;
  alignmentGuides?: boolean;
  flipX?: boolean;
  flipY?: boolean;
  isEditing: boolean;
  onEnterEdit?: () => void;
  onExitEdit?: () => void;
  onParamsChange?: (p: {
    latOffset?: number;
    lngOffset?: number;
    camAlt?: number;
    imageHeading?: number;
    planRotation?: number;
    planScale?: number;
    planScaleX?: number;
    planScaleY?: number;
    planCornerAdjustments?: OverlayCornerAdjustment[];
    planCornersAbsolute?: { pitch: number; yaw: number }[];
  }) => void;
  onDrawingCountChange?: (count: number) => void;
  drawingPanMode?: boolean;
}

function svgEl(tag: string, attrs: Record<string, string | number>, text?: string) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

function convexHull(pts: ScreenPt[]): ScreenPt[] {
  if (pts.length < 3) return pts;
  const sorted = [...pts].sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));
  const cross = (o: ScreenPt, a: ScreenPt, b: ScreenPt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: ScreenPt[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: ScreenPt[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// ── 3D Homography helpers ──────────────────────────────────────────────────
// Maps plan (nx, ny) → 3D direction → pitch/yaw via least-squares linear fit.
// This gives true perspective projection of a flat terrain onto a sphere.

// N points evenly distributed along the perimeter of the viewbox (used as synthetic anchor fallback)
function getBBoxEquidistantPoints(vx: number, vy: number, vw: number, vh: number, n: number): { x: number; y: number }[] {
  const perim = 2 * (vw + vh);
  const step = perim / n;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    let d = i * step;
    if (d < vw)              { pts.push({ x: vx + d,       y: vy        }); }
    else if (d < vw + vh)   { d -= vw;      pts.push({ x: vx + vw,     y: vy + d      }); }
    else if (d < 2*vw + vh) { d -= vw + vh; pts.push({ x: vx + vw - d, y: vy + vh     }); }
    else                    { d -= 2*vw+vh; pts.push({ x: vx,           y: vy + vh - d }); }
  }
  return pts;
}

function det3x3(m: number[][]): number {
  return m[0][0] * (m[1][1]*m[2][2] - m[1][2]*m[2][1])
       - m[0][1] * (m[1][0]*m[2][2] - m[1][2]*m[2][0])
       + m[0][2] * (m[1][0]*m[2][1] - m[1][1]*m[2][0]);
}

// Returns M (3×3) such that M * [nx, ny, 1]^T ≈ [vx, vy, vz] (unnormalized direction).
// Uses least-squares when N > 3, exact when N == 3.
function computePlanToDir(
  anchorPts: { x: number; y: number }[],
  corners: { pitch: number; yaw: number }[],
  vbX: number, vbY: number, vbW: number, vbH: number
): number[][] | null {
  const N = anchorPts.length;
  if (N < 3 || N !== corners.length) return null;
  const DEG = Math.PI / 180;

  // Accumulate PPT (3×3) = Σ p_i p_i^T  and  VPT (3×3) = Σ v_i p_i^T
  const PPT = [[0,0,0],[0,0,0],[0,0,0]];
  const VPT = [[0,0,0],[0,0,0],[0,0,0]];

  for (let i = 0; i < N; i++) {
    const nx = vbW > 0 ? (anchorPts[i].x - vbX) / vbW : 0;
    const ny = vbH > 0 ? (anchorPts[i].y - vbY) / vbH : 0;
    const ph = corners[i].pitch * DEG;
    const yw = corners[i].yaw   * DEG;
    const p = [nx, ny, 1];
    const v = [Math.cos(ph)*Math.sin(yw), Math.sin(ph), Math.cos(ph)*Math.cos(yw)];
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        PPT[j][k] += p[j] * p[k];
        VPT[j][k] += v[j] * p[k];
      }
    }
  }

  // inv(PPT) via cofactors
  const d = det3x3(PPT);
  if (Math.abs(d) < 1e-14) return null;
  const inv: number[][] = [
    [(PPT[1][1]*PPT[2][2]-PPT[1][2]*PPT[2][1])/d, -(PPT[0][1]*PPT[2][2]-PPT[0][2]*PPT[2][1])/d,  (PPT[0][1]*PPT[1][2]-PPT[0][2]*PPT[1][1])/d],
    [-(PPT[1][0]*PPT[2][2]-PPT[1][2]*PPT[2][0])/d,  (PPT[0][0]*PPT[2][2]-PPT[0][2]*PPT[2][0])/d, -(PPT[0][0]*PPT[1][2]-PPT[0][2]*PPT[1][0])/d],
    [(PPT[1][0]*PPT[2][1]-PPT[1][1]*PPT[2][0])/d, -(PPT[0][0]*PPT[2][1]-PPT[0][1]*PPT[2][0])/d,  (PPT[0][0]*PPT[1][1]-PPT[0][1]*PPT[1][0])/d],
  ];

  // M = VPT × inv(PPT)
  const M: number[][] = [[0,0,0],[0,0,0],[0,0,0]];
  for (let j = 0; j < 3; j++)
    for (let k = 0; k < 3; k++)
      for (let l = 0; l < 3; l++)
        M[j][k] += VPT[j][l] * inv[l][k];

  return M;
}

function pointInPolygon(pt: ScreenPt, poly: ScreenPt[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function edgeMidpoints(points: ScreenPt[]): ScreenPt[] {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
  });
}

function averagePoint(points: ScreenPt[]): ScreenPt {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function rotatePoint(point: ScreenPt, angle: number): ScreenPt {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

function inverseRotatePoint(point: ScreenPt, angle: number): ScreenPt {
  return rotatePoint(point, -angle);
}

function computeFrameFromHull(hull: ScreenPt[]): FrameData | null {
  if (hull.length < 3) return null;

  let bestArea = Infinity;
  let bestAngle = 0;
  let bestBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  for (let i = 0; i < hull.length; i++) {
    const current = hull[i];
    const next = hull[(i + 1) % hull.length];
    const angle = Math.atan2(next.y - current.y, next.x - current.x);
    const rotated = hull.map((point) => inverseRotatePoint(point, angle));
    const xs = rotated.map((point) => point.x);
    const ys = rotated.map((point) => point.y);
    const bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
    if (area < bestArea) {
      bestArea = area;
      bestAngle = angle;
      bestBounds = bounds;
    }
  }

  const rotatedCorners = [
    { x: bestBounds.minX, y: bestBounds.minY },
    { x: bestBounds.maxX, y: bestBounds.minY },
    { x: bestBounds.maxX, y: bestBounds.maxY },
    { x: bestBounds.minX, y: bestBounds.maxY },
  ];
  const corners = rotatedCorners.map((point) => rotatePoint(point, bestAngle));
  const centroid = averagePoint(corners);
  const mids = edgeMidpoints(corners);
  const topEdgeIndex = mids.reduce((bestIndex, point, index, list) =>
    point.y < list[bestIndex].y ? index : bestIndex,
  0);

  return {
    corners,
    edgeMidpoints: mids,
    centroid,
    topEdgeMidpoint: mids[topEdgeIndex],
  };
}

function normalizeCornerAdjustments(adjustments?: OverlayCornerAdjustment[] | null): OverlayCornerAdjustment[] {
  if (!Array.isArray(adjustments) || adjustments.length !== 4) {
    return Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));
  }
  return adjustments.map((point) => ({ x: point?.x ?? 0, y: point?.y ?? 0 }));
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];

    const div = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= div;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j++) {
        a[row][j] -= factor * a[col][j];
      }
    }
  }

  return a.map((row) => row[n]);
}

function getInverseTransform(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, u0: number, v0: number, u1: number, v1: number, u2: number, v2: number) {
    const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(det) < 1e-6) return null;
    const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / det;
    const b = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / det;
    const c = u0 - a * x0 - b * y0;
    const d = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / det;
    const e = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / det;
    const f = v0 - d * x0 - e * y0;
    return [a, b, c, d, e, f];
}

function computeHomography(from: ScreenPt[], to: ScreenPt[]) {
  const n = from.length;
  if (n < 4) return null;

  // Build 2n×8 matrix A and 2n vector b.
  // Each correspondence (sx,sy)→(dx,dy) contributes two rows:
  //   [sx, sy, 1, 0,  0,  0, -sx·dx, -sy·dx] · h = dx
  //   [0,  0,  0, sx, sy, 1, -sx·dy, -sy·dy] · h = dy
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < n; i++) {
    const sx = from[i].x, sy = from[i].y;
    const dx = to[i].x,   dy = to[i].y;
    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    b.push(dy);
  }

  let solution: number[] | null;
  if (n === 4) {
    // Square 8×8 system — solve directly.
    solution = solveLinearSystem(A, b);
  } else {
    // Overdetermined system (n > 4): solve normal equations (AᵀA)h = Aᵀb.
    // AᵀA is 8×8 — reuse existing solveLinearSystem.
    const m = 8;
    const ATA: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
    const ATb: number[] = new Array(m).fill(0);
    for (let r = 0; r < A.length; r++) {
      for (let i = 0; i < m; i++) {
        ATb[i] += A[r][i] * b[r];
        for (let j = 0; j < m; j++) {
          ATA[i][j] += A[r][i] * A[r][j];
        }
      }
    }
    solution = solveLinearSystem(ATA, ATb);
  }

  if (!solution) return null;
  const [a, bc, c, d, e, f, g, h] = solution;
  return { a, b: bc, c, d, e, f, g, h };
}

function applyHomography(point: ScreenPt, homography: ReturnType<typeof computeHomography>): ScreenPt {
  if (!homography) return point;
  const denom = homography.g * point.x + homography.h * point.y + 1;
  if (Math.abs(denom) < 1e-9) return point;
  return {
    x: (homography.a * point.x + homography.b * point.y + homography.c) / denom,
    y: (homography.d * point.x + homography.e * point.y + homography.f) / denom,
  };
}

// ── Piecewise affine transform ────────────────────────────────────────────────
// Splits a polygon into triangles (via earcut indices) and fits one exact affine
// transform per triangle. This guarantees that all N control points map EXACTLY
// to their targets — unlike a global homography with N>4 (which only minimizes
// residuals in the least-squares sense and may leave per-point errors).
interface TriSpherical {
  p0: ScreenPt;
  p1: ScreenPt;
  p2: ScreenPt;
  v0: { x: number; y: number; z: number };
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
}

function applyPieceSpherical(p: ScreenPt, tris: TriSpherical[]): { pitch: number; yaw: number } | null {
  let bestTri: TriSpherical | null = null;
  let bestMin = -Infinity;
  let bestBary = { u: 0, v: 0, w: 0 };
  
  for (const tri of tris) {
    const { p0, p1, p2 } = tri;
    const denom = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
    if (Math.abs(denom) < 1e-8) continue;
    const u = ((p1.y - p2.y) * (p.x - p2.x) + (p2.x - p1.x) * (p.y - p2.y)) / denom;
    const v = ((p2.y - p0.y) * (p.x - p2.x) + (p0.x - p2.x) * (p.y - p2.y)) / denom;
    const w = 1 - u - v;
    const minB = Math.min(u, v, w);
    
    if (minB >= -1e-4) {
      // Inside this triangle!
      const vx = u * tri.v0.x + v * tri.v1.x + w * tri.v2.x;
      const vy = u * tri.v0.y + v * tri.v1.y + w * tri.v2.y;
      const vz = u * tri.v0.z + v * tri.v1.z + w * tri.v2.z;
      const len = Math.sqrt(vx*vx + vy*vy + vz*vz);
      if (len < 1e-8) return null;
      const pitch = Math.asin(Math.max(-1, Math.min(1, vy/len))) * (180/Math.PI);
      const yaw = Math.atan2(vx, vz) * (180/Math.PI);
      return { pitch, yaw };
    }
    
    if (minB > bestMin) {
      bestMin = minB;
      bestTri = tri;
      bestBary = { u, v, w };
    }
  }
  
  if (bestTri) {
    const { u, v, w } = bestBary;
    const vx = u * bestTri.v0.x + v * bestTri.v1.x + w * bestTri.v2.x;
    const vy = u * bestTri.v0.y + v * bestTri.v1.y + w * bestTri.v2.y;
    const vz = u * bestTri.v0.z + v * bestTri.v1.z + w * bestTri.v2.z;
    const len = Math.sqrt(vx*vx + vy*vy + vz*vz);
    if (len < 1e-8) return null;
    const pitch = Math.asin(Math.max(-1, Math.min(1, vy/len))) * (180/Math.PI);
    const yaw = Math.atan2(vx, vz) * (180/Math.PI);
    return { pitch, yaw };
  }
  
  return null;
}

function updateCornerAdjustment(
  adjustments: OverlayCornerAdjustment[],
  index: number,
  deltaX: number,
  deltaY: number,
): OverlayCornerAdjustment[] {
  return adjustments.map((point, pointIndex) =>
    pointIndex === index
      ? { x: point.x + deltaX, y: point.y + deltaY }
      : { ...point },
  );
}

function updateEdgeAdjustment(
  adjustments: OverlayCornerAdjustment[],
  edgeIndex: number,
  deltaX: number,
  deltaY: number,
): OverlayCornerAdjustment[] {
  const indices = [edgeIndex, (edgeIndex + 1) % 4];
  return adjustments.map((point, pointIndex) =>
    indices.includes(pointIndex)
      ? { x: point.x + deltaX, y: point.y + deltaY }
      : { ...point },
  );
}

export default function Viewer360LotesOverlay({
  viewer,
  units,
  overlayImageUrl,
  overlayBounds,
  overlayRotation,
  svgViewBox,
  camLat,
  camLng,
  camAlt,
  imageHeading,
  latOffset,
  lngOffset,
  planRotation,
  planScale,
  planScaleX = 1,
  planScaleY = 1,
  planCornerAdjustments,
  pitchBias = 0,
  cameraRoll = 0,
  opacity = 0.55,
  showLabels = false,
  showPerimeter = true,
  cleanMode = false,
  transformLocked = false,
  alignmentGuides = true,
  flipX = false,
  flipY = false,
  isEditing,
  onEnterEdit,
  onExitEdit,
  onParamsChange,
  onDrawingCountChange,
  drawingPanMode = false,
  mode,
  planCornersAbsolute,
  anchorPoints = [],
  showPlanImage = false,
}: Viewer360LotesOverlayProps) {
  // Track corners count to trigger React re-renders when drawing
  const [drawingCount, setDrawingCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hitAreaRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const frameCountRef = useRef(0);
  // Render throttle: skip SVG rebuild when camera hasn't moved
  const lastCameraRef = useRef<{ pitch: number; yaw: number; hfov: number } | null>(null);
  const forceRedrawRef = useRef(true); // set true when non-camera state changes
  const [naturalSize, setNaturalSize] = useState<{w: number, h: number} | null>(null);

  useEffect(() => {
    if (!overlayImageUrl) return;
    const img = new Image();
    img.onload = () => setNaturalSize({ w: img.naturalWidth || 1000, h: img.naturalHeight || 1000 });
    img.src = overlayImageUrl;
  }, [overlayImageUrl]);

  const camAltRef = useRef(camAlt);
  const imageHeadingRef = useRef(imageHeading);
  const camLatRef = useRef(camLat);
  const camLngRef = useRef(camLng);
  const latOffsetRef = useRef(latOffset);
  const lngOffsetRef = useRef(lngOffset);
  const planRotRef = useRef(planRotation);
  const planScaleRef = useRef(planScale);
  const planScaleXRef = useRef(planScaleX);
  const planScaleYRef = useRef(planScaleY);
  const planCornerAdjustmentsRef = useRef<OverlayCornerAdjustment[]>(normalizeCornerAdjustments(planCornerAdjustments));
  const pitchBiasRef = useRef(pitchBias);
  const cameraRollRef = useRef(cameraRoll);
  const opacityRef = useRef(opacity);
  const showLabelsRef = useRef(showLabels);
  const showPerimeterRef = useRef(showPerimeter);
  const cleanModeRef = useRef(cleanMode);
  const lockedRef = useRef(transformLocked);
  const guidesRef = useRef(alignmentGuides);
  const flipXRef = useRef(flipX);
  const flipYRef = useRef(flipY);
  const overlayBoundsRef = useRef(overlayBounds);
  const overlayRotRef = useRef(overlayRotation);
  const svgViewBoxRef = useRef(svgViewBox);
  const unitsRef = useRef(units);
  const isEditingRef = useRef(isEditing);
  const onEnterEditRef = useRef(onEnterEdit);
  const onExitEditRef = useRef(onExitEdit);
  const onParamsChangeRef = useRef(onParamsChange);
  const onDrawingCountChangeRef = useRef(onDrawingCountChange);
  const drawingPanModeRef = useRef(drawingPanMode);
  const anchorPointsRef = useRef(anchorPoints);

  // Invalidate render cache whenever any non-camera prop changes.
  // The throttle only skips redraws when the camera is stationary AND nothing else changed.
  forceRedrawRef.current = true;

  camAltRef.current = camAlt;
  imageHeadingRef.current = imageHeading;
  camLatRef.current = camLat;
  camLngRef.current = camLng;
  latOffsetRef.current = latOffset;
  lngOffsetRef.current = lngOffset;
  planRotRef.current = planRotation;
  planScaleRef.current = planScale;
  planScaleXRef.current = planScaleX;
  planScaleYRef.current = planScaleY;
  planCornerAdjustmentsRef.current = normalizeCornerAdjustments(planCornerAdjustments);
  pitchBiasRef.current = pitchBias;
  cameraRollRef.current = cameraRoll;
  opacityRef.current = opacity;
  showLabelsRef.current = showLabels;
  showPerimeterRef.current = showPerimeter;
  cleanModeRef.current = cleanMode;
  lockedRef.current = transformLocked;
  guidesRef.current = alignmentGuides;
  flipXRef.current = flipX;
  flipYRef.current = flipY;
  overlayBoundsRef.current = overlayBounds;
  overlayRotRef.current = overlayRotation;
  svgViewBoxRef.current = svgViewBox;
  unitsRef.current = units;
  isEditingRef.current = isEditing;
  onEnterEditRef.current = onEnterEdit;
  onExitEditRef.current = onExitEdit;
  onParamsChangeRef.current = onParamsChange;
  onDrawingCountChangeRef.current = onDrawingCountChange;
  drawingPanModeRef.current = drawingPanMode;
  anchorPointsRef.current = anchorPoints;
  const modeRef = useRef(mode);
  const planCornersAbsoluteRef = useRef(planCornersAbsolute);
  const currentGeoCornersRef = useRef<{ pitch: number; yaw: number }[]>([]);
  const drawingCornersRef = useRef<{pitch: number, yaw: number}[]>([]);
  const showPlanImageRef = useRef(showPlanImage);
  modeRef.current = mode;
  planCornersAbsoluteRef.current = planCornersAbsolute;
  showPlanImageRef.current = showPlanImage;

  if (mode !== "manual" || (Array.isArray(planCornersAbsolute) && planCornersAbsolute.length >= 3)) {
    drawingCornersRef.current = [];
  }

  const bboxRef = useRef<Bbox | null>(null);
  const hullRef = useRef<ScreenPt[]>([]);
  const frameRef = useRef<FrameData | null>(null);
  const centScreenRef = useRef<ScreenPt | null>(null);
  const rotHandlePosRef = useRef<ScreenPt | null>(null);

  const liveDeltaRef = useRef<LiveDelta>({
    latM: 0,
    lngM: 0,
    scaleFactor: 1,
    hdgDelta: 0,
    planRotDelta: 0,
    cornerAdjustments: null,
    cornersAbsolute: null,
  });
  const dragRef = useRef<DragState | null>(null);

  // --- Memoize allLatLngs ---
  const allLatLngsRef = useRef<[number, number][][]>([]);
  const boundingBoxRef = useRef<{ tightMinLat: number, tightMaxLat: number, tightMinLng: number, tightMaxLng: number, centLat: number, centLng: number, centCount: number } | null>(null);
  // Effective viewbox used for normalization — may be synthetic when blueprint hasn't loaded yet
  const effectiveViewBoxRef = useRef<SvgViewBox | null>(null);

  useEffect(() => {
    const _bounds = overlayBounds;

    if (!units || units.length === 0) {
      allLatLngsRef.current = [];
      boundingBoxRef.current = null;
      effectiveViewBoxRef.current = null;
      return;
    }

    // Use real viewbox if available, otherwise compute synthetic one from raw path coords
    let _viewBox: SvgViewBox | null = svgViewBox ?? null;
    if (!_viewBox && !_bounds) {
      let rawMinX = Infinity, rawMaxX = -Infinity, rawMinY = Infinity, rawMaxY = -Infinity;
      for (const unit of units) {
        let p = unit.path as string | undefined;
        if (!p && (unit as any).coordenadasMasterplan) {
          try { p = JSON.parse((unit as any).coordenadasMasterplan).path; } catch {}
        }
        const nums = p?.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
        if (!nums) continue;
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const sx = parseFloat(nums[i]), sy = parseFloat(nums[i+1]);
          if (isNaN(sx) || isNaN(sy)) continue;
          if (sx < rawMinX) rawMinX = sx; if (sx > rawMaxX) rawMaxX = sx;
          if (sy < rawMinY) rawMinY = sy; if (sy > rawMaxY) rawMaxY = sy;
        }
      }
      if (rawMinX !== Infinity && rawMaxX > rawMinX && rawMaxY > rawMinY) {
        _viewBox = { x: rawMinX, y: rawMinY, w: rawMaxX - rawMinX, h: rawMaxY - rawMinY };
      }
    }

    if (!_viewBox) {
      allLatLngsRef.current = [];
      boundingBoxRef.current = null;
      effectiveViewBoxRef.current = null;
      return;
    }
    effectiveViewBoxRef.current = _viewBox;

    const allLatLngs: [number, number][][] = [];
    let tightMinLat = Infinity, tightMaxLat = -Infinity;
    let tightMinLng = Infinity, tightMaxLng = -Infinity;
    let centLat = 0, centLng = 0, centCount = 0;

    if (!_bounds) {
      // SVG-direct mode: no geo calibration — normalize SVG coords to [0,1]×[0,1] synthetic space.
      // lat = 1 - ny  (SVG Y is down, lat is up)
      // lng = nx
      for (const unit of units) {
        let svgPath = unit.path as string | undefined;
        if (!svgPath && (unit as any).coordenadasMasterplan) {
          try { const c = JSON.parse((unit as any).coordenadasMasterplan); svgPath = c.path; } catch {}
        }
        if (!svgPath) { allLatLngs.push([]); continue; }
        const nums = svgPath.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
        const pts: [number, number][] = [];
        if (nums) {
          for (let i = 0; i + 1 < nums.length; i += 2) {
            const sx = parseFloat(nums[i]), sy = parseFloat(nums[i + 1]);
            if (isNaN(sx) || isNaN(sy)) continue;
            const nx = _viewBox.w > 0 ? (sx - _viewBox.x) / _viewBox.w : 0;
            const ny = _viewBox.h > 0 ? (sy - _viewBox.y) / _viewBox.h : 0;
            const lat = 1 - ny;
            const lng = nx;
            pts.push([lat, lng]);
            if (lat < tightMinLat) tightMinLat = lat;
            if (lat > tightMaxLat) tightMaxLat = lat;
            if (lng < tightMinLng) tightMinLng = lng;
            if (lng > tightMaxLng) tightMaxLng = lng;
            centLat += lat; centLng += lng; centCount++;
          }
        }
        allLatLngs.push(pts);
      }
    } else {
      // Geo-calibrated mode
      for (const unit of units) {
        let svgPath = unit.path as string | undefined;
        if (!svgPath && (unit as any).coordenadasMasterplan) {
          try { const c = JSON.parse((unit as any).coordenadasMasterplan); svgPath = c.path; } catch {}
        }
        if (!svgPath) { allLatLngs.push([]); continue; }
        const latLngs = svgPathToLatLng(svgPath, _viewBox, _bounds, overlayRotation ?? 0);
        allLatLngs.push(latLngs);
        for (const [lat, lng] of latLngs) {
          if (lat < tightMinLat) tightMinLat = lat;
          if (lat > tightMaxLat) tightMaxLat = lat;
          if (lng < tightMinLng) tightMinLng = lng;
          if (lng > tightMaxLng) tightMaxLng = lng;
          centLat += lat; centLng += lng; centCount++;
        }
      }
    }

    if (centCount > 0) { centLat /= centCount; centLng /= centCount; }

    if (tightMinLat === Infinity) {
      if (_bounds) {
        tightMinLat = _bounds[0][0]; tightMaxLat = _bounds[1][0];
        tightMinLng = _bounds[0][1]; tightMaxLng = _bounds[1][1];
      } else {
        tightMinLat = 0; tightMaxLat = 1; tightMinLng = 0; tightMaxLng = 1;
      }
      centLat = (tightMinLat + tightMaxLat) / 2;
      centLng = (tightMinLng + tightMaxLng) / 2;
    }

    allLatLngsRef.current = allLatLngs;
    boundingBoxRef.current = { tightMinLat, tightMaxLat, tightMinLng, tightMaxLng, centLat, centLng, centCount };
  }, [units, overlayBounds, svgViewBox, flipX, flipY, overlayRotation]);


  useEffect(() => {
    const frame = () => {
      const svg = svgRef.current;
      const container = containerRef.current;
      const hitDiv = hitAreaRef.current;
      if (!svg || !container || !viewer) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const _units = unitsRef.current || [];
      const _bounds = overlayBoundsRef.current;
      const _rotation = overlayRotRef.current;
      // Use effectiveViewBox (may be synthetic when blueprint hasn't loaded)
      const _viewBox = effectiveViewBoxRef.current ?? svgViewBoxRef.current;
      const _editing = isEditingRef.current;
      const _mode = modeRef.current;
      const _anchorPoints = anchorPointsRef.current;
      const delta = liveDeltaRef.current;

      const _alt = camAltRef.current;
      const _hdg = imageHeadingRef.current + delta.hdgDelta;
      const _planRot = planRotRef.current + delta.planRotDelta;
      const _planScale = planScaleRef.current * delta.scaleFactor;
      const _planScaleX = planScaleXRef.current;
      const _planScaleY = planScaleYRef.current;
      const _pitchBias = pitchBiasRef.current;
      const _cameraRoll = cameraRollRef.current;
      const _opacity = opacityRef.current;
      const _showLabels = showLabelsRef.current && !cleanModeRef.current;
      const _showPerimeter = showPerimeterRef.current && !cleanModeRef.current;
      const _absCorners = delta.cornersAbsolute || planCornersAbsoluteRef.current;
      const _showGuides = guidesRef.current && !cleanModeRef.current;
      const _locked = lockedRef.current;
      const _flipX = flipXRef.current ? -1 : 1;
      const _flipY = flipYRef.current ? -1 : 1;
      const DEG = Math.PI / 180;
      const _camLat = camLatRef.current + delta.latM / 111320;
      const _camLng = camLngRef.current + delta.lngM / (111320 * Math.cos(camLatRef.current * DEG));

      // In drawing pan-mode, disable SVG so Pannellum receives drag events
      const _isDrawingNow = _mode === "manual" && (!Array.isArray(_absCorners) || _absCorners.length < 3);
      const _svgBlocked = _isDrawingNow && drawingPanModeRef.current;
      svg.style.pointerEvents = _editing && !_locked && !_svgBlocked ? "all" : "none";
      svg.style.cursor = _editing && !_locked && !_svgBlocked ? "crosshair" : "default";

      const viewPitch = viewer.getPitch() as number;
      const viewYaw = viewer.getYaw() as number;
      const hfov = viewer.getHfov() as number;
      const activeContainer = containerRef.current;
      if (!activeContainer) return;

      const W = activeContainer.clientWidth;
      const H = activeContainer.clientHeight;

      const cosRoll = Math.cos(_cameraRoll * DEG);
      const sinRoll = Math.sin(_cameraRoll * DEG);
      const halfW = W / 2;
      const halfH = H / 2;

      const projectGeo = (lat: number, lng: number): ScreenPt | null => {
        const { pitch, yaw } = geoToPitchYaw(lat, lng, _camLat, _camLng, _alt, _hdg);
        const raw = projectSphericalToScreen(pitch + _pitchBias, yaw, viewPitch, viewYaw, hfov, W, H);
        if (!raw) return null;
        if (_cameraRoll === 0) return raw;
        const dx = raw.x - halfW;
        const dy = raw.y - halfH;
        return {
          x: halfW + dx * cosRoll - dy * sinRoll,
          y: halfH + dx * sinRoll + dy * cosRoll,
        };
      };

      const projectManual = (p: { pitch: number, yaw: number }): ScreenPt | null => {
         const raw = projectSphericalToScreen(p.pitch, p.yaw, viewPitch, viewYaw, hfov, W, H);
         if (!raw) return null;
         return raw;
      };

      // ── Render throttle ──────────────────────────────────────────────────────
      // Rebuilding 2000+ SVG paths at 60 fps is expensive. Skip the rebuild when
      // the camera is stationary AND no state change has been flagged. Handles
      // are still interactive; the RAF keeps running so we detect the next move.
      const lastCam = lastCameraRef.current;
      const camMoved = !lastCam ||
        Math.abs(lastCam.pitch - viewPitch) > 0.05 ||
        Math.abs(lastCam.yaw   - viewYaw)   > 0.05 ||
        Math.abs(lastCam.hfov  - hfov)      > 0.05;

      if (!camMoved && !forceRedrawRef.current && !_editing && !_isDrawingNow) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      // Cap camera movements to ~30 FPS during active pan to preserve visual smoothness and reduce CPU load
      if (camMoved && !_editing && !_isDrawingNow && !forceRedrawRef.current) {
        frameCountRef.current++;
        if (frameCountRef.current % 2 !== 0) {
          rafRef.current = requestAnimationFrame(frame);
          return;
        }
      }

      lastCameraRef.current = { pitch: viewPitch, yaw: viewYaw, hfov };
      forceRedrawRef.current = false;
      // ── End throttle ─────────────────────────────────────────────────────────

      svg.innerHTML = "";

      let manualCorners: ScreenPt[] | null = null;
      if (_mode === "manual" && Array.isArray(_absCorners) && _absCorners.length >= 3) {
        manualCorners = _absCorners.map(p => projectManual(p)).filter(Boolean) as ScreenPt[];
        if (manualCorners.length < 3) manualCorners = null;
      }

      // 3D homography: plan (nx,ny) → 3D direction → pitch/yaw → screen.
      // Works even when corners are off-screen and when blueprint hasn't loaded (_viewBox may be synthetic).
      let planToDir: number[][] | null = null;
      if (_mode === "manual" && Array.isArray(_absCorners) && _absCorners.length >= 3) {
        const vb = _viewBox ?? { x: 0, y: 0, w: 1, h: 1 };
        const anchors =
          _anchorPoints && _anchorPoints.length >= 3 && _anchorPoints.length === _absCorners.length
            ? _anchorPoints
            : getBBoxEquidistantPoints(vb.x, vb.y, vb.w, vb.h, _absCorners.length);
        planToDir = computePlanToDir(anchors, _absCorners, vb.x, vb.y, vb.w, vb.h);
      }

      // ── 2D screen-space homography ────────────────────────────────────────────
      // For each polygon corner (pitch/yaw), compute where it lands on the ground
      // via inverse ray-casting, then normalize to plan [0,1] space.
      // This gives the CORRECT plan-to-screen correspondence regardless of
      // camera heading, without needing manual anchor points.
      //
      // Priority:
      //   1. Named anchor points (anchor[i] ↔ polygon corner[i]) — most accurate
      //   2. Positional sort → TL/TR/BR/BL — always fills the drawn polygon
      let screenHomography: ReturnType<typeof computeHomography> | null = null;
      let pieceSphericalArr: TriSpherical[] | null = null;

      if (_mode === "manual" && manualCorners && manualCorners.length >= 3 && Array.isArray(_absCorners)) {
        const vb = _viewBox ?? { x: 0, y: 0, w: 1, h: 1 };

        // ── Option 1: Named anchor-to-corner → piecewise spherical (exact at all N points, 3D perspective) ──
        const hasNamedAnchors =
          _anchorPoints && _anchorPoints.length >= 3 &&
          _anchorPoints.length === _absCorners.length &&
          _anchorPoints.length === manualCorners.length;

        if (hasNamedAnchors && _anchorPoints) {
          // Normalize to anchor-bbox [0,1]² — same space as mapPointToManual output.
          const apNxRaw = _anchorPoints.map(ap => vb.w > 0 ? (ap.x - vb.x) / vb.w : 0);
          const apNyRaw = _anchorPoints.map(ap => vb.h > 0 ? (ap.y - vb.y) / vb.h : 0);
          const apMinNx = Math.min(...apNxRaw), apMaxNx = Math.max(...apNxRaw);
          const apMinNy = Math.min(...apNyRaw), apMaxNy = Math.max(...apNyRaw);
          const apDNx = apMaxNx - apMinNx || 1, apDNy = apMaxNy - apMinNy || 1;
          const srcNorm = apNxRaw.map((nx, i) => ({
            x: (nx - apMinNx) / apDNx,
            y: (apNyRaw[i] - apMinNy) / apDNy,
          }));

          // Triangulate the source polygon (earcut uses flat [x,y,x,y,...] array).
          const flatSrc = srcNorm.flatMap(p => [p.x, p.y]);
          const triIdxs = earcut(flatSrc);

          const absoluteVectors = _absCorners.map((c) => {
            const ph = c.pitch * DEG;
            const yw = c.yaw * DEG;
            return {
              x: Math.cos(ph) * Math.sin(yw),
              y: Math.sin(ph),
              z: Math.cos(ph) * Math.cos(yw),
            };
          });

          pieceSphericalArr = [];
          for (let k = 0; k < triIdxs.length; k += 3) {
            const i0 = triIdxs[k], i1 = triIdxs[k + 1], i2 = triIdxs[k + 2];
            pieceSphericalArr.push({
              p0: srcNorm[i0],
              p1: srcNorm[i1],
              p2: srcNorm[i2],
              v0: absoluteVectors[i0],
              v1: absoluteVectors[i1],
              v2: absoluteVectors[i2],
            });
          }
          if (pieceSphericalArr.length === 0) pieceSphericalArr = null;
        }

        // ── Option 2: Positional sort → TL/TR/BR/BL (fallback, no named anchors) ──
        if (!pieceSphericalArr && manualCorners.length >= 4) {
          const safeCorners = manualCorners.filter(
            p => p.x >= -W * 1.0 && p.x <= W * 2.0 && p.y >= -H * 1.0 && p.y <= H * 2.0
          );
          const hullSrc = safeCorners.length >= 4 ? safeCorners : manualCorners;
          const hullPts = hullSrc.length >= 3 ? convexHull(hullSrc) : hullSrc;
          const tl = hullPts.reduce((b, p) => p.x + p.y < b.x + b.y ? p : b);
          const tr = hullPts.reduce((b, p) => p.x - p.y > b.x - b.y ? p : b);
          const br = hullPts.reduce((b, p) => p.x + p.y > b.x + b.y ? p : b);
          const bl = hullPts.reduce((b, p) => p.x - p.y < b.x - b.y ? p : b);
          const planCrns: ScreenPt[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
          screenHomography = computeHomography(planCrns, [tl, tr, br, bl]);
        }
      }

      const planRotRad = _planRot * DEG;
      const cosPR = Math.cos(planRotRad);
      const sinPR = Math.sin(planRotRad);

      const allLatLngs = allLatLngsRef.current;
      const bbox = boundingBoxRef.current;

      let tightMinLat = bbox?.tightMinLat ?? 0;
      let tightMaxLat = bbox?.tightMaxLat ?? 0;
      let tightMinLng = bbox?.tightMinLng ?? 0;
      let tightMaxLng = bbox?.tightMaxLng ?? 0;

      let centLat = bbox?.centLat ?? 0;
      let centLng = bbox?.centLng ?? 0;
      let centCount = bbox?.centCount ?? 0;
      const cosCent = Math.cos(centLat * DEG);
      centScreenRef.current = projectGeo(centLat, centLng);

      const effectiveScaleEW = _planScale * _planScaleX;
      const effectiveScaleNS = _planScale * _planScaleY;

      interface UnitData {
        rawPts: Array<ScreenPt | null>;
        visiblePts: ScreenPt[];
        color: string;
        numero: string;
        d: string;
      }
      const unitData: UnitData[] = [];
      let bbMinX = Infinity, bbMinY = Infinity, bbMaxX = -Infinity, bbMaxY = -Infinity;
      const transformGeoPoint = (lat: number, lng: number): [number, number] => {
        const dLat = (lat - centLat) * 111320 * _flipY;
        const dLng = (lng - centLng) * 111320 * cosCent * _flipX;
        const dLatS = dLat * effectiveScaleNS;
        const dLngS = dLng * effectiveScaleEW;
        const rdLat = dLatS * cosPR - dLngS * sinPR;
        const rdLng = dLatS * sinPR + dLngS * cosPR;
        return [centLat + rdLat / 111320, centLng + rdLng / (111320 * cosCent)];
      };


      const geoCorners = [
        { lat: tightMaxLat, lng: tightMinLng }, // NW
        { lat: tightMaxLat, lng: tightMaxLng }, // NE
        { lat: tightMinLat, lng: tightMaxLng }, // SE
        { lat: tightMinLat, lng: tightMinLng }, // SW
      ];
      currentGeoCornersRef.current = geoCorners.map(gc => {
        const [tLat, tLng] = transformGeoPoint(gc.lat, gc.lng);
        const { pitch, yaw } = geoToPitchYaw(tLat, tLng, _camLat, _camLng, _alt, _hdg);
        return { pitch: pitch + _pitchBias, yaw };
      });

      const getEquidistantHullPoints = (hull: ScreenPt[], count: number): ScreenPt[] => {
          if (count === 0) return [];
          if (count === 1) return [{ ...hull[0] }];
          
          let totalLen = 0;
          const segments = [];
          for (let i = 0; i < hull.length; i++) {
              const p1 = hull[i], p2 = hull[(i + 1) % hull.length];
              const dx = p2.x - p1.x, dy = p2.y - p1.y;
              const len = Math.sqrt(dx*dx + dy*dy);
              segments.push({ p1, p2, len, dx, dy });
              totalLen += len;
          }
          
          const step = totalLen / count;
          const pts: ScreenPt[] = [];
          let currentDist = 0, segIdx = 0, distOnSeg = 0;
          
          for (let i = 0; i < count; i++) {
              const targetDist = i * step;
              while (segIdx < segments.length && currentDist + (segments[segIdx].len - distOnSeg) < targetDist + 0.0001) {
                  currentDist += (segments[segIdx].len - distOnSeg);
                  segIdx++;
                  distOnSeg = 0;
              }
              if (segIdx >= segments.length) { pts.push({ ...hull[0] }); continue; }
              const remaining = targetDist - currentDist;
              const seg = segments[segIdx];
              const t = (distOnSeg + remaining) / seg.len;
              pts.push({ x: seg.p1.x + t * seg.dx, y: seg.p1.y + t * seg.dy });
          }
          return pts;
      };

      const getSourcePoints = (n: number, hull: ScreenPt[]): ScreenPt[] => {
          const hMinX = Math.min(...hull.map(p => p.x)), hMinY = Math.min(...hull.map(p => p.y));
          const hMaxX = Math.max(...hull.map(p => p.x)), hMaxY = Math.max(...hull.map(p => p.y));
          if (n === 4) {
             return [
               { x: hMinX, y: hMinY }, { x: hMaxX, y: hMinY },
               { x: hMaxX, y: hMaxY }, { x: hMinX, y: hMaxY }
             ];
          }
          return getEquidistantHullPoints(hull, n);
      }

      // ── Reference bounds for manual-mode normalization ────────────────────────
      // Prefer the blueprint container defined by user-placed "Esquinas" (anchorPoints)
      // over the automatic lot bounding box. This ensures that the source frame used
      // for the plan→polygon homography is the REAL plan container, not just the
      // convex hull of the lot vertices (which ignores streets, margins, etc.).
      let refMinLng = tightMinLng;
      let refMaxLng = tightMaxLng;
      let refMinLat = tightMinLat;
      let refMaxLat = tightMaxLat;

      if (_anchorPoints && _anchorPoints.length >= 3 && _viewBox) {
        const apCoords: Array<[number, number]> = []; // [lat, lng]
        for (const ap of _anchorPoints) {
          const nx = _viewBox.w > 0 ? (ap.x - _viewBox.x) / _viewBox.w : 0;
          const ny = _viewBox.h > 0 ? (ap.y - _viewBox.y) / _viewBox.h : 0;
          if (_bounds) {
            const [[swLat, swLng], [neLat, neLng]] = _bounds;
            apCoords.push([neLat - ny * (neLat - swLat), swLng + nx * (neLng - swLng)]);
          } else {
            // SVG-direct mode: synthetic lat/lng same as allLatLngs
            apCoords.push([1 - ny, nx]);
          }
        }
        const apMinLat = Math.min(...apCoords.map(c => c[0]));
        const apMaxLat = Math.max(...apCoords.map(c => c[0]));
        const apMinLng = Math.min(...apCoords.map(c => c[1]));
        const apMaxLng = Math.max(...apCoords.map(c => c[1]));
        if (apMaxLng > apMinLng && apMaxLat > apMinLat) {
          refMinLat = apMinLat; refMaxLat = apMaxLat;
          refMinLng = apMinLng; refMaxLng = apMaxLng;
        }
      }

      const _dLng = refMaxLng - refMinLng;
      const _dLat = refMaxLat - refMinLat;



      const mapPointToManual = (lat: number, lng: number): ScreenPt | null => {
         // Normalize to [0,1] relative to the plan container (anchorPoints bounds when
         // available, otherwise the lot bounding box). This is the source frame for
         // the plan→polygon homography.
         const nx = _dLng > 0 ? (lng - refMinLng) / _dLng : 0;
         const ny = _dLat > 0 ? (refMaxLat - lat) / _dLat : 0;

         // Apply planRotation around plan center (0.5, 0.5) in normalized space.
         // Positive angle = clockwise on screen, consistent with geo mode.
         // cosPR and sinPR are computed from _planRot just above this block.
         let rnx = nx, rny = ny;
         if (_planRot !== 0) {
           const dx = nx - 0.5, dy = ny - 0.5;
           rnx = 0.5 + dx * cosPR - dy * sinPR;
           rny = 0.5 + dx * sinPR + dy * cosPR;
         }

         // Primary: piecewise spherical (named anchor correspondences — exact at all N points, 3D perspective)
         if (pieceSphericalArr && pieceSphericalArr.length > 0) {
           const spherical = applyPieceSpherical({ x: rnx, y: rny }, pieceSphericalArr);
           if (spherical) return projectManual(spherical);
         }

         // Secondary: 3D direction-vector homography (fallback — 3D perspective)
         if (planToDir) {
           const M = planToDir;
           const dvx = M[0][0]*rnx + M[0][1]*rny + M[0][2];
           const dvy = M[1][0]*rnx + M[1][1]*rny + M[1][2];
           const dvz = M[2][0]*rnx + M[2][1]*rny + M[2][2];
           const len = Math.sqrt(dvx*dvx + dvy*dvy + dvz*dvz);
           if (len > 1e-8) {
             const pitch = Math.asin(Math.max(-1, Math.min(1, dvy/len))) * (180/Math.PI);
             const yaw   = Math.atan2(dvx, dvz) * (180/Math.PI);
             return projectManual({pitch, yaw});
           }
         }

         // Last resort: 2D screen-space homography
         if (screenHomography) {
           return applyHomography({ x: rnx, y: rny }, screenHomography);
         }

         return null;
      };

      for (let i = 0; i < _units.length; i++) {
        const unit = _units[i];
        const rawLatLngs = allLatLngs[i];
        if (!rawLatLngs || rawLatLngs.length < 3) continue;

        let screenPts: Array<ScreenPt | null>;
        if (_mode === "manual") {
           screenPts = rawLatLngs.map(([lat, lng]) => mapPointToManual(lat, lng));
        } else {
           const rotatedLatLngs = rawLatLngs.map(([lat, lng]) => transformGeoPoint(lat, lng));
           screenPts = rotatedLatLngs.map(([lat, lng]) => projectGeo(lat, lng));
        }
        
        const visiblePts = screenPts.filter(Boolean) as ScreenPt[];
        if (visiblePts.length < 3) continue;

        for (const pt of visiblePts) {
          if (pt.x < bbMinX) bbMinX = pt.x; if (pt.y < bbMinY) bbMinY = pt.y;
          if (pt.x > bbMaxX) bbMaxX = pt.x; if (pt.y > bbMaxY) bbMaxY = pt.y;
        }

        const hull = convexHull(visiblePts);
        unitData.push({
          rawPts: screenPts,
          visiblePts,
          color: ESTADO_COLORS[unit.estado] || "#10b981",
          numero: unit.numero,
          d: hull.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z",
        });
      }

      const getFinalHull = () => {
        const pts: ScreenPt[] = [];
        for (const u of unitData) pts.push(...u.visiblePts);
        return pts.length >= 3 ? convexHull(pts) : [];
      };

      const finalHull = getFinalHull();
      const hasCornerWarp = Array.isArray(planCornerAdjustmentsRef.current) &&
        planCornerAdjustmentsRef.current.some(c => c.x !== 0 || c.y !== 0);

      const adj = planCornerAdjustmentsRef.current || [];
      const getWarpedCorners = (): ScreenPt[] | null => {
        if (_mode === "manual") {
          return manualCorners;
        }
        
        const hull = finalHull;
        if (hull.length < 3) return null;
        const hMinX = Math.min(...hull.map(p => p.x)), hMinY = Math.min(...hull.map(p => p.y));
        const hMaxX = Math.max(...hull.map(p => p.x)), hMaxY = Math.max(...hull.map(p => p.y));
        const baseCorners = [
          { x: hMinX, y: hMinY },
          { x: hMaxX, y: hMinY },
          { x: hMaxX, y: hMaxY },
          { x: hMinX, y: hMaxY },
        ];
        return baseCorners.map((bc, i) => ({
          x: bc.x + (adj[i]?.x ?? 0) + (delta.cornerAdjustments?.[i]?.x ?? 0),
          y: bc.y + (adj[i]?.y ?? 0) + (delta.cornerAdjustments?.[i]?.y ?? 0),
        }));
      };

      const warpedCorners = getWarpedCorners();
      
      let warpPtFn: ((pt: ScreenPt) => ScreenPt) | null = null;
      // In manual mode, mapPointToManual already handles the projection via MLS — no secondary warp needed.
      // In geo mode only: apply triangulated anchor warp if anchor counts match.
      if (_mode !== "manual" && warpedCorners && _anchorPoints && _anchorPoints.length > 0 && warpedCorners.length === _anchorPoints.length && warpedCorners.length >= 3) {
          const flatCoords = _anchorPoints.flatMap(p => [p.x, p.y]);
          const triangles = earcut(flatCoords);

          warpPtFn = (pt: ScreenPt): ScreenPt => {
            for (let i = 0; i < triangles.length; i += 3) {
                const i0 = triangles[i], i1 = triangles[i+1], i2 = triangles[i+2];
                const p0 = _anchorPoints![i0], p1 = _anchorPoints![i1], p2 = _anchorPoints![i2];
                const denom = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
                if (Math.abs(denom) < 1e-8) continue;
                const u = ((p1.y - p2.y) * (pt.x - p2.x) + (p2.x - p1.x) * (pt.y - p2.y)) / denom;
                const v = ((p2.y - p0.y) * (pt.x - p2.x) + (p0.x - p2.x) * (pt.y - p2.y)) / denom;
                const w = 1 - u - v;
                if (u >= -1e-4 && v >= -1e-4 && w >= -1e-4) {
                    const d0 = warpedCorners[i0], d1 = warpedCorners[i1], d2 = warpedCorners[i2];
                    return { x: u * d0.x + v * d1.x + w * d2.x, y: u * d0.y + v * d1.y + w * d2.y };
                }
            }
            if (triangles.length >= 3) {
                const i0 = triangles[0], i1 = triangles[1], i2 = triangles[2];
                const p0 = _anchorPoints![i0], p1 = _anchorPoints![i1], p2 = _anchorPoints![i2];
                const denom = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
                if (Math.abs(denom) > 1e-8) {
                    const u = ((p1.y - p2.y) * (pt.x - p2.x) + (p2.x - p1.x) * (pt.y - p2.y)) / denom;
                    const v = ((p2.y - p0.y) * (pt.x - p2.x) + (p0.x - p2.x) * (pt.y - p2.y)) / denom;
                    const w = 1 - u - v;
                    const d0 = warpedCorners[i0], d1 = warpedCorners[i1], d2 = warpedCorners[i2];
                    return { x: u * d0.x + v * d1.x + w * d2.x, y: u * d0.y + v * d1.y + w * d2.y };
                }
            }
            return { x: warpedCorners[0].x, y: warpedCorners[0].y };
          };
      }

      const warpUnit = (u: UnitData): UnitData => {
        if (!warpPtFn) return u;
        const newVisible = u.visiblePts.map(warpPtFn);
        const newHull = convexHull(newVisible);
        return {
          ...u,
          visiblePts: newVisible,
          d: newHull.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z",
        };
      };

      // Only apply warpUnit if we are NOT in manual mode, because manual mode already warped them in mapPointToManual!
      const warpedUnitData = (_mode !== "manual" && hasCornerWarp) ? unitData.map(warpUnit) : unitData;

      if (_mode === "manual" && warpedCorners && warpedCorners.length >= 3) {
        bboxRef.current = {
          minX: Math.min(...warpedCorners.map(p => p.x)),
          minY: Math.min(...warpedCorners.map(p => p.y)),
          maxX: Math.max(...warpedCorners.map(p => p.x)),
          maxY: Math.max(...warpedCorners.map(p => p.y)),
          centX: warpedCorners.reduce((s, p) => s + p.x, 0) / warpedCorners.length,
          centY: warpedCorners.reduce((s, p) => s + p.y, 0) / warpedCorners.length,
        };
      } else if (unitData.length > 0 && isFinite(bbMinX)) {
        bboxRef.current = {
          minX: bbMinX, minY: bbMinY, maxX: bbMaxX, maxY: bbMaxY,
          centX: (bbMinX + bbMaxX) / 2, centY: (bbMinY + bbMaxY) / 2,
        };
      } else {
        bboxRef.current = null;
      }

      if (warpedCorners && warpedCorners.length >= 3) {
        const warpedMids = edgeMidpoints(warpedCorners);
        let topEdgeIndex = 0;
        if (warpedMids.length > 0) {
           topEdgeIndex = warpedMids.reduce((best, point, index, list) => point.y < list[best].y ? index : best, 0);
        }
        frameRef.current = {
          corners: warpedCorners,
          edgeMidpoints: warpedMids,
          centroid: { x: bboxRef.current!.centX, y: bboxRef.current!.centY },
          topEdgeMidpoint: warpedMids[topEdgeIndex] || warpedCorners[0],
        };
      } else {
        frameRef.current = _mode === "manual" ? null : computeFrameFromHull(finalHull);
      }

      if (hitDiv) {
        if (!_editing && finalHull.length >= 3) {
          const hMinX = Math.min(...finalHull.map(p => p.x)), hMinY = Math.min(...finalHull.map(p => p.y));
          const hMaxX = Math.max(...finalHull.map(p => p.x)), hMaxY = Math.max(...finalHull.map(p => p.y));
          hitDiv.style.left = `${hMinX}px`; hitDiv.style.top = `${hMinY}px`;
          hitDiv.style.width = `${hMaxX - hMinX}px`; hitDiv.style.height = `${hMaxY - hMinY}px`;
          hitDiv.style.pointerEvents = "auto"; hitDiv.style.cursor = "pointer";
        } else {
          hitDiv.style.pointerEvents = "none";
          hitDiv.style.cursor = "default";
        }
      }

      // isDrawing = user is still placing polygon points (polygon not yet saved).
      // Must NOT depend on screen visibility — once polygon is saved (≥3 corners)
      // we always render lots, even if camera is looking away.
      const isDrawing = _isDrawingNow;

      if (!isDrawing) {
        // In manual mode, clip all lot paths to the drawn polygon to guarantee visual
        // containment. This is a safety net on top of the homography — any lot that
        // the projective transform places outside the drawn boundary is hidden.
        // The <clipPath> is applied to a <g> group; the outline polygon and labels
        // are rendered OUTSIDE the clip group so they stay visible.
        let lotTarget: Element = svg;
        if (_mode === "manual" && manualCorners && manualCorners.length >= 3) {
          const defs = svgEl("defs", {});
          const clipPath = svgEl("clipPath", { id: "mc-clip" });
          clipPath.appendChild(svgEl("polygon", {
            points: manualCorners.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
          }));
          defs.appendChild(clipPath);
          svg.appendChild(defs);
          const g = svgEl("g", { "clip-path": "url(#mc-clip)" });
          svg.appendChild(g);
          lotTarget = g;
        }

        for (const { d, color, visiblePts, numero } of warpedUnitData) {
          lotTarget.appendChild(svgEl("path", {
            d,
            fill: color,
            stroke: "white",
            "stroke-width": "1.5",
            "stroke-linejoin": "round",
            style: `transition: all 0.2s ease-in-out; pointer-events: none; opacity: ${_opacity};`,
          }));

          // Labels: only when explicitly enabled (showLabels prop, default false).
          // In the 360 overlay, labels are OFF by default for performance.
          if (_showLabels && visiblePts.length > 0) {
            const minX = Math.min(...visiblePts.map((p) => p.x));
            const maxX = Math.max(...visiblePts.map((p) => p.x));
            const minY = Math.min(...visiblePts.map((p) => p.y));
            const maxY = Math.max(...visiblePts.map((p) => p.y));
            const area = (maxX - minX) * (maxY - minY);
            if (area > 300) {
              const text = svgEl("text", {
                x: (minX + maxX) / 2,
                y: (minY + maxY) / 2,
                fill: "white",
                "font-size": "10",
                "font-weight": "bold",
                "text-anchor": "middle",
                "dominant-baseline": "middle",
                style: "pointer-events: none; filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.8));",
              });
              text.textContent = /^L(\d+)$/.test(numero) ? numero.slice(1) : numero;
              lotTarget.appendChild(text);
            }
          }
        }
      }

      if (isDrawing) {
         const dCorners = drawingCornersRef.current.map(p => projectManual(p)).filter(Boolean) as ScreenPt[];
         if (dCorners.length > 1) {
            const pathD = dCorners.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            svg.appendChild(svgEl("path", { d: pathD, fill: "none", stroke: "#10b981", "stroke-width": "3", "stroke-dasharray": "6 4" }));
         }
         for (let i = 0; i < dCorners.length; i++) {
            svg.appendChild(svgEl("circle", { cx: dCorners[i].x, cy: dCorners[i].y, r: HANDLE_R, fill: "#10b981", stroke: "white", "stroke-width": "2" }));
            const lbl = svgEl("text", { x: dCorners[i].x, y: dCorners[i].y + 24, fill: "white", "font-size": "14", "font-weight": "bold", "font-family": "Inter,sans-serif", "text-anchor": "middle" });
            lbl.textContent = `Punto ${i + 1}`;
            svg.appendChild(lbl);
         }
         const textAttrs = { x: W / 2, y: 40, "font-size": "16", "font-family": "Inter,sans-serif", "font-weight": "600", "text-anchor": "middle" };
         const bg = svgEl("rect", { x: W / 2 - 250, y: 15, width: 500, height: 40, rx: 8, fill: "rgba(0,0,0,0.75)" });
         svg.appendChild(bg);
         const ins = svgEl("text", { ...textAttrs, fill: "white", y: 40 });
         if (drawingCornersRef.current.length < 3) {
             ins.textContent = `Haz clic en el terreno para añadir puntos (Llevas ${drawingCornersRef.current.length})`;
         } else {
             ins.textContent = `Haz clic cerca del punto 1 para cerrar el polígono, o añade más puntos`;
         }
         svg.appendChild(ins);
      }

      const isCurrentlyDrawing = drawingCornersRef.current.length > 0 || !planCornersAbsoluteRef.current || planCornersAbsoluteRef.current.length < 3;

      if (_mode === "manual" && manualCorners && manualCorners.length >= 3 && !isCurrentlyDrawing) {
         // Same as projected anchors, just show a dashed outline, not a filled polygon
         const polyPts = manualCorners.map(p => `${p.x},${p.y}`).join(" ");
         svg.appendChild(svgEl("polygon", { 
             points: polyPts, 
             fill: "none", 
             stroke: "rgba(34, 197, 94, 0.8)", 
             "stroke-width": "2",
             "stroke-dasharray": "4 4"
         }));
      }

      if (_showGuides && finalHull.length >= 3) {
        const hullD = finalHull.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
        svg.appendChild(svgEl("path", { d: hullD, fill: "none", stroke: "rgba(255,255,255,0.18)", "stroke-width": "1", "stroke-dasharray": "5 4" }));
      }

      // ─── Editable Handles ─────────────────────────────────────────────────────

      if (showPlanImageRef.current && overlayImageUrl && frameRef.current) {
        if (_mode === "manual" && manualCorners && manualCorners.length >= 4 && naturalSize) {
          const w = naturalSize.w, h = naturalSize.h;
          const srcNodes = [{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
          const dstNodes = manualCorners;
          
          const defs = svgEl("defs", {});
          svg.appendChild(defs);

          const indices = [[0, 1, 2], [0, 2, 3]];
          for (let i = 0; i < indices.length; i++) {
            const tri = indices[i];
            const srcTri = [srcNodes[tri[0]], srcNodes[tri[1]], srcNodes[tri[2]]];
            const dstTri = [dstNodes[tri[0]], dstNodes[tri[1]], dstNodes[tri[2]]];
            
            const t = getInverseTransform(
                srcTri[0].x, srcTri[0].y, srcTri[1].x, srcTri[1].y, srcTri[2].x, srcTri[2].y,
                dstTri[0].x, dstTri[0].y, dstTri[1].x, dstTri[1].y, dstTri[2].x, dstTri[2].y
            );
            
            if (t) {
              const clipId = `clip-tri-${i}`;
              const clipPath = svgEl("clipPath", { id: clipId });
              clipPath.appendChild(svgEl("polygon", { points: `${dstTri[0].x},${dstTri[0].y} ${dstTri[1].x},${dstTri[1].y} ${dstTri[2].x},${dstTri[2].y}` }));
              defs.appendChild(clipPath);

              const matrix = [t[0], t[3], t[1], t[4], t[2], t[5]].join(" ");
              svg.appendChild(svgEl("image", { 
                href: overlayImageUrl, 
                x: 0, y: 0, 
                width: w, height: h, 
                transform: `matrix(${matrix})`,
                "clip-path": `url(#${clipId})`
              }));
            }
          }
        } else if (_mode !== "manual") {
          const [c0, c1, , c3] = frameRef.current.corners;
          const matrix = [c1.x - c0.x, c1.y - c0.y, c3.x - c0.x, c3.y - c0.y, c0.x, c0.y].join(" ");
          svg.appendChild(svgEl("image", { href: overlayImageUrl, x: 0, y: 0, width: 1, height: 1, transform: `matrix(${matrix})` }));
        }
      }

      if (_editing && frameRef.current) {
        const frameData = frameRef.current;
        const topEdgeIndex = frameData.edgeMidpoints.reduce((best, point, index, list) =>
          point.y < list[best].y ? index : best, 0);
        const edgeStart = frameData.corners[topEdgeIndex], edgeEnd = frameData.corners[(topEdgeIndex + 1) % 4];
        const midX = frameData.topEdgeMidpoint.x, midY = frameData.topEdgeMidpoint.y;
        const eDx = edgeEnd.x - edgeStart.x, eDy = edgeEnd.y - edgeStart.y, eLen = Math.hypot(eDx, eDy) || 1;
        const p1x = -eDy / eLen, p1y = eDx / eLen, p2x = eDy / eLen, p2y = -eDx / eLen;
        const centSc = centScreenRef.current ?? frameData.centroid;
        const dot1 = (midX - centSc.x) * p1x + (midY - centSc.y) * p1y;
        const outX = dot1 >= 0 ? p1x : p2x, outY = dot1 >= 0 ? p1y : p2y;
        const rhX = midX + outX * ROT_GAP, rhY = midY + outY * ROT_GAP;
        rotHandlePosRef.current = { x: rhX, y: rhY };

        const borderD = frameData.corners.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
        svg.appendChild(svgEl("path", { d: borderD, fill: "none", stroke: "rgba(99,102,241,0.7)", "stroke-width": "1.5" }));

        if (_mode !== "manual") {
           svg.appendChild(svgEl("line", { x1: midX, y1: midY, x2: rhX, y2: rhY, stroke: "rgba(99,102,241,0.6)", "stroke-width": "1.5", "stroke-dasharray": "4 3" }));
           svg.appendChild(svgEl("circle", { cx: rhX, cy: rhY, r: HANDLE_R, fill: "#6366f1", stroke: "white", "stroke-width": "2" }));
        }

        for (const { x, y } of frameData.corners) {
          svg.appendChild(svgEl("circle", { cx: x, cy: y, r: HANDLE_R, fill: "white", stroke: "#6366f1", "stroke-width": "2" }));
        }
        if (_mode !== "manual") {
           for (const { x, y } of frameData.edgeMidpoints) {
             svg.appendChild(svgEl("rect", { x: x - 5, y: y - 5, width: 10, height: 10, rx: 3, fill: "#eef2ff", stroke: "#6366f1", "stroke-width": "1.5" }));
           }
        }
      } else {
        rotHandlePosRef.current = null;
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [viewer]);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    const hitArea = hitAreaRef.current;
    if (!svg || !container || !hitArea) return;

    function localPt(e: PointerEvent): ScreenPt {
      const rect = container!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function dist(a: ScreenPt, b: ScreenPt) { return Math.hypot(a.x - b.x, a.y - b.y); }

    const onHitAreaDown = (e: PointerEvent) => {
      if (transformLocked || !isEditing) return;
      onEnterEdit?.();
      onSvgDown(e);
    };

    const onSvgDown = (e: PointerEvent) => {
        if (!viewer) return;
        const rect = container!.getBoundingClientRect();
        const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        if (modeRef.current === "manual") {
           const isDrawing = !planCornersAbsoluteRef.current || planCornersAbsoluteRef.current.length < 3;
           if (isDrawing) {
              const coords = (() => { try { return viewer.mouseEventToCoords(e as any) as [number, number]; } catch { return null; } })();
              if (coords) {
                 const pts = drawingCornersRef.current;
                 if (pts.length >= 3) {
                     const firstPt = pts[0];
                     const sFirst = projectSphericalToScreen(firstPt.pitch, firstPt.yaw, 
                          viewer.getPitch() as number, viewer.getYaw() as number, viewer.getHfov() as number, 
                          container!.clientWidth, container!.clientHeight);
                     if (sFirst) {
                         const dx = pt.x - sFirst.x, dy = pt.y - sFirst.y;
                         if (dx*dx + dy*dy < 400) { // 20px radius to close
                             const newCorners = [...pts];
                             liveDeltaRef.current.cornersAbsolute = newCorners;
                             onParamsChangeRef.current?.({ planCornerAdjustments: [], planCornersAbsolute: newCorners });
                             drawingCornersRef.current = [];
                             setDrawingCount(0);
                             onDrawingCountChangeRef.current?.(0);
                             return;
                         }
                     }
                 }
                 pts.push({ pitch: coords[0], yaw: coords[1] });
                 setDrawingCount(pts.length);
                 onDrawingCountChangeRef.current?.(pts.length);
              }
              return; // Stop here if drawing
           }
        }

        const bb = bboxRef.current, frame = frameRef.current;
        e.stopPropagation(); e.preventDefault();
        if (lockedRef.current) return;
        if (!bb || !frame) { onExitEditRef.current?.(); return; }

        const rotHandle = rotHandlePosRef.current ?? { x: bb.centX, y: bb.minY - ROT_GAP };
        const cornerIndex = frame.corners.findIndex((corner) => dist(pt, corner) <= HANDLE_HIT);
        const edgeIndex = frame.edgeMidpoints.findIndex((midpoint) => dist(pt, midpoint) <= HANDLE_HIT);

        let mode: DragMode | null = null;
        let handleIndex: number | undefined;

        if (modeRef.current === "manual") {
          if (cornerIndex >= 0) { mode = "corner"; handleIndex = cornerIndex; }
          else if (pointInPolygon(pt, frame.corners)) { mode = "translate"; }
        } else {
          if (dist(pt, rotHandle) <= HANDLE_HIT) mode = "rotate";
          else if (cornerIndex >= 0) { mode = "corner"; handleIndex = cornerIndex; }
          else if (edgeIndex >= 0) { mode = "edge"; handleIndex = edgeIndex; }
          else if (pointInPolygon(pt, frame.corners)) mode = "translate";
        }

        if (!mode) { onExitEditRef.current?.(); return; }

        const startViewYaw = (() => { try { return viewer.getYaw() as number; } catch { return 0; } })();
        svg.setPointerCapture(e.pointerId);
        liveDeltaRef.current = { latM: 0, lngM: 0, scaleFactor: 1, hdgDelta: 0, planRotDelta: 0, cornerAdjustments: null, cornersAbsolute: null };
        dragRef.current = {
          mode,
          startX: e.clientX,
          startY: e.clientY,
          startLat: latOffsetRef.current,
          startLng: lngOffsetRef.current,
          startAlt: camAltRef.current,
          startHdg: imageHeadingRef.current,
          startViewYaw,
          startPlanRot: planRotRef.current,
          startPlanScale: planScaleRef.current,
          startPlanScaleX: planScaleXRef.current,
          startPlanScaleY: planScaleYRef.current,
          startCornerAdjustments: [...planCornerAdjustmentsRef.current],
          startAngle: Math.atan2(pt.y - bb.centY, pt.x - bb.centX),
          centX: bb.centX,
          centY: bb.centY,
          handleIndex
        };
      };

      const onMove = (e: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;

        const activeContainer = containerRef.current;
        if (!activeContainer) return;

        const W = activeContainer.clientWidth;
        const H = activeContainer.clientHeight;
        const hfov = (() => {
          try {
            return viewer.getHfov() as number;
          } catch {
            return 100;
          }
        })();
        const DEG = Math.PI / 180;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;

        if (drag.mode === "translate") {
          const mpp = (2 * drag.startAlt * Math.tan((hfov * DEG) / 2)) / W;
          const effHdgRad = (drag.startHdg + drag.startViewYaw) * DEG;
          const screenRightM = dx * mpp;
          const screenDownM = dy * mpp;
          const northM =
            screenRightM * -Math.sin(effHdgRad) + screenDownM * -Math.cos(effHdgRad);
          const eastM =
            screenRightM * Math.cos(effHdgRad) + screenDownM * -Math.sin(effHdgRad);
          liveDeltaRef.current = {
            latM: -northM,
            lngM: -eastM,
            scaleFactor: 1,
            hdgDelta: 0,
            planRotDelta: 0,
            cornerAdjustments: null,
            cornersAbsolute: null,
          };
        } else if (drag.mode === "scale") {
          const factor = Math.exp((-dy / H) * 3);
          liveDeltaRef.current = {
            latM: 0,
            lngM: 0,
            scaleFactor: factor,
            hdgDelta: 0,
            planRotDelta: 0,
            cornerAdjustments: null,
            cornersAbsolute: null,
          };
        } else if (drag.mode === "rotate") {
          const pt = localPt(e);
          const angle = Math.atan2(pt.y - drag.centY, pt.x - drag.centX);
          const deltaDeg = (angle - drag.startAngle) / DEG;
          liveDeltaRef.current = {
            latM: 0,
            lngM: 0,
            scaleFactor: 1,
            hdgDelta: 0,
            planRotDelta: deltaDeg,
            cornerAdjustments: null,
            cornersAbsolute: null,
          };
        } else if (drag.mode === "edge" && drag.handleIndex !== undefined) {
          const factor = Math.exp((-dy / H) * 2);
          const sx = drag.handleIndex % 2 === 0 ? 1 : factor;
          const sy = drag.handleIndex % 2 === 0 ? factor : 1;
          onParamsChangeRef.current?.({
            latOffset: drag.startLat,
            lngOffset: drag.startLng,
            camAlt: drag.startAlt,
            imageHeading: drag.startHdg,
            planRotation: drag.startPlanRot,
            planScale: drag.startPlanScale,
            planScaleX: drag.startPlanScaleX * sx,
            planScaleY: drag.startPlanScaleY * sy,
            planCornerAdjustments: drag.startCornerAdjustments,
          });
        } else if (drag.mode === "corner" && drag.handleIndex !== undefined) {
          if (modeRef.current === "manual") {
            const coords = (() => {
              try {
                return viewer.mouseEventToCoords(e) as [number, number];
              } catch {
                return null;
              }
            })();
            if (coords) {
              const [pitch, yaw] = coords;
              const prevCorners = liveDeltaRef.current.cornersAbsolute || planCornersAbsoluteRef.current || [];
              const nextCorners = [...prevCorners];
              nextCorners[drag.handleIndex] = { pitch, yaw };
              liveDeltaRef.current = {
                latM: 0, lngM: 0, scaleFactor: 1, hdgDelta: 0, planRotDelta: 0,
                cornerAdjustments: null,
                cornersAbsolute: nextCorners,
              };
            }
          } else {
            const nextAdjustments = [...drag.startCornerAdjustments];
            const effHdgRad = (drag.startHdg + drag.startViewYaw) * DEG;
            const mpp = (2 * drag.startAlt * Math.tan((hfov * DEG) / 2)) / W;
            const screenRightM = dx * mpp;
            const screenDownM = dy * mpp;
            const northM =
              screenRightM * -Math.sin(effHdgRad) + screenDownM * -Math.cos(effHdgRad);
            const eastM =
              screenRightM * Math.cos(effHdgRad) + screenDownM * -Math.sin(effHdgRad);
            nextAdjustments[drag.handleIndex] = { x: -eastM, y: -northM };
            liveDeltaRef.current = {
              latM: 0,
              lngM: 0,
              scaleFactor: 1,
              hdgDelta: 0,
              planRotDelta: 0,
              cornerAdjustments: nextAdjustments,
              cornersAbsolute: null,
            };
          }
        }
      };

      const onUp = () => {
        const drag = dragRef.current;
        if (!drag) return;

        const d = liveDeltaRef.current;
        const finalLat = drag.startLat + d.latM;
        const finalLng = drag.startLng + d.lngM;
        const finalHdg = ((drag.startHdg + d.hdgDelta) % 360 + 360) % 360;
        const finalPlanRot = ((drag.startPlanRot + d.planRotDelta) % 360 + 360) % 360;
        const finalCamAlt = camAltRef.current;
        const finalPlanScale = Math.max(0.05, drag.startPlanScale * d.scaleFactor);
        const finalCornerAdjustments = d.cornerAdjustments ?? drag.startCornerAdjustments;
        const finalCornersAbsolute = d.cornersAbsolute ?? planCornersAbsoluteRef.current;

        liveDeltaRef.current = {
          latM: 0,
          lngM: 0,
          scaleFactor: 1,
          hdgDelta: 0,
          planRotDelta: 0,
          cornerAdjustments: null,
          cornersAbsolute: null,
        };
        dragRef.current = null;

        onParamsChangeRef.current?.({
          latOffset: finalLat,
          lngOffset: finalLng,
          camAlt: finalCamAlt,
          imageHeading: finalHdg,
          planRotation: finalPlanRot,
          planScale: finalPlanScale,
          planScaleX: drag.startPlanScaleX,
          planScaleY: drag.startPlanScaleY,
          planCornerAdjustments: finalCornerAdjustments,
          planCornersAbsolute: finalCornersAbsolute,
        });
      };

      if (!hitArea || !svg) return;

      hitArea.addEventListener("pointerdown", onHitAreaDown);
      svg.addEventListener("pointerdown", onSvgDown);
      svg.addEventListener("pointermove", onMove);
      svg.addEventListener("pointerup", onUp);
      svg.addEventListener("pointercancel", onUp);

    const stopFn = (e: Event) => {
      e.stopPropagation();
      if (e.type !== "wheel") e.preventDefault();
    };
    svg.addEventListener("mousedown", stopFn);
    svg.addEventListener("touchstart", stopFn, { passive: false });
    svg.addEventListener("touchmove", stopFn, { passive: false });
    svg.addEventListener("touchend", stopFn);

    return () => {
      hitArea.removeEventListener("pointerdown", onHitAreaDown);
      svg.removeEventListener("pointerdown", onSvgDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointercancel", onUp);
      svg.removeEventListener("mousedown", stopFn);
      svg.removeEventListener("touchstart", stopFn);
      svg.removeEventListener("touchmove", stopFn);
      svg.removeEventListener("touchend", stopFn);
    };
  }, [viewer]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-10" style={{ pointerEvents: "none" }}>
      <div ref={hitAreaRef} className="absolute inset-0" style={{ pointerEvents: "auto" }} />
      <svg
        ref={svgRef}
        data-overlay-svg="true"
        className="absolute inset-0 w-full h-full overflow-visible"
        style={{ pointerEvents: "none" }}
        xmlns="http://www.w3.org/2000/svg"
      />
      {drawingCount > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20" style={{ pointerEvents: "auto" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              drawingCornersRef.current.pop();
              setDrawingCount(drawingCornersRef.current.length);
              onDrawingCountChangeRef.current?.(drawingCornersRef.current.length);
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
            Deshacer último punto
          </button>
        </div>
      )}
    </div>
  );
}
