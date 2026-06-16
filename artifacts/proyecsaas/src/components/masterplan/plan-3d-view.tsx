"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Sky } from "@react-three/drei";
import * as THREE from "three";

type Pt = { x: number; y: number };

type VisualObject = {
  id: string;
  type: string;
  geometryKind: string;
  geometry: any;
  fillColor: string | null;
  strokeColor: string | null;
  strokeWidth: number | null;
};

type Lot = { id: string; status: string; pathData: string | null; areaSqm?: number | null };

// Área (shoelace) de un polígono en unidades del plano.
function polygonArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  }
  return Math.abs(a / 2);
}

// Metros por unidad del plano, estimado con el área real (m²) de los lotes.
function computeMetersPerUnit(lots: Lot[]): number | null {
  const samples: number[] = [];
  for (const l of lots) {
    if (!l.areaSqm || l.areaSqm <= 0) continue;
    const pts = pathToPoints(l.pathData);
    if (pts.length < 3) continue;
    const areaUnits = polygonArea(pts);
    if (areaUnits <= 0) continue;
    samples.push(Math.sqrt(l.areaSqm / areaUnits));
  }
  if (!samples.length) return null;
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

type ViewBox = { x: number; y: number; w: number; h: number };

const LOT_STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "#a7f3d0",
  RESERVED: "#fcd34d",
  RESERVED_PENDING: "#fcd34d",
  SOLD: "#fca5a5",
  BLOCKED: "#cbd5e1",
};

// ¿El path tiene comandos distintos de M/L/Z absolutos? (curvas, arcos, H/V, relativos)
function hasComplexCommands(d: string): boolean {
  return /[CcSsQqTtAaHhVvmlz]/.test(d);
}

// Muestrea la geometría REAL del path usando el motor SVG del navegador.
// Robusto ante curvas, arcos y comandos relativos.
function sampleSvgPath(d: string): Pt[] {
  if (typeof document === "undefined") return [];
  let svg: SVGSVGElement | null = null;
  try {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    document.body.appendChild(svg);
    const len = path.getTotalLength();
    if (!len || !Number.isFinite(len)) return [];
    const n = Math.min(220, Math.max(12, Math.round(len)));
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const p = path.getPointAtLength((i / n) * len);
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  } catch {
    return [];
  } finally {
    if (svg) svg.remove();
  }
}

// Extrae los vértices de un path SVG. Vértices exactos para M/L/Z; muestreo para el resto.
function pathToPoints(d: string | null): Pt[] {
  if (!d) return [];
  if (!hasComplexCommands(d)) {
    const nums = d.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi);
    if (nums) {
      const pts: Pt[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = parseFloat(nums[i]);
        const y = parseFloat(nums[i + 1]);
        if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
      }
      if (pts.length >= 3) return pts;
    }
  }
  return sampleSvgPath(d);
}

// Proyección plano (viewBox, y-abajo) -> mundo 3D (XZ, y = altura).
function makeProjector(vb: ViewBox) {
  const cx = vb.x + vb.w / 2;
  const cy = vb.y + vb.h / 2;
  const scale = 100 / Math.max(vb.w, vb.h);
  return {
    scale,
    X: (px: number) => (px - cx) * scale,
    Z: (py: number) => (py - cy) * scale,
  };
}

type Proj = ReturnType<typeof makeProjector>;

// Shape en XY pensado para rotar la malla -90° en X (queda plano en XZ).
function shapeFromPoints(points: Pt[], proj: Proj): THREE.Shape {
  const s = new THREE.Shape();
  points.forEach((p, i) => {
    const x = proj.X(p.x);
    const y = -proj.Z(p.y);
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  });
  s.closePath();
  return s;
}

// Polígono escalado hacia su centroide (para la franja de arena del lago).
function insetPoints(points: Pt[], factor: number): Pt[] {
  const c = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  c.x /= points.length;
  c.y /= points.length;
  return points.map((p) => ({ x: c.x + (p.x - c.x) * factor, y: c.y + (p.y - c.y) * factor }));
}

// Cinta plana (calle) directamente en el plano XZ a una altura dada.
function ribbonGeometry(points: Pt[], proj: Proj, worldWidth: number): THREE.BufferGeometry {
  const half = worldWidth / 2;
  const pw = points.map((p) => new THREE.Vector2(proj.X(p.x), proj.Z(p.y)));
  const normals = pw.map((_, i) => {
    const prev = pw[i - 1];
    const cur = pw[i];
    const next = pw[i + 1];
    const acc = new THREE.Vector2();
    if (prev) acc.add(cur.clone().sub(prev).normalize());
    if (next) acc.add(next.clone().sub(cur).normalize());
    if (acc.lengthSq() === 0) acc.set(1, 0);
    acc.normalize();
    return new THREE.Vector2(-acc.y, acc.x);
  });
  const verts: number[] = [];
  const idx: number[] = [];
  pw.forEach((p, i) => {
    const n = normals[i];
    const l = p.clone().add(n.clone().multiplyScalar(half));
    const r = p.clone().add(n.clone().multiplyScalar(-half));
    verts.push(l.x, 0, l.y, r.x, 0, r.y);
  });
  for (let i = 0; i < pw.length - 1; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    idx.push(a, b, c, b, d, c);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geom.setIndex(idx);
  geom.computeVertexNormals();
  return geom;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointInPolygon(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function FlatShape({ points, proj, color, y, roughness = 0.9, opacity = 1, metalness = 0 }: { points: Pt[]; proj: Proj; color: string; y: number; roughness?: number; opacity?: number; metalness?: number }) {
  const geom = useMemo(() => new THREE.ShapeGeometry(shapeFromPoints(points, proj)), [points, proj]);
  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} envMapIntensity={1.1} transparent={opacity < 1} opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ExtrudedBlock({ points, proj, color, height, y }: { points: Pt[]; proj: Proj; color: string; height: number; y: number }) {
  const geom = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shapeFromPoints(points, proj), { depth: height, bevelEnabled: false });
    return g;
  }, [points, proj, height]);
  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
    </mesh>
  );
}

function Ribbon({ points, proj, color, width, y }: { points: Pt[]; proj: Proj; color: string; width: number; y: number }) {
  const geom = useMemo(() => ribbonGeometry(points, proj, width), [points, proj, width]);
  return (
    <mesh geometry={geom} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

function LotParcel({ points, proj, color }: { points: Pt[]; proj: Proj; color: string }) {
  const shapeGeom = useMemo(() => new THREE.ShapeGeometry(shapeFromPoints(points, proj)), [points, proj]);
  const edgeGeom = useMemo(() => new THREE.EdgesGeometry(shapeGeom), [shapeGeom]);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <mesh geometry={shapeGeom} receiveShadow>
        <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={edgeGeom}>
        <lineBasicMaterial color="#475569" />
      </lineSegments>
    </group>
  );
}

// Centro y tamaño (mundo) de un lote a partir de sus vértices.
function lotMetrics(points: Pt[], proj: Proj) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, cx = 0, cy = 0;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;
  const minDim = Math.min(maxX - minX, maxY - minY) * proj.scale;
  return { wx: proj.X(cx), wz: proj.Z(cy), minDim };
}

// Casa simple (paredes + techo) para los lotes vendidos.
function House({ wx, wz, lotSize }: { wx: number; wz: number; lotSize: number }) {
  // Footprint chico relativo al lote (deja jardín alrededor) y perfil bajo (1 planta).
  const s = Math.max(0.4, lotSize * 0.4);
  const wallH = s * 0.48;
  const roofH = s * 0.32;
  return (
    <group position={[wx, 0, wz]}>
      <mesh position={[0, wallH / 2 + 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[s, wallH, s * 0.8]} />
        <meshStandardMaterial color="#f1ece3" roughness={0.85} />
      </mesh>
      <mesh position={[0, wallH + roofH / 2 + 0.04, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[s * 0.7, roofH, 4]} />
        <meshStandardMaterial color="#8a4a3a" roughness={0.75} />
      </mesh>
    </group>
  );
}

function Lots({ lots, proj }: { lots: Lot[]; proj: Proj }) {
  return (
    <>
      {lots.map((l) => {
        const pts = pathToPoints(l.pathData);
        if (pts.length < 3) return null;
        const built = l.status === "SOLD";
        const m = built ? lotMetrics(pts, proj) : null;
        return (
          <group key={l.id}>
            <LotParcel points={pts} proj={proj} color={LOT_STATUS_COLOR[l.status] ?? "#e5e7eb"} />
            {m && <House wx={m.wx} wz={m.wz} lotSize={m.minDim} />}
          </group>
        );
      })}
    </>
  );
}

function Tree({ wx, wz, s }: { wx: number; wz: number; s: number }) {
  return (
    <group position={[wx, 0, wz]}>
      <mesh position={[0, s * 0.4, 0]} castShadow>
        <cylinderGeometry args={[s * 0.08, s * 0.11, s * 0.8, 6]} />
        <meshStandardMaterial color="#7a5230" roughness={0.9} />
      </mesh>
      <mesh position={[0, s * 1.05, 0]} castShadow>
        <icosahedronGeometry args={[s * 0.55, 0]} />
        <meshStandardMaterial color="#3f8a3f" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

function Trees({ objects, proj, worldPerMeter }: { objects: VisualObject[]; proj: Proj; worldPerMeter?: number | null }) {
  const trees = useMemo(() => {
    const green = new Set(["area_verde", "plaza"]);
    const out: { wx: number; wz: number; s: number }[] = [];
    for (const o of objects) {
      if (!green.has(o.type)) continue;
      const pts: Pt[] | undefined = o.geometry?.points;
      if (!pts || pts.length < 3) continue;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of pts) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
      const areaWorld = (maxX - minX) * (maxY - minY) * proj.scale * proj.scale;
      const count = Math.min(48, Math.max(3, Math.round(areaWorld / 18)));
      const rng = mulberry32(hashStr(o.id));
      let placed = 0, tries = 0;
      while (placed < count && tries < count * 25) {
        tries++;
        const px = minX + rng() * (maxX - minX);
        const py = minY + rng() * (maxY - minY);
        if (pointInPolygon(px, py, pts)) {
          let s: number;
          if (worldPerMeter && worldPerMeter > 0) {
            // Altura real entre ~2.4 y 4 m (tope 4 m). Altura total del árbol = s * 1.6.
            const heightM = Math.min(4, 2.4 + rng() * 1.6);
            s = (heightM * worldPerMeter) / 1.6;
          } else {
            s = 0.6 + rng() * 0.5;
          }
          out.push({ wx: proj.X(px), wz: proj.Z(py), s });
          placed++;
        }
      }
    }
    return out;
  }, [objects, proj, worldPerMeter]);

  return <>{trees.map((t, i) => <Tree key={i} wx={t.wx} wz={t.wz} s={t.s} />)}</>;
}

function SceneObjects({ objects, proj }: { objects: VisualObject[]; proj: Proj }) {
  return (
    <>
      {objects.map((o) => {
        const pts: Pt[] | null =
          (o.geometryKind === "POLYGON" || o.geometryKind === "POLYLINE") && o.geometry?.points ? o.geometry.points : null;
        if (!pts || pts.length < 2) return null;

        // Calles
        if (o.geometryKind === "POLYLINE") {
          const width = Math.max(0.2, (o.strokeWidth ?? 6) * proj.scale);
          return <Ribbon key={o.id} points={pts} proj={proj} color={o.strokeColor ?? "#6B7280"} width={width} y={0.05} />;
        }

        // Lago: arena + agua
        if (o.type === "laguna") {
          return (
            <group key={o.id}>
              <FlatShape points={pts} proj={proj} color="#E8D8A0" y={0.04} roughness={1} />
              <FlatShape points={insetPoints(pts, 0.82)} proj={proj} color="#2F6FD6" y={0.12} roughness={0.04} metalness={0.25} opacity={0.92} />
            </group>
          );
        }

        // Amenities: bloque extruido
        if (o.type === "amenity" || o.type === "cancha") {
          if (o.type === "amenity") {
            return <ExtrudedBlock key={o.id} points={pts} proj={proj} color={o.fillColor ?? "#D97706"} height={4} y={0.05} />;
          }
          // cancha: superficie a nivel
          return <FlatShape key={o.id} points={pts} proj={proj} color={o.fillColor ?? "#16A34A"} y={0.07} roughness={0.85} />;
        }

        // Áreas verdes / plaza: superficie plana
        return <FlatShape key={o.id} points={pts} proj={proj} color={o.fillColor ?? "#22C55E"} y={0.06} roughness={0.95} />;
      })}
    </>
  );
}

function CinematicCamera({ playing }: { playing: boolean }) {
  const { camera } = useThree();
  const angle = useRef(0);
  const radius = useRef(140);

  useEffect(() => {
    if (playing) {
      angle.current = Math.atan2(camera.position.z, camera.position.x);
      radius.current = Math.max(60, Math.hypot(camera.position.x, camera.position.z));
    }
  }, [playing, camera]);

  useFrame((_, delta) => {
    if (!playing) return;
    angle.current += Math.min(delta, 0.05) * 0.2;
    const r = radius.current + Math.sin(angle.current * 0.6) * (radius.current * 0.12);
    const h = 55 + Math.sin(angle.current * 0.8) * 22;
    camera.position.set(Math.cos(angle.current) * r, h, Math.sin(angle.current) * r);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function Plan3DView({ objects, lots = [], viewBox }: { objects: VisualObject[]; lots?: Lot[]; viewBox: ViewBox }) {
  const [playing, setPlaying] = useState(false);
  const proj = useMemo(() => makeProjector(viewBox), [viewBox]);
  const worldPerMeter = useMemo(() => {
    const mpu = computeMetersPerUnit(lots);
    return mpu ? proj.scale / mpu : null;
  }, [lots, proj]);
  const groundSize = 100 * 1.6;

  return (
    <div className="relative h-full w-full bg-gradient-to-b from-sky-200 to-slate-100 dark:from-slate-800 dark:to-slate-950">
      <Canvas shadows camera={{ position: [70, 60, 90], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, toneMappingExposure: 1.05 }}>
        <fog attach="fog" args={["#d4dEea", 240, 680]} />
        <Sky sunPosition={[60, 40, 30]} turbidity={6} rayleigh={1.2} />
        <ambientLight intensity={0.45} />
        <hemisphereLight args={["#cfe0ff", "#b9a98a", 0.55]} />
        <directionalLight
          position={[60, 90, 40]}
          intensity={1.6}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-120}
          shadow-camera-right={120}
          shadow-camera-top={120}
          shadow-camera-bottom={-120}
        />
        <Environment preset="park" />

        {/* Terreno */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[groundSize, groundSize]} />
          <meshStandardMaterial color="#cdbf9a" roughness={1} />
        </mesh>

        <Lots lots={lots} proj={proj} />
        <SceneObjects objects={objects} proj={proj} />
        <Trees objects={objects} proj={proj} worldPerMeter={worldPerMeter} />

        <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={groundSize} blur={2.4} far={20} />
        <CinematicCamera playing={playing} />
        <OrbitControls enabled={!playing} enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} minDistance={20} maxDistance={400} target={[0, 0, 0]} />
      </Canvas>

      <div className="absolute bottom-5 left-5 z-10">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900/85 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-slate-900"
        >
          {playing ? "⏸ Detener recorrido" : "▶ Recorrido cinematográfico"}
        </button>
      </div>
    </div>
  );
}
