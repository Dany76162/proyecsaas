import React from "react";
import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import { requireOrganizationMembership } from "@/server/auth/access";
import { MapPin, Phone, Globe, CheckCircle2, Ruler, Maximize, Tag, User, Briefcase, Calendar, Banknote } from "lucide-react";
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

const formatDate = (d: Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

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

function ReservationStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:            { label: "Reserva activa",           cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    PENDING_APPROVAL:  { label: "Pendiente de aprobación",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
    SOLD:              { label: "Operación concretada",      cls: "bg-sky-100 text-sky-700 border-sky-200" },
    CANCELLED:         { label: "Cancelada",                cls: "bg-slate-100 text-slate-500 border-slate-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${cls}`}>
      {label}
    </span>
  );
}

// ── C-2: viewBox del mini-plano (sin DOM) ─────────────────────────────────────
function computeSvgViewBox(paths: (string | null | undefined)[]): string | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of paths) {
    if (!p) continue;
    const nums = p.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
    if (!nums) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
      if (isFinite(x) && isFinite(y)) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (!isFinite(minX)) return null;
  const w = maxX - minX || 1000, h = maxY - minY || 800;
  const pad = Math.max(w, h) * 0.06;
  return `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
}

// ── C-2B: datos del croquis individual del lote ───────────────────────────────
interface LotSketchData {
  viewBox: string;
  pathD: string;
  minX: number; minY: number; maxX: number; maxY: number;
  pad: number;
  fs: number;
  ds: number;
  isApprox: boolean;
  isLandscape: boolean;
}

function computeLotSketchData(
  pathData: string | null | undefined,
  frontM: number | null | undefined,
  backM: number | null | undefined,
): LotSketchData | null {
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
        const pad = maxDim * 0.35;
        const fs = minDim / 7;
        const ds = maxDim / 280;
        return {
          viewBox: `${mnX - pad} ${mnY - pad} ${w + pad * 2} ${h + pad * 2}`,
          pathD: pathData,
          minX: mnX, minY: mnY, maxX: mxX, maxY: mxY,
          pad, fs, ds,
          isApprox: false,
          isLandscape: w >= h,
        };
      }
    }
  }

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

export default async function FichaLotePage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;

  // ── D-1: query sin publicVisible — la validación de acceso es por membership ──
  const lotRaw = await prisma.developmentLot.findFirst({
    where: { id: lotId },
    include: {
      Development: {
        include: { Organization: true },
      },
    },
  });

  if (!lotRaw) notFound();

  // ── D-1: validar tenant — solo miembros de la org pueden ver esta ficha ──────
  await requireOrganizationMembership(lotRaw.Development.Organization.slug);

  // ── D-2: reserva más relevante del lote (prioridad ACTIVE > PENDING > SOLD) ──
  const reservationsRaw = await prisma.developmentReservation.findMany({
    where: { lotId: lotRaw.id },
    include: {
      Lead: { select: { fullName: true, email: true, phone: true } },
      User: { select: { fullName: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const STATUS_PRIORITY = ["ACTIVE", "PENDING_APPROVAL", "SOLD", "CANCELLED"];
  const reservation = reservationsRaw.length > 0
    ? [...reservationsRaw].sort(
        (a, b) => STATUS_PRIORITY.indexOf(a.status) - STATUS_PRIORITY.indexOf(b.status)
      )[0]
    : null;

  // ── C-2: traer todos los lotes del desarrollo para el mini-plano SVG ─────────
  const siblingLots = await prisma.developmentLot.findMany({
    where: { developmentId: lotRaw.developmentId },
    select: { id: true, pathData: true, centerX: true, centerY: true, lotNumber: true },
  });

  const lot = {
    ...lotRaw,
    development: {
      ...lotRaw.Development,
      organization: lotRaw.Development.Organization,
    },
  };

  const dev = lot.development;

  // Validar colores seguros (#RGB o #RRGGBB)
  const themeColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(dev.themeColor ?? "")
    ? dev.themeColor!
    : "#0D9488";
  const etapaColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(lot.etapaColor ?? "")
    ? lot.etapaColor!
    : themeColor;

  const price = formatPrice(lot.priceCents, lot.currency);

  // ── D-2: resolver nombre/contacto del cliente ─────────────────────────────
  const clientDisplayName = reservation?.Lead?.fullName ?? lot.clientName ?? null;
  const clientPhone = reservation?.Lead?.phone ?? null;
  const clientEmail = reservation?.Lead?.email ?? null;
  const hasClientData = !!(clientDisplayName || clientPhone || clientEmail);

  // ── D-2: resolver vendedor/asesor ─────────────────────────────────────────
  const sellerDisplayName = reservation?.User?.fullName ?? lot.sellerName ?? null;
  const sellerPhone = reservation?.User?.phone ?? null;
  const sellerEmail = reservation?.User?.email ?? null;
  const hasSellerData = !!(sellerDisplayName || sellerPhone || sellerEmail);

  // ── D-2: depósito/seña ────────────────────────────────────────────────────
  const depositFormatted = reservation?.depositCents
    ? formatPrice(reservation.depositCents, reservation.mpCurrency ?? lot.currency)
    : null;

  // ── C-2: mini-plano general ───────────────────────────────────────────────
  const lotsWithPath = siblingLots.filter((l) => !!l.pathData);
  const hasMiniPlan = lotsWithPath.length >= 2;
  const miniPlanViewBox = hasMiniPlan ? computeSvgViewBox(lotsWithPath.map((l) => l.pathData)) : null;
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

  // ── C-2B: croquis grande del lote ────────────────────────────────────────
  const sketchData = computeLotSketchData(lot.pathData, lot.frontMeters, lot.backMeters);

  const compassRotation = dev.overlayRotation ?? 0;
  const hasOrientationData = compassRotation !== 0;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-8 print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-[794px] min-h-[1123px] shadow-2xl flex flex-col print:shadow-none print:w-full print:max-w-full">

        {/* Print Button */}
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
          <svg className="absolute bottom-0 right-0 h-full text-white/10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,100 100,0 100,100" fill="currentColor" />
          </svg>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 p-7 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">

          {/* ── COLUMNA IZQUIERDA ── */}
          <div className="flex flex-col gap-4">

            {/* Ficha técnica del lote */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">
                Ficha Técnica del Lote
              </h2>
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
              <div className="rounded-2xl p-5 text-white shadow-md" style={{ backgroundColor: themeColor }}>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Precio</p>
                <p className="text-2xl font-black tracking-tight">{price}</p>
                {lot.currency && <p className="text-[10px] opacity-70 mt-0.5">{lot.currency}</p>}
              </div>
            )}

            {/* ── D-2: Cliente / Reservante ── */}
            {hasClientData && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Cliente / Reservante
                </h3>
                <div className="divide-y divide-slate-100">
                  {clientDisplayName && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-500 text-xs font-semibold">Nombre</span>
                      <span className="font-bold text-sm text-slate-800 text-right max-w-[60%] leading-tight">{clientDisplayName}</span>
                    </div>
                  )}
                  {clientPhone && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-500 text-xs font-semibold">Teléfono</span>
                      <span className="font-semibold text-sm text-slate-700">{clientPhone}</span>
                    </div>
                  )}
                  {clientEmail && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-500 text-xs font-semibold">Email</span>
                      <span className="font-semibold text-xs text-slate-700 text-right max-w-[60%] break-all leading-tight">{clientEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── D-2: Operación / Reserva ── */}
            {reservation && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3" />
                  Operación
                </h3>
                <div className="divide-y divide-slate-100">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-500 text-xs font-semibold">Estado</span>
                    <ReservationStatusBadge status={reservation.status} />
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-500 text-xs font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Fecha
                    </span>
                    <span className="font-semibold text-sm text-slate-700">{formatDate(reservation.createdAt)}</span>
                  </div>
                  {depositFormatted && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-500 text-xs font-semibold flex items-center gap-1">
                        <Banknote className="w-3 h-3" /> Seña
                      </span>
                      <span className="font-black text-sm text-slate-800">{depositFormatted}</span>
                    </div>
                  )}
                  {hasSellerData && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-500 text-xs font-semibold">Asesor</span>
                      <span className="font-semibold text-sm text-slate-700 text-right max-w-[60%] leading-tight">
                        {sellerDisplayName}
                        {sellerPhone && <span className="block text-[10px] text-slate-400 font-normal">{sellerPhone}</span>}
                      </span>
                    </div>
                  )}
                  {reservation.notes && (
                    <div className="py-1.5">
                      <span className="text-slate-500 text-xs font-semibold block mb-0.5">Notas</span>
                      <p className="text-xs text-slate-600 leading-snug line-clamp-2">{reservation.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vendedor sin reserva (fallback solo si hay sellerName en lote y no hay reserva) */}
            {!reservation && hasSellerData && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3" />
                  Asesor
                </h3>
                <p className="font-bold text-sm text-slate-800">{sellerDisplayName}</p>
                {sellerPhone && <p className="text-xs text-slate-500 mt-0.5">{sellerPhone}</p>}
                {sellerEmail && <p className="text-xs text-slate-500">{sellerEmail}</p>}
              </div>
            )}

            {/* Servicios */}
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

          {/* ── COLUMNA DERECHA: plano general + croquis del lote ── */}
          <div className="flex flex-col gap-3">

            {/* ── Bloque A: Plano del Desarrollo ── */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Plano del Desarrollo
              </p>
              {hasMiniPlan && miniPlanViewBox ? (
                <>
                  <div className="h-[180px] rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm bg-slate-50 flex items-center justify-center p-1">
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
                          fill={etapaColor} fillOpacity={0.8}
                          stroke={etapaColor} strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke" />
                      )}
                      {lot.centerX != null && lot.centerY != null && (
                        <text x={lot.centerX} y={lot.centerY}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize={labelFontSize} fill="white" fontWeight="bold"
                          fontFamily="sans-serif" stroke="rgba(0,0,0,0.35)"
                          strokeWidth={labelFontSize * 0.06} paintOrder="stroke fill">
                          {lot.lotNumber}
                        </text>
                      )}
                    </svg>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold text-center mt-1">{lotLabel}</p>
                </>
              ) : (
                <>
                  {dev.brochurePlanUrl ? (
                    <div className="h-[180px] rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm bg-white">
                      {dev.brochurePlanUrl.endsWith(".pdf") ? (
                        <iframe src={dev.brochurePlanUrl} className="w-full h-full" />
                      ) : (
                        <img src={dev.brochurePlanUrl} alt="Plano del desarrollo" className="w-full h-full object-contain" />
                      )}
                    </div>
                  ) : (
                    <div className="h-[180px] rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-medium">
                      Plano no disponible
                    </div>
                  )}
                  {!hasMiniPlan && (
                    <p className="text-[10px] text-slate-400 font-medium text-center mt-1">
                      Vista con lote destacado no disponible para este plano.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* ── Bloque B: Croquis del Lote + Brújula ── */}
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Croquis del Lote
              </p>

              <div className="flex-1 flex gap-3 items-stretch min-h-[200px]">

                {/* Croquis SVG */}
                <div className="flex-1">
                  {sketchData ? (
                    <svg
                      viewBox={sketchData.viewBox}
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-full h-full"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <rect
                        x={sketchData.minX - sketchData.pad * 0.05}
                        y={sketchData.minY - sketchData.pad * 0.05}
                        width={sketchData.maxX - sketchData.minX + sketchData.pad * 0.1}
                        height={sketchData.maxY - sketchData.minY + sketchData.pad * 0.1}
                        fill="white" stroke="none"
                      />
                      <path
                        d={sketchData.pathD}
                        fill={etapaColor}
                        fillOpacity={0.18}
                        stroke={etapaColor}
                        strokeWidth={sketchData.ds * 6}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />

                      {/* Cotas frente/fondo — orientación según isLandscape */}
                      {(() => {
                        const cotaOffset = sketchData.pad * 0.20;
                        const textGap    = sketchData.pad * 0.15;
                        const tick       = sketchData.pad * 0.10;
                        const sw         = sketchData.ds * 2;

                        // Portrait: horiz=Frente, vert=Fondo — Landscape: horiz=Fondo, vert=Frente
                        const horizLabel = sketchData.isLandscape ? "Fondo"  : "Frente";
                        const horizValue = sketchData.isLandscape ? lot.backMeters  : lot.frontMeters;
                        const vertLabel  = sketchData.isLandscape ? "Frente" : "Fondo";
                        const vertValue  = sketchData.isLandscape ? lot.frontMeters : lot.backMeters;

                        const nodes: React.ReactNode[] = [];

                        if (horizValue != null) {
                          const y   = sketchData.maxY + cotaOffset;
                          const mid = (sketchData.minX + sketchData.maxX) / 2;
                          nodes.push(
                            <line key="h-line" x1={sketchData.minX} y1={y} x2={sketchData.maxX} y2={y}
                              stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />,
                            <line key="h-tick-l" x1={sketchData.minX} y1={y - tick} x2={sketchData.minX} y2={y + tick}
                              stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />,
                            <line key="h-tick-r" x1={sketchData.maxX} y1={y - tick} x2={sketchData.maxX} y2={y + tick}
                              stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />,
                            <text key="h-text" x={mid} y={y + textGap}
                              textAnchor="middle" dominantBaseline="hanging"
                              fontSize={sketchData.fs * 0.85} fill="#475569" fontFamily="sans-serif" fontWeight="600">
                              {`${horizLabel} ${formatNum(horizValue)} m`}
                            </text>,
                          );
                        }

                        if (vertValue != null) {
                          const x   = sketchData.maxX + cotaOffset;
                          const mid = (sketchData.minY + sketchData.maxY) / 2;
                          nodes.push(
                            <line key="v-line" x1={x} y1={sketchData.minY} x2={x} y2={sketchData.maxY}
                              stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />,
                            <line key="v-tick-t" x1={x - tick} y1={sketchData.minY} x2={x + tick} y2={sketchData.minY}
                              stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />,
                            <line key="v-tick-b" x1={x - tick} y1={sketchData.maxY} x2={x + tick} y2={sketchData.maxY}
                              stroke="#64748b" strokeWidth={sw} vectorEffect="non-scaling-stroke" />,
                            <text key="v-text"
                              x={x + textGap}
                              y={mid}
                              textAnchor="middle"
                              dominantBaseline="auto"
                              fontSize={sketchData.fs * 0.85}
                              fill="#475569"
                              fontFamily="sans-serif"
                              fontWeight="600"
                              transform={`rotate(90, ${x + textGap}, ${mid})`}
                            >
                              {`${vertLabel} ${formatNum(vertValue)} m`}
                            </text>,
                          );
                        }

                        return nodes;
                      })()}

                      {/* Área */}
                      {lot.areaSqm != null && (
                        <text
                          x={(sketchData.minX + sketchData.maxX) / 2}
                          y={(sketchData.minY + sketchData.maxY) / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={sketchData.fs}
                          fill={etapaColor}
                          fontFamily="sans-serif"
                          fontWeight="bold"
                          stroke="white"
                          strokeWidth={sketchData.fs * 0.08}
                          paintOrder="stroke fill"
                        >
                          {`${formatNum(lot.areaSqm)} m²`}
                        </text>
                      )}

                      {sketchData.isApprox && (
                        <text
                          x={(sketchData.minX + sketchData.maxX) / 2}
                          y={sketchData.minY - sketchData.pad * 0.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={sketchData.fs * 0.65}
                          fill="#94a3b8"
                          fontFamily="sans-serif"
                          fontStyle="italic"
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
                        const isCardinal = deg % 90 === 0;
                        const r1 = isCardinal ? 34 : 37;
                        const r2 = 43;
                        return (
                          <line
                            key={deg}
                            x1={50 + r1 * Math.sin(rad)} y1={50 - r1 * Math.cos(rad)}
                            x2={50 + r2 * Math.sin(rad)} y2={50 - r2 * Math.cos(rad)}
                            stroke={isCardinal ? "#94a3b8" : "#cbd5e1"}
                            strokeWidth={isCardinal ? "2" : "1.2"}
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
                      {[
                        { deg: 45,  label: "NE" },
                        { deg: 135, label: "SE" },
                        { deg: 225, label: "SO" },
                        { deg: 315, label: "NO" },
                      ].map(({ deg, label }) => {
                        const rad = (deg * Math.PI) / 180;
                        return (
                          <text
                            key={deg}
                            x={50 + 30 * Math.sin(rad)}
                            y={50 - 30 * Math.cos(rad)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="6.5"
                            fill="#cbd5e1"
                            fontFamily="sans-serif"
                          >
                            {label}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                  {hasOrientationData ? (
                    <p className="text-[8px] text-slate-400 text-center leading-tight font-medium">
                      Orientación<br />georreferenciada
                    </p>
                  ) : (
                    <p className="text-[8px] text-slate-400 text-center leading-tight font-medium">
                      Orientación<br />referencial
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tag del desarrollo */}
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
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{dev.organization.name}</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}} />
    </div>
  );
}
