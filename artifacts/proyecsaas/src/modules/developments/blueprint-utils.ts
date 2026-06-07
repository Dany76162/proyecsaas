// Adapted from SevenToop blueprint-utils — marker renamed to RAICESPILOT_BLUEPRINT_META
// SVG sanitization: client uses DOMParser; server uses regex fallback (no DOM available).

export type BlueprintSourceKind = "svg" | "dxf" | "dwg" | "pdf" | "image" | "unknown";
export type BlueprintProcessingMode = "detected-lots" | "visual-only" | "source-only";

export interface BlueprintEmbeddedMeta {
  sourceKind: BlueprintSourceKind;
  sourceName?: string;
  sourceMime?: string;
  sourceUrl?: string;
  processingMode: BlueprintProcessingMode;
  warnings?: string[];
  detectedPaths?: number;
  detectedLots?: number;
  anchorPoints?: { x: number; y: number }[];
  savedAt?: string;
}

const BLUEPRINT_META_MARKER = "RAICESPILOT_BLUEPRINT_META:";

export interface ExtractedPath {
  id: string;
  internalId?: number;
  pathData: string;
  center: { x: number; y: number };
  lotNumber?: string;
  areaSqm?: number;
}

export interface BlueprintDetectionAssessment {
  mode: "detected-lots" | "source-only";
  usablePaths: ExtractedPath[];
  warnings: string[];
  syntheticLabelsApplied: boolean;
  metrics: {
    totalPaths: number;
    closedPaths: number;
    plausiblePolygons: number;
    labeledPolygons: number;
    usableRatio: number;
    width: number;
    height: number;
  };
}

function shoelaceArea(vertices: { x: number; y: number }[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

function cleanMText(raw: string): string {
  return raw
    .replace(/\{\\[^;]*;/g, "")
    .replace(/\{/g, "")
    .replace(/\}/g, "")
    .replace(/\\P/gi, " ")
    .replace(/\\~/g, " ")
    .replace(/\\\\/g, "")
    .trim();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function detectBlueprintSourceKind(file: { name?: string; type?: string }): BlueprintSourceKind {
  const name = (file.name ?? "").toLowerCase();
  const type = (file.type ?? "").toLowerCase();
  if (name.endsWith(".svg") || type.includes("svg")) return "svg";
  if (name.endsWith(".dxf") || type.includes("dxf")) return "dxf";
  if (name.endsWith(".dwg") || type.includes("dwg") || type.includes("acad") || type.includes("autocad")) return "dwg";
  if (name.endsWith(".pdf") || type.includes("pdf")) return "pdf";
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp") || type.startsWith("image/")) return "image";
  return "unknown";
}

export function withBlueprintMeta(svgString: string, meta: BlueprintEmbeddedMeta): string {
  const cleanMeta = JSON.stringify(meta).replace(/-->/g, "--&gt;");
  const stripped = svgString.replace(/<!--RAICESPILOT_BLUEPRINT_META:[\s\S]*?-->/g, "").trim();
  return `<!--${BLUEPRINT_META_MARKER}${cleanMeta}-->\n${stripped}`;
}

export function extractBlueprintMeta(svgString: string | null | undefined): BlueprintEmbeddedMeta | null {
  if (!svgString) return null;
  const match = svgString.match(/<!--RAICESPILOT_BLUEPRINT_META:([\s\S]*?)-->/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as BlueprintEmbeddedMeta;
  } catch {
    return null;
  }
}

/**
 * Sanitizes SVG content to prevent XSS.
 * Client: uses DOMParser + XMLSerializer (full DOM traversal).
 * Server: uses regex-based fallback (removes dangerous tags and on* attributes).
 */
export function sanitizeBlueprintSVG(svgString: string): string {
  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    // ── Client-side: full DOM sanitization ──────────────────────────────
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svg = doc.documentElement;

    if (!svg || svg.tagName.toLowerCase() !== "svg") {
      throw new Error("El archivo SVG no tiene una estructura válida.");
    }

    // Remove dangerous elements
    svg.querySelectorAll("script, foreignObject, iframe, object, embed, use").forEach((node) =>
      node.remove(),
    );

    // Remove on* attributes and javascript: hrefs
    svg.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim().toLowerCase();
        if (name.startsWith("on")) {
          node.removeAttribute(attr.name);
        } else if ((name === "href" || name === "xlink:href") && value.startsWith("javascript:")) {
          node.removeAttribute(attr.name);
        }
      });
    });

    return new XMLSerializer().serializeToString(svg);
  }

  // ── Server-side: regex-based fallback ──────────────────────────────────
  return svgString
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    .replace(/(?:href|xlink:href)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, "");
}

export function buildImageBlueprintSVG(options: {
  imageUrl: string;
  width: number;
  height: number;
  meta: BlueprintEmbeddedMeta;
}): string {
  const width = Math.max(1, Math.round(options.width));
  const height = Math.max(1, Math.round(options.height));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#0f172a" />
<image href="${escapeXml(options.imageUrl)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />
</svg>`;
  return withBlueprintMeta(svg, options.meta);
}

export function buildFallbackBlueprintSVG(options: {
  title: string;
  subtitle: string;
  lines: string[];
  meta: BlueprintEmbeddedMeta;
}): string {
  const lines = options.lines.slice(0, 4).map((line) => escapeXml(line));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
<rect width="1200" height="800" fill="#0f172a" />
<rect x="80" y="80" width="1040" height="640" rx="28" fill="#111827" stroke="#334155" stroke-width="4" />
<text x="120" y="190" fill="#f8fafc" font-size="46" font-family="Arial, sans-serif" font-weight="700">${escapeXml(options.title)}</text>
<text x="120" y="250" fill="#94a3b8" font-size="28" font-family="Arial, sans-serif">${escapeXml(options.subtitle)}</text>
${lines.map((line, i) => `<text x="120" y="${340 + i * 56}" fill="#cbd5e1" font-size="26" font-family="Arial, sans-serif">${line}</text>`).join("\n")}
</svg>`;
  return withBlueprintMeta(svg, options.meta);
}

function extractPathBounds(pathData: string) {
  const coords = pathData.match(/[-+]?[0-9]*\.?[0-9]+/g)?.map(Number) ?? [];
  if (coords.length < 4) return null;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i + 1 < coords.length; i += 2) {
    xs.push(coords[i]);
    ys.push(coords[i + 1]);
  }
  if (!xs.length || !ys.length) return null;
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function sanitizeDetectedLotLabel(label?: string): string | null {
  if (!label) return null;
  const clean = label.trim().toUpperCase();
  if (!clean || clean.length > 10) return null;
  if (!/^[A-Z0-9\-_.\/]+$/.test(clean)) return null;
  if (/^[A-Z]$/.test(clean)) return null;
  if (/^\d{4,}$/.test(clean)) return null;
  return clean;
}

function formatDisplayedLotLabel(label?: string): string | null {
  if (!label) return null;
  const trimmed = label.trim();
  const syntheticMatch = trimmed.match(/^L(\d+)$/i);
  if (syntheticMatch) return syntheticMatch[1];
  return trimmed;
}

export function assessBlueprintDetection(paths: ExtractedPath[]): BlueprintDetectionAssessment {
  const closedPaths = paths.filter((path) => {
    if (!path.pathData.includes("Z")) return false;
    if (!Number.isFinite(path.center.x) || !Number.isFinite(path.center.y)) return false;
    if (!path.areaSqm || !Number.isFinite(path.areaSqm) || path.areaSqm <= 0) return false;
    return true;
  });

  if (closedPaths.length === 0) {
    return {
      mode: "source-only",
      usablePaths: [],
      warnings: ["No se detectaron polígonos cerrados utilizables."],
      syntheticLabelsApplied: false,
      metrics: { totalPaths: paths.length, closedPaths: 0, plausiblePolygons: 0, labeledPolygons: 0, usableRatio: 0, width: 0, height: 0 },
    };
  }

  const sortedAreas = closedPaths.map((p) => p.areaSqm!).sort((a, b) => a - b);
  const medianArea = sortedAreas[Math.floor(sortedAreas.length / 2)] ?? 0;
  const plausiblePolygons = closedPaths.filter((p) => {
    const area = p.areaSqm ?? 0;
    return medianArea > 0 && area >= medianArea * 0.01 && area <= medianArea * 80;
  });

  const bounds = plausiblePolygons.reduce(
    (acc, path) => {
      const b = extractPathBounds(path.pathData);
      if (!b) return acc;
      acc.minX = Math.min(acc.minX, b.minX);
      acc.minY = Math.min(acc.minY, b.minY);
      acc.maxX = Math.max(acc.maxX, b.maxX);
      acc.maxY = Math.max(acc.maxY, b.maxY);
      return acc;
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );

  const width = Number.isFinite(bounds.maxX - bounds.minX) ? bounds.maxX - bounds.minX : 0;
  const height = Number.isFinite(bounds.maxY - bounds.minY) ? bounds.maxY - bounds.minY : 0;
  const usableRatio = plausiblePolygons.length / Math.max(paths.length, 1);
  const warnings: string[] = [];

  const sanitized = plausiblePolygons.map((path) => ({
    ...path,
    lotNumber: sanitizeDetectedLotLabel(path.lotNumber) ?? undefined,
  }));

  const geometryReliable = plausiblePolygons.length >= 3 && usableRatio >= 0.05 && width > 0 && height > 0;

  if (!geometryReliable) {
    if (plausiblePolygons.length < 3) warnings.push("Se detectaron muy pocos polígonos cerrados para un loteo confiable.");
    if (usableRatio < 0.05) warnings.push("La proporción entre geometría útil y trazos totales es demasiado baja.");
    if (width <= 0 || height <= 0) warnings.push("La geometría detectada no tiene una dispersión espacial útil.");
    return {
      mode: "source-only",
      usablePaths: [],
      warnings,
      syntheticLabelsApplied: false,
      metrics: { totalPaths: paths.length, closedPaths: closedPaths.length, plausiblePolygons: plausiblePolygons.length, labeledPolygons: sanitized.filter((p) => !!p.lotNumber).length, usableRatio, width, height },
    };
  }

  const saneLabelCount = sanitized.filter((p) => !!p.lotNumber).length;
  const shouldUseSyntheticLabels = saneLabelCount < Math.max(5, Math.round(sanitized.length * 0.12));

  const usablePaths = sanitized.map((path, index) => ({
    ...path,
    lotNumber: shouldUseSyntheticLabels ? `L${path.internalId ?? index + 1}` : path.lotNumber ?? `L${path.internalId ?? index + 1}`,
  }));

  if (shouldUseSyntheticLabels) warnings.push("Se usaron etiquetas correlativas por no detectar suficientes números de lote.");

  return {
    mode: "detected-lots",
    usablePaths,
    warnings,
    syntheticLabelsApplied: shouldUseSyntheticLabels,
    metrics: { totalPaths: paths.length, closedPaths: closedPaths.length, plausiblePolygons: plausiblePolygons.length, labeledPolygons: saneLabelCount, usableRatio, width, height },
  };
}

export function buildDetectedLotsSVG(paths: ExtractedPath[]): string {
  if (paths.length === 0) {
    return buildFallbackBlueprintSVG({
      title: "Plano recibido", subtitle: "Sin geometría útil",
      lines: ["No se detectaron lotes confiables."],
      meta: { sourceKind: "dxf", processingMode: "source-only" },
    });
  }

  const bounds = paths.reduce(
    (acc, path) => {
      const b = extractPathBounds(path.pathData);
      if (!b) return acc;
      acc.minX = Math.min(acc.minX, b.minX);
      acc.minY = Math.min(acc.minY, b.minY);
      acc.maxX = Math.max(acc.maxX, b.maxX);
      acc.maxY = Math.max(acc.maxY, b.maxY);
      return acc;
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );

  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const padding = Math.max(width, height) * 0.06;

  const pathElements = paths.map((path) => {
    const dataAttrs = path.lotNumber ? ` data-lot="${path.lotNumber}"` : "";
    const b = extractPathBounds(path.pathData);
    const lotW = b ? Math.max(0.1, b.maxX - b.minX) : width / 40;
    const lotH = b ? Math.max(0.1, b.maxY - b.minY) : height / 40;
    const sw = Math.max(0.5, Math.min(lotW, lotH) * 0.02);
    return `<path d="${path.pathData}"${dataAttrs} fill="none" stroke="#10b981" stroke-width="${sw}" vector-effect="non-scaling-stroke" />`;
  });

  const labelElements = paths
    .map((path) => {
      const label = formatDisplayedLotLabel(path.lotNumber);
      if (!label) return "";
      const b = extractPathBounds(path.pathData);
      const lotW = b ? Math.max(0.1, b.maxX - b.minX) : width / 40;
      const lotH = b ? Math.max(0.1, b.maxY - b.minY) : height / 40;
      const fontSize = Math.max(1.2, Math.min(Math.min(lotW, lotH) * 0.72, 3.8));
      return `<text x="${path.center.x}" y="${path.center.y}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="#f8fafc" font-family="monospace" font-weight="700" pointer-events="none">${escapeXml(label)}</text>`;
    })
    .filter(Boolean);

  return `<svg viewBox="${bounds.minX - padding} ${bounds.minY - padding} ${width + padding * 2} ${height + padding * 2}" xmlns="http://www.w3.org/2000/svg">
${pathElements.join("\n")}
${labelElements.join("\n")}
</svg>`;
}

// ─── DXF parser (ported from SevenToop) ───────────────────────────────────────

export function parseBlueprintDXF(dxfString: string): { svg: string; paths: ExtractedPath[] } {
  const lines = dxfString.split(/\r?\n/);
  const rawEntities: any[] = [];
  let currentEntity: string | null = null;
  let currentLayer = "0";
  let vertices: { x: number; y: number }[] = [];
  let isClosed = false;
  let inPolyline = false;
  let viewbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  let lx1 = 0, ly1 = 0, lx2 = 0, ly2 = 0;
  let ccx = 0, ccy = 0, cr = 0;
  let ax = 0, ay = 0, ar = 0, aStart = 0, aEnd = 0;
  let tx = 0, ty = 0, txt = "", tHeight = 2.5;
  let mx = 0, my = 0, mtxt = "", mtHeight = 2.5;

  const updateViewbox = (x: number, y: number) => {
    if (x < viewbox.minX) viewbox.minX = x;
    if (y < viewbox.minY) viewbox.minY = y;
    if (x > viewbox.maxX) viewbox.maxX = x;
    if (y > viewbox.maxY) viewbox.maxY = y;
  };

  const collectEntity = (type: string, data: any) => {
    rawEntities.push({ type, layer: currentLayer, ...data });
    if (data.vertices) data.vertices.forEach((v: any) => updateViewbox(v.x, v.y));
    if (data.x1 !== undefined) { updateViewbox(data.x1, data.y1); updateViewbox(data.x2, data.y2); }
    if (data.cx !== undefined) { updateViewbox(data.cx - data.r, data.cy - data.r); updateViewbox(data.cx + data.r, data.cy + data.r); }
  };

  const resetEntityState = () => {
    vertices = []; isClosed = false;
    lx1 = 0; ly1 = 0; lx2 = 0; ly2 = 0;
    ccx = 0; ccy = 0; cr = 0;
    ax = 0; ay = 0; ar = 0; aStart = 0; aEnd = 0;
    tx = 0; ty = 0; txt = ""; tHeight = 2.5;
    mx = 0; my = 0; mtxt = ""; mtHeight = 2.5;
  };

  const flushCurrentEntity = () => {
    if (currentEntity === "LWPOLYLINE" && vertices.length > 0) {
      let geomClosed = isClosed;
      let verts = [...vertices];
      if (!geomClosed && verts.length >= 4) {
        const first = verts[0], last = verts[verts.length - 1];
        const epsilon = Math.max(0.001, Math.hypot(verts[1].x - verts[0].x, verts[1].y - verts[0].y) * 0.01);
        if (Math.abs(first.x - last.x) < epsilon && Math.abs(first.y - last.y) < epsilon) { geomClosed = true; verts = verts.slice(0, -1); }
      }
      collectEntity("LWPOLYLINE", { vertices: verts, isClosed: geomClosed });
    } else if (currentEntity === "LINE") {
      collectEntity("LINE", { x1: lx1, y1: ly1, x2: lx2, y2: ly2 });
    } else if (currentEntity === "CIRCLE" && cr > 0) {
      collectEntity("CIRCLE", { cx: ccx, cy: ccy, r: cr });
    } else if (currentEntity === "ARC" && ar > 0) {
      collectEntity("ARC", { cx: ax, cy: ay, r: ar, startAngle: aStart, endAngle: aEnd });
    } else if (currentEntity === "TEXT" && txt.trim()) {
      collectEntity("TEXT", { x: tx, y: ty, text: txt, height: tHeight });
    } else if (currentEntity === "MTEXT" && mtxt.trim()) {
      collectEntity("MTEXT", { x: mx, y: my, text: mtxt, height: mtHeight });
    } else if (currentEntity === "SEQEND" && inPolyline && vertices.length > 0) {
      collectEntity("POLYLINE", { vertices: [...vertices], isClosed });
      inPolyline = false;
    }
    resetEntityState();
  };

  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = lines[i].trim();
    const value = lines[i + 1]?.trim();
    if (value === undefined) break;
    if (code === "0") { flushCurrentEntity(); if (value === "POLYLINE") inPolyline = true; currentEntity = value; continue; }
    if (code === "8") { currentLayer = value; continue; }
    if (currentEntity === "LWPOLYLINE") {
      if (code === "10") vertices.push({ x: parseFloat(value), y: 0 });
      else if (code === "20" && vertices.length > 0) vertices[vertices.length - 1].y = parseFloat(value);
      else if (code === "70") isClosed = (parseInt(value) & 1) === 1;
    } else if (currentEntity === "VERTEX" && inPolyline) {
      if (code === "10") vertices.push({ x: parseFloat(value), y: 0 });
      else if (code === "20" && vertices.length > 0) vertices[vertices.length - 1].y = parseFloat(value);
    } else if (currentEntity === "LINE") {
      if (code === "10") lx1 = parseFloat(value); else if (code === "20") ly1 = parseFloat(value);
      else if (code === "11") lx2 = parseFloat(value); else if (code === "21") ly2 = parseFloat(value);
    } else if (currentEntity === "CIRCLE") {
      if (code === "10") ccx = parseFloat(value); else if (code === "20") ccy = parseFloat(value);
      else if (code === "40") cr = parseFloat(value);
    } else if (currentEntity === "ARC") {
      if (code === "10") ax = parseFloat(value); else if (code === "20") ay = parseFloat(value);
      else if (code === "40") ar = parseFloat(value);
      else if (code === "50") aStart = parseFloat(value); else if (code === "51") aEnd = parseFloat(value);
    } else if (currentEntity === "TEXT") {
      if (code === "10") tx = parseFloat(value); else if (code === "20") ty = parseFloat(value);
      else if (code === "40") tHeight = parseFloat(value); else if (code === "1") txt = value;
    } else if (currentEntity === "MTEXT") {
      if (code === "10") mx = parseFloat(value); else if (code === "20") my = parseFloat(value);
      else if (code === "40") mtHeight = parseFloat(value);
      else if (code === "1" || code === "3") mtxt += value;
    } else if (currentEntity === "POLYLINE" && inPolyline) {
      if (code === "70") isClosed = (parseInt(value) & 1) === 1;
    }
  }
  flushCurrentEntity();

  const width = viewbox.maxX - viewbox.minX || 1000;
  const height = viewbox.maxY - viewbox.minY || 1000;
  const padding = Math.max(width, height) * 0.05;
  const vMinX = viewbox.minX - padding;
  const vHeight = height + padding * 2;
  const flipY = (y: number) => viewbox.maxY - (y - viewbox.minY);

  const closedPolyMeta = new Map<number, { cx: number; cy: number; area: number }>();
  rawEntities.forEach((ent, idx) => {
    if (ent.type.includes("POLYLINE") && ent.isClosed && ent.vertices?.length >= 3) {
      const cx = ent.vertices.reduce((s: number, v: any) => s + v.x, 0) / ent.vertices.length;
      const cy = ent.vertices.reduce((s: number, v: any) => s + v.y, 0) / ent.vertices.length;
      const area = shoelaceArea(ent.vertices);
      closedPolyMeta.set(idx, { cx, cy, area });
    }
  });

  const polygonLabels = new Map<number, string>();
  const textLabels = rawEntities.filter((ent) => (ent.type === "TEXT" || ent.type === "MTEXT") && ent.text?.trim());
  const labelBestMatch = new Map<string, { idx: number; dist: number }>();

  for (const label of textLabels) {
    const clean = cleanMText(label.text);
    if (!clean || clean.length > 10) continue;
    if (!/^[A-Za-z0-9áéíóúÁÉÍÓÚ\-_./]+$/.test(clean)) continue;
    if (/^\d+\.\d+$/.test(clean)) continue;
    let minDist = Infinity, bestIdx = -1;
    for (const [idx, { cx, cy }] of Array.from(closedPolyMeta)) {
      const dist = Math.hypot(label.x - cx, label.y - cy);
      if (dist < minDist) { minDist = dist; bestIdx = idx; }
    }
    if (bestIdx < 0) continue;
    const meta = closedPolyMeta.get(bestIdx)!;
    if (minDist > Math.sqrt(meta.area) * 3.0 + 0.5) continue;
    const existing = labelBestMatch.get(clean);
    if (!existing || minDist < existing.dist) labelBestMatch.set(clean, { idx: bestIdx, dist: minDist });
  }

  const sortedMatches = Array.from(labelBestMatch.entries()).sort((a, b) => a[1].dist - b[1].dist);
  for (const [label, { idx }] of sortedMatches) {
    if (!polygonLabels.has(idx)) polygonLabels.set(idx, label);
  }

  const paths: ExtractedPath[] = [];
  const pathElements: string[] = [];
  const textElements: string[] = [];
  const labelFontSize = Math.min(width, height) / 60;
  const strokeW = width / 1500;

  rawEntities.forEach((ent, idx) => {
    let d = "";
    let entVertices: { x: number; y: number }[] = [];

    if (ent.type.includes("POLYLINE")) {
      entVertices = ent.vertices.map((v: any) => ({ x: v.x, y: flipY(v.y) }));
      d = `M ${entVertices[0].x} ${entVertices[0].y}`;
      for (let j = 1; j < entVertices.length; j++) d += ` L ${entVertices[j].x} ${entVertices[j].y}`;
      if (ent.isClosed) d += " Z";
    } else if (ent.type === "LINE") {
      entVertices = [{ x: ent.x1, y: flipY(ent.y1) }, { x: ent.x2, y: flipY(ent.y2) }];
      d = `M ${entVertices[0].x} ${entVertices[0].y} L ${entVertices[1].x} ${entVertices[1].y}`;
    } else if (ent.type === "CIRCLE") {
      const fcy = flipY(ent.cy);
      d = `M ${ent.cx - ent.r},${fcy} a ${ent.r},${ent.r} 0 1,0 ${ent.r * 2},0 a ${ent.r},${ent.r} 0 1,0 ${-ent.r * 2},0`;
      entVertices = [{ x: ent.cx, y: fcy }];
    } else if (ent.type === "ARC") {
      const fcy = flipY(ent.cy);
      const sr = (ent.startAngle * Math.PI) / 180, er = (ent.endAngle * Math.PI) / 180;
      const sx = ent.cx + ent.r * Math.cos(sr), sy = fcy - ent.r * Math.sin(sr);
      const ex = ent.cx + ent.r * Math.cos(er), ey = fcy - ent.r * Math.sin(er);
      let angleDiff = ent.endAngle - ent.startAngle;
      if (angleDiff < 0) angleDiff += 360;
      d = `M ${sx},${sy} A ${ent.r},${ent.r} 0 ${angleDiff > 180 ? 1 : 0},0 ${ex},${ey}`;
      entVertices = [{ x: ent.cx, y: fcy }];
    } else if (ent.type === "TEXT" || ent.type === "MTEXT") {
      const clean = cleanMText(ent.text);
      if (clean) textElements.push(`<text x="${ent.x}" y="${flipY(ent.y)}" font-size="${ent.height || labelFontSize}" fill="#94a3b8" font-family="sans-serif" pointer-events="none">${clean}</text>`);
    }

    if (!d) return;

    const cx = entVertices.reduce((s, v) => s + v.x, 0) / entVertices.length;
    const cy = entVertices.reduce((s, v) => s + v.y, 0) / entVertices.length;
    const lotNumber = polygonLabels.get(idx);
    const polyMeta = closedPolyMeta.get(idx);
    const area = polyMeta?.area;

    let shouldFill = d.includes("Z");
    if (shouldFill && entVertices.length >= 3) {
      const entW = Math.max(...entVertices.map((v) => v.x)) - Math.min(...entVertices.map((v) => v.x));
      const entH = Math.max(...entVertices.map((v) => v.y)) - Math.min(...entVertices.map((v) => v.y));
      if (entW * entH > width * height * 0.4 || entW > width * 0.7 || entH > height * 0.7) shouldFill = false;
    }

    paths.push({ id: `dxf-${idx}-${ent.layer}`, pathData: d, center: { x: cx, y: cy }, lotNumber, areaSqm: area });
    pathElements.push(`<path id="dxf-${idx}-${ent.layer}" d="${d}"${lotNumber ? ` data-lot="${lotNumber}"` : ""} fill="${shouldFill ? "rgba(16,185,129,0.15)" : "none"}" stroke="#10b981" stroke-width="${strokeW}" vector-effect="non-scaling-stroke" />`);
  });

  const closedPaths = paths.filter((p) => p.pathData.includes("Z"));
  if (closedPaths.length > 0) {
    const allCY = closedPaths.map((p) => p.center.y);
    const rowH = Math.max((Math.max(...allCY) - Math.min(...allCY)) * 0.05, 5);
    closedPaths
      .sort((a, b) => { const rA = Math.round(a.center.y / rowH), rB = Math.round(b.center.y / rowH); return rA !== rB ? rA - rB : a.center.x - b.center.x; })
      .forEach((p, i) => { p.internalId = i + 1; });
  }

  const svg = `<svg viewBox="${vMinX} ${viewbox.minY - padding} ${width + padding * 2} ${vHeight}" xmlns="http://www.w3.org/2000/svg">
${pathElements.join("\n")}
${textElements.join("\n")}
</svg>`;

  return { svg, paths };
}

// ─── File validation (server-side) ────────────────────────────────────────────

export function validateBlueprintFile(buffer: Buffer, filename: string, mimeType: string): {
  ok: boolean;
  detectedType: "svg" | "dxf" | "dwg" | "pdf" | "png" | "jpg" | "webp" | null;
  error?: string;
} {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const mime = mimeType.toLowerCase();

  let detectedType: "svg" | "dxf" | "dwg" | "pdf" | "png" | "jpg" | "webp" | null = null;
  if (ext === "svg" || mime.includes("svg")) detectedType = "svg";
  else if (ext === "dxf" || mime.includes("dxf")) detectedType = "dxf";
  else if (ext === "dwg" || mime.includes("acad") || mime.includes("autocad")) detectedType = "dwg";
  else if (ext === "pdf" || mime.includes("pdf")) detectedType = "pdf";
  else if (ext === "png" || mime.includes("png")) detectedType = "png";
  else if (ext === "jpg" || ext === "jpeg" || mime.includes("jpeg")) detectedType = "jpg";
  else if (ext === "webp" || mime.includes("webp")) detectedType = "webp";

  if (!detectedType) return { ok: false, detectedType: null, error: "Formato no soportado. Use DXF, SVG, PDF, PNG, JPG o WEBP." };

  if (detectedType === "dxf") {
    const header = buffer.toString("utf8", 0, Math.min(buffer.length, 2048)).toUpperCase();
    const ok = header.includes("SECTION") || header.includes("ENTITIES") || header.includes("ACADVER");
    return { ok, detectedType, error: ok ? undefined : "El DXF no tiene estructura legible (SECTION/ENTITIES/ACADVER)." };
  }
  if (detectedType === "dwg") {
    const ok = buffer.toString("ascii", 0, Math.min(buffer.length, 8)).toUpperCase().startsWith("AC10");
    return { ok, detectedType, error: ok ? undefined : "El DWG no tiene firma reconocible (AC10xx)." };
  }
  if (detectedType === "pdf") {
    const ok = buffer.toString("hex", 0, 4).toUpperCase() === "25504446";
    return { ok, detectedType, error: ok ? undefined : "El PDF está corrupto o no es un PDF válido." };
  }
  if (detectedType === "png") {
    const ok = buffer.toString("hex", 0, 4).toUpperCase() === "89504E47";
    return { ok, detectedType, error: ok ? undefined : "El PNG está corrupto." };
  }
  if (detectedType === "jpg") {
    const ok = buffer.toString("hex", 0, 2).toUpperCase() === "FFD8";
    return { ok, detectedType, error: ok ? undefined : "El JPEG está corrupto." };
  }
  if (detectedType === "webp") {
    const ok = buffer.toString("hex", 0, 4).toUpperCase() === "52494646" && buffer.toString("ascii", 8, 12) === "WEBP";
    return { ok, detectedType, error: ok ? undefined : "El WEBP está corrupto." };
  }
  if (detectedType === "svg") {
    const start = buffer.toString("utf8", 0, 200).toLowerCase();
    const ok = start.includes("<svg") || start.includes("<?xml");
    return { ok, detectedType, error: ok ? undefined : "El SVG no tiene estructura válida." };
  }

  return { ok: true, detectedType };
}
