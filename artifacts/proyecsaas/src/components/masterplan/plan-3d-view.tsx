"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
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

type ViewBox = { x: number; y: number; w: number; h: number };

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

function FlatShape({ points, proj, color, y, roughness = 0.9, opacity = 1 }: { points: Pt[]; proj: Proj; color: string; y: number; roughness?: number; opacity?: number }) {
  const geom = useMemo(() => new THREE.ShapeGeometry(shapeFromPoints(points, proj)), [points, proj]);
  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} metalness={0} transparent={opacity < 1} opacity={opacity} side={THREE.DoubleSide} />
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
              <FlatShape points={insetPoints(pts, 0.82)} proj={proj} color="#3B82F6" y={0.12} roughness={0.08} opacity={0.85} />
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

export default function Plan3DView({ objects, viewBox }: { objects: VisualObject[]; viewBox: ViewBox }) {
  const proj = useMemo(() => makeProjector(viewBox), [viewBox]);
  const groundSize = 100 * 1.6;

  return (
    <div className="h-full w-full bg-gradient-to-b from-sky-200 to-slate-100 dark:from-slate-800 dark:to-slate-950">
      <Canvas shadows camera={{ position: [70, 60, 90], fov: 45 }} dpr={[1, 2]}>
        <Sky sunPosition={[60, 40, 30]} turbidity={6} rayleigh={1.2} />
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[60, 90, 40]}
          intensity={1.5}
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

        <SceneObjects objects={objects} proj={proj} />

        <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={groundSize} blur={2.4} far={20} />
        <OrbitControls enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} minDistance={20} maxDistance={400} target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}
