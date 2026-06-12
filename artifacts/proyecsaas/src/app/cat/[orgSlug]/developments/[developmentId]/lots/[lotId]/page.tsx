export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import {
  MapPin, Phone, Globe, CheckCircle2,
  Ruler, Maximize, ArrowLeft, Tag,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatNum = (n: number | null | undefined) =>
  n != null ? n.toLocaleString("es-AR") : "—";

function formatPrice(priceCents: number | null | undefined, currency: string | null | undefined) {
  if (!priceCents) return null;
  const amount = priceCents / 100;
  const cur = currency ?? "USD";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency: cur, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString("es-AR")}`;
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    AVAILABLE:        { label: "Disponible", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    RESERVED_PENDING: { label: "Reservada",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
    RESERVED:         { label: "Reservada",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
    SOLD:             { label: "Vendida",    cls: "bg-red-100 text-red-700 border-red-200" },
    BLOCKED:          { label: "No disponible", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  };
  const { label, cls } = map[status] ?? { label: "—", cls: "bg-slate-100 text-slate-500 border-slate-200" };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${cls}`}>{label}</span>
  );
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

function computeSvgViewBox(paths: (string | null | undefined)[]): string | null {
  let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
  for (const p of paths) {
    if (!p) continue;
    const nums = p.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
    if (!nums) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
      if (isFinite(x) && isFinite(y)) {
        if (x < mnX) mnX = x; if (x > mxX) mxX = x;
        if (y < mnY) mnY = y; if (y > mxY) mxY = y;
      }
    }
  }
  if (!isFinite(mnX)) return null;
  const w = mxX - mnX || 1000, h = mxY - mnY || 800;
  const pad = Math.max(w, h) * 0.06;
  return `${mnX - pad} ${mnY - pad} ${w + pad * 2} ${h + pad * 2}`;
}

// ── Lot sketch data ───────────────────────────────────────────────────────────
// isLandscape: bounding box wider than tall → frente (shorter) is vertical,
//              fondo (longer) is horizontal. Swaps cota positions.

interface LotSketchData {
  viewBox: string;
  pathD: string;
  minX: number; minY: number; maxX: number; maxY: number;
  pad: number;     // margin for annotations
  fs: number;      // annotation font size (proportional to shorter side)
  ds: number;      // dimension stroke width
  isApprox: boolean;
  isLandscape: boolean; // true: svgW >= svgH → frente on right side, fondo at bottom
}

function computeLotSketchData(
  pathData: string | null | undefined,
  frontM: number | null | undefined,
  backM: number | null | undefined,
): LotSketchData | null {
  // ── Option A: real pathData ────────────────────────────────────────────────
  if (pathData) {
    const nums = pathData.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
    if (nums && nums.length >= 4) {
      let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
        if (isFinite(x) && isFinite(y)) {
          if (x < mnX) mnX = x; if (x > mxX) mxX = x;
          if (y < mnY) mnY = y; if (y > mxY) mxY = y;
        }
      }
      if (isFinite(mnX)) {
        const w = mxX - mnX || 10, h = mxY - mnY || 10;
        const maxDim = Math.max(w, h);
        const minDim = Math.min(w, h);
        // pad: generous to avoid annotation clipping in all aspect ratios
        const pad = maxDim * 0.35;
        // fs: based on shorter side so labels don't dwarf the lot shape
        const fs = minDim / 7;
        const ds = maxDim / 280;
        return {
          viewBox: `${mnX - pad} ${mnY - pad} ${w + pad * 2} ${h + pad * 2}`,
          pathD: pathData,
          minX: mnX, minY: mnY, maxX: mxX, maxY: mxY,
          pad, fs, ds,
          isApprox: false,
          // isLandscape: the SVG bounding box is wider than tall →
          // the SHORT dimension is vertical (height), so:
          //   frente (shorter side) goes on the right as a vertical cota
          //   fondo  (longer side)  goes at the bottom as a horizontal cota
          isLandscape: w >= h,
        };
      }
    }
  }

  // ── Option B: fallback proportional rectangle ─────────────────────────────
  const fw = frontM ?? 20;
  const fh = backM ?? 20;
  const maxDim = Math.max(fw, fh);
  const minDim = Math.min(fw, fh);
  const pad = maxDim * 0.35;
  const fs = minDim / 7;
  const ds = maxDim / 280;
  return {
    viewBox: `${-pad} ${-pad} ${fw + pad * 2} ${fh + pad * 2}`,
    pathD: `M 0 0 L ${fw} 0 L ${fw} ${fh} L 0 ${fh} Z`,
    minX: 0, minY: 0, maxX: fw, maxY: fh,
    pad, fs, ds,
    isApprox: !pathData,
    isLandscape: fw >= fh,
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicLotFichaPage({
  params,
}: {
  params: Promise<{ orgSlug: string; developmentId: string; lotId: string }>;
}) {
  const { orgSlug, developmentId, lotId } = await params;

  // ── 1. Validate org (public access) ─────────────────────────────────────
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true, isActive: true, deletedAt: true },
  });
  if (!org || !org.isActive || org.deletedAt) notFound();

  // ── 2. Validate development (active + public) ────────────────────────────
  const dev = await prisma.development.findFirst({
    where: {
      id: developmentId,
      Organization: { slug: orgSlug },
      status: "ACTIVE",
      publicVisible: true,
    },
    select: {
      id: true, name: true, address: true, city: true, province: true,
      logoUrl: true, companyLogoUrl: true, themeColor: true,
      contactPhone: true, contactWeb: true, contactAddress: true,
      services: true, overlayRotation: true, brochurePlanUrl: true,
    },
  });
  if (!dev) notFound();

  // ── 3. Validate lot (belongs to this development) ────────────────────────
  // NOTE: no DevelopmentReservation, Lead, User, clientName, sellerName
  const lot = await prisma.developmentLot.findFirst({
    where: { id: lotId, developmentId: dev.id },
    select: {
      id: true, lotNumber: true, manzana: true,
      areaSqm: true, frontMeters: true, backMeters: true,
      destino: true, status: true,
      etapaNombre: true, etapaColor: true,
      pathData: true, centerX: true, centerY: true,
      priceCents: true, currency: true,
    },
  });
  if (!lot) notFound();

  // ── Sibling lots for mini-plan ───────────────────────────────────────────
  const siblingLots = await prisma.developmentLot.findMany({
    where: { developmentId: dev.id },
    select: { id: true, pathData: true, centerX: true, centerY: true, lotNumber: true },
  });

  // ── Color helpers ────────────────────────────────────────────────────────
  const themeColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(dev.themeColor ?? "")
    ? dev.themeColor! : "#0D9488";
  const etapaColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(lot.etapaColor ?? "")
    ? lot.etapaColor! : themeColor;

  const price = formatPrice(lot.priceCents, lot.currency);

  // ── Mini-plan ────────────────────────────────────────────────────────────
  const lotsWithPath = siblingLots.filter((l) => !!l.pathData);
  const hasMiniPlan = lotsWithPath.length >= 2;
  const miniPlanViewBox = hasMiniPlan
    ? computeSvgViewBox(lotsWithPath.map((l) => l.pathData)) : null;
  const otherLots = lotsWithPath.filter((l) => l.id !== lotId);
  const selectedLotPath = lotsWithPath.find((l) => l.id === lotId);

  let labelFontSize = 8;
  if (miniPlanViewBox) {
    const p = miniPlanViewBox.split(" ").map(parseFloat);
    labelFontSize = Math.min(p[2] ?? 1000, p[3] ?? 800) / 50;
  }

  const lotLabel = lot.manzana
    ? `Manzana ${lot.manzana} · Lote ${lot.lotNumber}`
    : `Lote ${lot.lotNumber}`;

  // ── Croquis + compass ────────────────────────────────────────────────────
  const sketchData = computeLotSketchData(lot.pathData, lot.frontMeters, lot.backMeters);
  const compassRotation = dev.overlayRotation ?? 0;
  const hasOrientationData = compassRotation !== 0;

  // ── Cota helpers ─────────────────────────────────────────────────────────
  // Portrait (isLandscape=false): frente = horizontal (below), fondo = vertical (right)
  // Landscape (isLandscape=true): fondo = horizontal (below), frente = vertical (right)
  //
  // In both cases: the horizontal cota spans minX→maxX at y=maxY+offset
  //                the vertical cota spans minY→maxY at x=maxX+offset
  // Only the LABEL/VALUE assignment switches between portrait and landscape.
  function renderCotas(sd: LotSketchData, frontM: number | null, backM: number | null) {
    const cotaOffset = sd.pad * 0.20;
    const textGap    = sd.pad * 0.15;
    const tick       = sd.pad * 0.10;
    const sw         = sd.ds * 2;

    // Which measurement goes where:
    // Horizontal cota (below): portrait→frente, landscape→fondo
    const horizLabel = sd.isLandscape ? "Fondo"  : "Frente";
    const horizValue = sd.isLandscape ? backM    : frontM;
    // Vertical cota (right): portrait→fondo, landscape→frente
    const vertLabel  = sd.isLandscape ? "Frente" : "Fondo";
    const vertValue  = sd.isLandscape ? frontM   : backM;

    const elements: React.ReactNode[] = [];

    // ── Horizontal cota (below the lot) ──
    if (horizValue != null) {
      const y   = sd.maxY + cotaOffset;
      const mid = (sd.minX + sd.maxX) / 2;
      elements.push(
        <g key="cota-horiz">
          <line x1={sd.minX} y1={y} x2={sd.maxX} y2={y}
            stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />
          <line x1={sd.minX} y1={y - tick} x2={sd.minX} y2={y + tick}
            stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />
          <line x1={sd.maxX} y1={y - tick} x2={sd.maxX} y2={y + tick}
            stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />
          <text x={mid} y={y + textGap}
            textAnchor="middle" dominantBaseline="hanging"
            fontSize={sd.fs * 0.85} fill="#475569" fontFamily="sans-serif" fontWeight="600">
            {`${horizLabel} ${formatNum(horizValue)} m`}
          </text>
        </g>
      );
    }

    // ── Vertical cota (right of the lot) ──
    if (vertValue != null) {
      const x   = sd.maxX + cotaOffset;
      const mid = (sd.minY + sd.maxY) / 2;
      elements.push(
        <g key="cota-vert">
          <line x1={x} y1={sd.minY} x2={x} y2={sd.maxY}
            stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />
          <line x1={x - tick} y1={sd.minY} x2={x + tick} y2={sd.minY}
            stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />
          <line x1={x - tick} y1={sd.maxY} x2={x + tick} y2={sd.maxY}
            stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />
          <text
            x={x + textGap} y={mid}
            textAnchor="middle" dominantBaseline="auto"
            fontSize={sd.fs * 0.85} fill="#475569" fontFamily="sans-serif" fontWeight="600"
            transform={`rotate(90, ${x + textGap}, ${mid})`}
          >
            {`${vertLabel} ${formatNum(vertValue)} m`}
          </text>
        </g>
      );
    }
    return elements;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden px-6 py-10 text-white sm:px-10"
        style={{ background: `linear-gradient(135deg, ${themeColor}ee 0%, ${themeColor}bb 100%)` }}
      >
        {/* Decorative triangle */}
        <svg className="absolute bottom-0 right-0 h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="0,100 100,0 100,100" fill="currentColor" />
        </svg>

        <div className="relative max-w-5xl mx-auto flex flex-col gap-4">
          <Link
            href={`/cat/${orgSlug}/developments/${developmentId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white transition bg-white/10 border border-white/20 px-3.5 py-1.5 rounded-full w-fit backdrop-blur-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al desarrollo
          </Link>

          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-4">
              {dev.logoUrl && (
                <div className="bg-white/15 backdrop-blur-md p-3 rounded-xl border border-white/20 shrink-0">
                  <img src={dev.logoUrl} alt={dev.name} className="h-14 object-contain" />
                </div>
              )}
              <div>
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">
                  {org.name}
                </p>
                <h1 className="text-3xl font-black tracking-tight leading-tight">{dev.name}</h1>
                {(dev.address || dev.city || dev.province) && (
                  <p className="text-white/75 text-sm flex items-center gap-1.5 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {[dev.address, dev.city, dev.province].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>

            {/* Lote badge */}
            <div
              className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl text-white shadow-lg shrink-0 bg-white/20 border border-white/30 backdrop-blur-sm"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 leading-none">Lote</span>
              <span className="text-4xl font-black leading-tight">{lot.lotNumber}</span>
              {lot.manzana && (
                <span className="text-[9px] font-semibold opacity-75 leading-none mt-0.5">Mza {lot.manzana}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-8">

        {/* ── BLOQUE A: Plano del Desarrollo (full width, grande) ─────────── */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Plano del Desarrollo
          </p>
          {hasMiniPlan && miniPlanViewBox ? (
            <div className="rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm bg-slate-50">
              <div className="h-[320px] flex items-center justify-center p-2">
                <svg
                  viewBox={miniPlanViewBox}
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {otherLots.map((l) => (
                    <path key={l.id} d={l.pathData!}
                      fill="rgba(226,232,240,0.7)" stroke="#94a3b8"
                      strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  ))}
                  {selectedLotPath?.pathData && (
                    <path d={selectedLotPath.pathData}
                      fill={etapaColor} fillOpacity={0.85}
                      stroke={etapaColor} strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke" />
                  )}
                  {lot.centerX != null && lot.centerY != null && (
                    <text x={lot.centerX} y={lot.centerY}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={labelFontSize} fill="white" fontWeight="bold"
                      fontFamily="sans-serif"
                      stroke="rgba(0,0,0,0.35)"
                      strokeWidth={labelFontSize * 0.06}
                      paintOrder="stroke fill">
                      {lot.lotNumber}
                    </text>
                  )}
                </svg>
              </div>
              <div className="border-t border-slate-100 px-4 py-2 bg-white/80">
                <p className="text-[11px] text-slate-500 font-semibold text-center">{lotLabel} resaltado</p>
              </div>
            </div>
          ) : dev.brochurePlanUrl ? (
            <div className="rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm bg-white h-[320px]">
              {dev.brochurePlanUrl.endsWith(".pdf") ? (
                <iframe src={dev.brochurePlanUrl} className="w-full h-full" />
              ) : (
                <img src={dev.brochurePlanUrl} alt="Plano del desarrollo" className="w-full h-full object-contain" />
              )}
            </div>
          ) : (
            <div className="h-[120px] rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 text-slate-400 text-sm font-medium">
              Plano no disponible
            </div>
          )}
        </section>

        {/* ── BLOQUE B: Ficha técnica + Croquis ──────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Columna izquierda: datos técnicos del lote ── */}
          <div className="flex flex-col gap-4">

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">
                Ficha Técnica del Lote
              </h2>

              <div className="flex items-center justify-between mb-5">
                <div
                  className="flex flex-col items-center justify-center w-[72px] h-[72px] rounded-2xl text-white shadow-md shrink-0"
                  style={{ backgroundColor: themeColor }}
                >
                  <span className="text-[9px] font-bold uppercase opacity-80 leading-none">Lote</span>
                  <span className="text-2xl font-black leading-tight">{lot.lotNumber}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={lot.status} />
                  {lot.etapaNombre && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: etapaColor }} />
                      {lot.etapaNombre}
                    </span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {lot.manzana && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 text-xs font-semibold">Manzana</span>
                    <span className="font-bold text-sm text-slate-800">{lot.manzana}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
                    <Maximize className="w-3.5 h-3.5" /> Superficie
                  </span>
                  <span className="font-black text-base text-slate-800">{formatNum(lot.areaSqm)} m²</span>
                </div>
                {lot.frontMeters != null && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5" /> Frente
                    </span>
                    <span className="font-bold text-sm text-slate-700">{formatNum(lot.frontMeters)} m</span>
                  </div>
                )}
                {lot.backMeters != null && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5" /> Fondo
                    </span>
                    <span className="font-bold text-sm text-slate-700">{formatNum(lot.backMeters)} m</span>
                  </div>
                )}
                {lot.destino && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 text-xs font-semibold">Destino</span>
                    <span className="font-bold text-sm text-slate-700 capitalize">{lot.destino}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Precio */}
            {price && (
              <div
                className="rounded-2xl p-5 text-white shadow-md"
                style={{ backgroundColor: themeColor }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Precio</p>
                <p className="text-2xl font-black tracking-tight">{price}</p>
                {lot.currency && <p className="text-[10px] opacity-70 mt-0.5">{lot.currency}</p>}
              </div>
            )}

            {/* Servicios */}
            {dev.services && dev.services.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">
                  Servicios
                </h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                  {dev.services.map((s) => (
                    <div key={s} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: themeColor }} />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tag org */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>{org.name}</span>
            </div>
          </div>

          {/* ── Columna derecha: croquis + brújula ── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Croquis del Lote
            </p>

            <div className="flex-1 flex gap-3 items-stretch min-h-[260px]">

              {/* Croquis SVG grande */}
              <div className="flex-1">
                {sketchData ? (
                  <svg
                    viewBox={sketchData.viewBox}
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Fondo blanco bajo el shape */}
                    <rect
                      x={sketchData.minX - sketchData.pad * 0.04}
                      y={sketchData.minY - sketchData.pad * 0.04}
                      width={sketchData.maxX - sketchData.minX + sketchData.pad * 0.08}
                      height={sketchData.maxY - sketchData.minY + sketchData.pad * 0.08}
                      fill="white" stroke="none"
                    />

                    {/* Shape del lote */}
                    <path
                      d={sketchData.pathD}
                      fill={etapaColor}
                      fillOpacity={0.15}
                      stroke={etapaColor}
                      strokeWidth={sketchData.ds * 6}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Cotas con orientación correcta */}
                    {renderCotas(sketchData, lot.frontMeters, lot.backMeters)}

                    {/* Superficie centrada */}
                    {lot.areaSqm != null && (
                      <text
                        x={(sketchData.minX + sketchData.maxX) / 2}
                        y={(sketchData.minY + sketchData.maxY) / 2}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={sketchData.fs}
                        fill={etapaColor} fontFamily="sans-serif" fontWeight="bold"
                        stroke="white" strokeWidth={sketchData.fs * 0.08} paintOrder="stroke fill"
                      >
                        {`${formatNum(lot.areaSqm)} m²`}
                      </text>
                    )}

                    {/* Nota croquis aproximado */}
                    {sketchData.isApprox && (
                      <text
                        x={(sketchData.minX + sketchData.maxX) / 2}
                        y={sketchData.minY - sketchData.pad * 0.50}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={sketchData.fs * 0.65}
                        fill="#94a3b8" fontFamily="sans-serif" fontStyle="italic"
                      >
                        Croquis orientativo
                      </text>
                    )}
                  </svg>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                    Croquis no disponible
                  </div>
                )}
              </div>

              {/* Brújula */}
              <div className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
                <div className="w-[68px] h-[68px]">
                  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <circle cx="50" cy="50" r="46" fill="white" stroke="#e2e8f0" strokeWidth="2.5" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                      const rad = (deg * Math.PI) / 180;
                      const isCard = deg % 90 === 0;
                      const r1 = isCard ? 34 : 37;
                      return (
                        <line key={deg}
                          x1={50 + r1 * Math.sin(rad)} y1={50 - r1 * Math.cos(rad)}
                          x2={50 + 43 * Math.sin(rad)} y2={50 - 43 * Math.cos(rad)}
                          stroke={isCard ? "#94a3b8" : "#cbd5e1"}
                          strokeWidth={isCard ? "2" : "1.2"}
                        />
                      );
                    })}
                    <g transform={`rotate(${compassRotation}, 50, 50)`}>
                      <polygon points="50,10 44,50 50,44 56,50" fill={themeColor} />
                      <polygon points="50,90 44,50 50,56 56,50" fill="#cbd5e1" />
                    </g>
                    <circle cx="50" cy="50" r="4" fill={themeColor} />
                    <circle cx="50" cy="50" r="2" fill="white" />
                    <text x="50" y="7" textAnchor="middle" dominantBaseline="middle"
                      fontSize="11" fontWeight="800" fill={themeColor} fontFamily="sans-serif">N</text>
                    <text x="50" y="93" textAnchor="middle" dominantBaseline="middle"
                      fontSize="9" fill="#94a3b8" fontFamily="sans-serif">S</text>
                    <text x="93" y="51" textAnchor="middle" dominantBaseline="middle"
                      fontSize="9" fill="#94a3b8" fontFamily="sans-serif">E</text>
                    <text x="7" y="51" textAnchor="middle" dominantBaseline="middle"
                      fontSize="9" fill="#94a3b8" fontFamily="sans-serif">O</text>
                    {[{ deg: 45, label: "NE" }, { deg: 135, label: "SE" }, { deg: 225, label: "SO" }, { deg: 315, label: "NO" }]
                      .map(({ deg, label }) => {
                        const rad = (deg * Math.PI) / 180;
                        return (
                          <text key={deg}
                            x={50 + 30 * Math.sin(rad)} y={50 - 30 * Math.cos(rad)}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize="6.5" fill="#cbd5e1" fontFamily="sans-serif">
                            {label}
                          </text>
                        );
                      })}
                  </svg>
                </div>
                <p className="text-[8px] text-slate-400 text-center leading-tight font-medium">
                  {hasOrientationData ? <>Orientación<br />georreferenciada</> : <>Norte<br />referencial</>}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="mt-8 bg-slate-900 text-slate-300 px-6 sm:px-10 py-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5 flex-wrap">
          {dev.companyLogoUrl && (
            <img src={dev.companyLogoUrl} alt="Inmobiliaria"
              className="h-8 object-contain filter grayscale brightness-200 opacity-80" />
          )}
          <div className="flex flex-col gap-1 border-l border-slate-700 pl-5">
            {dev.contactPhone && (
              <div className="flex items-center gap-2 text-xs font-medium">
                <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                {dev.contactPhone}
              </div>
            )}
            {dev.contactWeb && (
              <div className="flex items-center gap-2 text-xs font-medium">
                <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                {dev.contactWeb}
              </div>
            )}
            {dev.contactAddress && (
              <div className="flex items-center gap-2 text-xs font-medium">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                {dev.contactAddress}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Desarrollado por</p>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">{org.name}</p>
        </div>
      </footer>
    </div>
  );
}
