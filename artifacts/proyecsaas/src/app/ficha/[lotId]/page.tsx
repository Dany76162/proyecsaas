import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import { MapPin, Phone, Globe, CheckCircle2, Ruler, Maximize, Tag } from "lucide-react";
import PrintButton from "./print-button";

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatNum = (num: number | null | undefined) =>
  num != null ? num.toLocaleString("es-AR") : "—";

function formatPrice(priceCents: number | null | undefined, currency: string | null | undefined) {
  if (!priceCents) return null;
  const amount = priceCents / 100;
  const cur = currency ?? "USD";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
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
    BLOCKED:          { label: "Bloqueada",  cls: "bg-slate-100 text-slate-500 border-slate-200" },
  };
  const { label, cls } = map[status] ?? { label: "No disponible", cls: "bg-slate-100 text-slate-500 border-slate-200" };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${cls}`}>
      {label}
    </span>
  );
}

// ── C-2: computar viewBox server-side (sin DOM, sin canvas, sin dependencias) ─
// Mismo algoritmo que masterplan-viewer.tsx líneas 652-680, adaptado para servidor.
function computeSvgViewBox(paths: (string | null | undefined)[]): string | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of paths) {
    if (!p) continue;
    const nums = p.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
    if (!nums) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i + 1]);
      if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!isFinite(minX) || !isFinite(minY)) return null;
  const w = maxX - minX || 1000;
  const h = maxY - minY || 800;
  const pad = Math.max(w, h) * 0.06;
  return `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function FichaLotePage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;

  // publicVisible: true se mantiene (ruta pública).
  // Se quitó status: "ACTIVE" para permitir desarrollos en DRAFT/PAUSED
  // que ya estén marcados como visibles públicamente.
  const lotRaw = await prisma.developmentLot.findFirst({
    where: {
      id: lotId,
      Development: { publicVisible: true },
    },
    include: {
      Development: {
        include: { Organization: true },
      },
    },
  });

  if (!lotRaw) notFound();

  // C-2: traer todos los lotes del desarrollo para el mini-plano SVG.
  // Query liviana: solo campos necesarios para renderizar los paths.
  const siblingLots = await prisma.developmentLot.findMany({
    where: { developmentId: lotRaw.developmentId },
    select: {
      id: true,
      pathData: true,
      centerX: true,
      centerY: true,
      lotNumber: true,
    },
  });

  const lot = {
    ...lotRaw,
    development: {
      ...lotRaw.Development,
      organization: lotRaw.Development.Organization,
    },
  };

  const dev = lot.development;

  // Validar themeColor seguro (#RGB o #RRGGBB) — previene inyección CSS
  const rawThemeColor = dev.themeColor ?? "";
  const themeColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(rawThemeColor)
    ? rawThemeColor
    : "#0D9488";

  // Validar etapaColor — fallback a themeColor
  const rawEtapaColor = lot.etapaColor ?? "";
  const etapaColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(rawEtapaColor)
    ? rawEtapaColor
    : themeColor;

  const price = formatPrice(lot.priceCents, lot.currency);

  // ── C-2: preparar datos del mini-plano ─────────────────────────────────────
  const lotsWithPath = siblingLots.filter((l) => !!l.pathData);
  const hasMiniPlan = lotsWithPath.length >= 2;
  const miniPlanViewBox = hasMiniPlan
    ? computeSvgViewBox(lotsWithPath.map((l) => l.pathData))
    : null;

  // Separar lotes para orden de renderizado SVG:
  // primero los no-seleccionados (fondo gris), luego el seleccionado (encima).
  const otherLots = lotsWithPath.filter((l) => l.id !== lotId);
  const selectedLotPath = lotsWithPath.find((l) => l.id === lotId);

  // Font size proporcional al espacio del viewBox para el label del lote.
  let labelFontSize = 8;
  if (miniPlanViewBox) {
    const parts = miniPlanViewBox.split(" ").map(parseFloat);
    const vbW = parts[2] ?? 1000;
    const vbH = parts[3] ?? 800;
    labelFontSize = Math.min(vbW, vbH) / 50;
  }

  // Leyenda textual del lote seleccionado
  const lotLabel = lot.manzana
    ? `Manzana ${lot.manzana} · Lote ${lot.lotNumber}`
    : `Lote ${lot.lotNumber}`;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-8 print:p-0 print:bg-white">
      {/*
        Contenedor A4: 794×1123 px.
        Layout: flex-col para que el footer quede al final del flujo
        natural — evita que absolute bottom-0 tape el cuerpo.
      */}
      <div className="bg-white w-full max-w-[794px] min-h-[1123px] shadow-2xl flex flex-col print:shadow-none print:w-full print:max-w-full">

        {/* Print Button — hidden en impresión */}
        <div className="absolute top-4 right-4 print:hidden z-50">
          <PrintButton />
        </div>

        {/* ── HEADER ── */}
        <div
          className="relative flex-shrink-0 h-48 md:h-56 flex items-end p-8 print:h-56"
          style={{ backgroundColor: themeColor }}
        >
          {dev.logoUrl && (
            <div className="absolute top-6 left-8 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
              <img src={dev.logoUrl} alt={dev.name} className="h-14 md:h-16 object-contain print:h-16" />
            </div>
          )}

          <div className="text-white">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">{dev.name}</h1>
            {(dev.address || dev.city || dev.province) && (
              <p className="text-white/80 font-medium flex items-center gap-2 mt-1.5 text-sm">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {[dev.address, dev.city, dev.province].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Deco shape */}
          <svg
            className="absolute bottom-0 right-0 h-full text-white/10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polygon points="0,100 100,0 100,100" fill="currentColor" />
          </svg>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 p-7 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">

          {/* ── Columna izquierda: datos del lote ── */}
          <div className="flex flex-col gap-4">

            {/* Identificación del lote */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">
                Ficha Técnica del Lote
              </h2>

              {/* Badge de número de lote + status */}
              <div className="flex items-center justify-between mb-5">
                <div
                  className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl text-white shadow-md shrink-0"
                  style={{ backgroundColor: themeColor }}
                >
                  <span className="text-[10px] font-bold uppercase opacity-80 leading-none">Lote</span>
                  <span className="text-2xl font-black leading-tight">{lot.lotNumber}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={lot.status} />
                  {lot.etapaNombre && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: etapaColor }}
                      />
                      {lot.etapaNombre}
                    </span>
                  )}
                </div>
              </div>

              {/* Tabla de datos técnicos */}
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

            {/* Precio — solo si existe */}
            {price && (
              <div
                className="rounded-2xl p-5 text-white shadow-md"
                style={{ backgroundColor: themeColor }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Precio</p>
                <p className="text-2xl font-black tracking-tight">{price}</p>
                {lot.currency && (
                  <p className="text-[10px] opacity-70 mt-0.5">{lot.currency}</p>
                )}
              </div>
            )}

            {/* Servicios — si existen */}
            {dev.services && dev.services.length > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Servicios</h3>
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
          </div>

          {/* ── Columna derecha: mini-plano SVG con lote resaltado ── */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Plano del Desarrollo
            </p>

            {hasMiniPlan && miniPlanViewBox ? (
              <>
                {/*
                  C-2: mini-plano SVG inline.
                  - Sin dangerouslySetInnerHTML: pathData solo en atributo d de <path>.
                  - Lotes no seleccionados: relleno gris suave + borde gris.
                  - Lote seleccionado: renderizado último (encima), relleno etapaColor.
                  - Label con número del lote centrado en centerX/centerY.
                  - vectorEffect="non-scaling-stroke": borde no escala con zoom de impresión.
                */}
                <div className="flex-1 min-h-[260px] rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm bg-slate-50 flex items-center justify-center p-1">
                  <svg
                    viewBox={miniPlanViewBox}
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Lotes no seleccionados — fondo */}
                    {otherLots.map((l) => (
                      <path
                        key={l.id}
                        d={l.pathData!}
                        fill="rgba(226,232,240,0.7)"
                        stroke="#94a3b8"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}

                    {/* Lote seleccionado — renderizado último para quedar encima */}
                    {selectedLotPath?.pathData && (
                      <path
                        d={selectedLotPath.pathData}
                        fill={etapaColor}
                        fillOpacity={0.8}
                        stroke={etapaColor}
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}

                    {/* Label del lote seleccionado — solo si hay centerX/centerY */}
                    {lot.centerX != null && lot.centerY != null && (
                      <text
                        x={lot.centerX}
                        y={lot.centerY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={labelFontSize}
                        fill="white"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth={labelFontSize * 0.06}
                        paintOrder="stroke fill"
                      >
                        {lot.lotNumber}
                      </text>
                    )}
                  </svg>
                </div>

                {/* Leyenda del lote */}
                <p className="text-[10px] text-slate-400 font-semibold text-center">
                  {lotLabel}
                </p>
              </>
            ) : (
              <>
                {/* Fallback: no hay pathData suficientes → mostrar brochurePlanUrl */}
                {dev.brochurePlanUrl ? (
                  <div className="flex-1 min-h-[260px] rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm bg-white">
                    {dev.brochurePlanUrl.endsWith(".pdf") ? (
                      <iframe src={dev.brochurePlanUrl} className="w-full h-full min-h-[260px]" />
                    ) : (
                      <img
                        src={dev.brochurePlanUrl}
                        alt="Plano del desarrollo"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex-1 min-h-[260px] rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 text-slate-400 text-sm font-medium">
                    Plano no disponible
                  </div>
                )}
                {!hasMiniPlan && (
                  <p className="text-[10px] text-slate-400 font-medium text-center">
                    Vista con lote destacado no disponible para este plano.
                  </p>
                )}
              </>
            )}

            {/* Tag del desarrollo — nombre organización */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>{dev.organization.name}</span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 bg-slate-900 text-slate-300 px-7 py-5 flex items-center justify-between gap-4 flex-wrap print:flex-nowrap">
          <div className="flex items-center gap-5 flex-wrap">
            {dev.companyLogoUrl && (
              <img
                src={dev.companyLogoUrl}
                alt="Inmobiliaria"
                className="h-8 object-contain filter grayscale brightness-200 opacity-80"
              />
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
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{dev.organization.name}</p>
          </div>
        </div>
      </div>

      {/* Print styles — A4 portrait, exact colors */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}} />
    </div>
  );
}
