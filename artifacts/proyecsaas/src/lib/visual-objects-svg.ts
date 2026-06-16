// Genera markup SVG (string) de los objetos visuales del editor para inyectarlo
// dentro del masterplanSVG, de modo que el mapa público los proyecte sobre el
// satélite con la misma transformación. Usa estilos inline !important para
// sobrevivir al estilado "blueprint" (stroke blanco) que el mapa aplica a los lotes.

type SvgPt = { x: number; y: number };

export type VisualObjectForSvg = {
  type: string;
  geometryKind: string;
  geometry: any;
  fillColor: string | null;
  strokeColor: string | null;
  opacity: number | null;
  strokeWidth: number | null;
};

function ptsStr(pts: SvgPt[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(" ");
}

// Curva cerrada suave (Catmull-Rom → Bézier) — igual que el editor (para el lago).
function smoothClosedPath(points: SvgPt[]): string {
  const n = points.length;
  if (n < 3) return `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
  const at = (i: number) => points[((i % n) + n) % n];
  let d = `M ${at(0).x} ${at(0).y}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return `${d} Z`;
}

export function buildVisualObjectsSvg(objects: VisualObjectForSvg[], vbHeight = 1000): string {
  const parts: string[] = [];
  for (const o of objects) {
    const isPath = o.geometryKind === "POLYGON" || o.geometryKind === "POLYLINE";
    const pts: SvgPt[] | null = isPath && Array.isArray(o.geometry?.points) ? o.geometry.points : null;
    if (!pts || pts.length < 2) continue;

    const fill = o.fillColor ?? "none";
    const stroke = o.strokeColor ?? "#166534";
    const sw = o.strokeWidth ?? 2;
    const op = o.opacity ?? 0.5;

    if (o.geometryKind === "POLYLINE") {
      parts.push(
        `<polyline points="${ptsStr(pts)}" stroke-linecap="butt" stroke-linejoin="round" style="fill:none !important;stroke:${stroke} !important;stroke-width:${sw} !important;opacity:${op} !important;filter:none !important;" />`,
      );
      continue;
    }

    if (o.type === "laguna") {
      const d = smoothClosedPath(pts);
      const sandW = Math.max(sw * 2, vbHeight / 90);
      parts.push(
        `<path d="${d}" stroke-linejoin="round" style="fill:none !important;stroke:#E8D8A0 !important;stroke-width:${sandW} !important;opacity:1 !important;filter:none !important;" />`,
      );
      parts.push(
        `<path d="${d}" style="fill:${fill} !important;fill-opacity:${op} !important;stroke:${stroke} !important;stroke-width:${sw} !important;opacity:1 !important;filter:none !important;" />`,
      );
      continue;
    }

    // Polígonos: área verde, plaza, cancha, amenity
    parts.push(
      `<polygon points="${ptsStr(pts)}" style="fill:${fill} !important;fill-opacity:${op} !important;stroke:${stroke} !important;stroke-width:${sw} !important;opacity:1 !important;filter:none !important;" />`,
    );
  }

  if (!parts.length) return "";
  return `<g class="rp-visual-objects" style="pointer-events:none">${parts.join("")}</g>`;
}

// Inyecta el markup dentro del SVG del plano (antes del último </svg>).
export function injectVisualObjectsIntoSvg(
  svg: string | null,
  objects: VisualObjectForSvg[],
  vbHeight = 1000,
): string | null {
  if (!svg) return svg;
  const markup = buildVisualObjectsSvg(objects, vbHeight);
  if (!markup) return svg;
  const idx = svg.lastIndexOf("</svg>");
  if (idx === -1) return svg;
  return svg.slice(0, idx) + markup + svg.slice(idx);
}
