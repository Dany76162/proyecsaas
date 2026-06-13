import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import { requireOrganizationMembership } from "@/server/auth/access";
import { markOverdueInstallments } from "@/modules/developments/installments";
import { ArrowLeft, MapPin, Phone, Globe, User, Banknote, Calendar, Receipt } from "lucide-react";
import Link from "next/link";
import PrintButton from "../print-button";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCents(cents: number | null | undefined, currency?: string | null): string {
  if (cents == null) return "—";
  const amount = cents / 100;
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

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtEmisionDate(): string {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ── Status badges ─────────────────────────────────────────────────────────────

function LotStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    AVAILABLE:        { label: "Disponible", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    RESERVED_PENDING: { label: "Reservada",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
    RESERVED:         { label: "Reservada",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
    SOLD:             { label: "Vendida",    cls: "bg-red-100 text-red-700 border-red-200" },
    BLOCKED:          { label: "Bloqueada",  cls: "bg-slate-100 text-slate-500 border-slate-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${cls}`}>{label}</span>;
}

function ReservationStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:           { label: "Reserva activa",          cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    PENDING_APPROVAL: { label: "Pendiente de aprobación", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    SOLD:             { label: "Operación concretada",    cls: "bg-sky-100 text-sky-700 border-sky-200" },
    CANCELLED:        { label: "Cancelada",               cls: "bg-slate-100 text-slate-500 border-slate-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${cls}`}>{label}</span>;
}

function InstallmentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PAID:      { label: "Pagada",    cls: "bg-emerald-100 text-emerald-700" },
    PENDING:   { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
    OVERDUE:   { label: "Vencida",   cls: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Cancelada", cls: "bg-slate-100 text-slate-500" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CuotasPage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;

  const lotRaw = await prisma.developmentLot.findFirst({
    where: { id: lotId },
    include: {
      Development: { include: { Organization: true } },
    },
  });

  if (!lotRaw) notFound();

  await requireOrganizationMembership(lotRaw.Development.Organization.slug);

  // Reserva más relevante con cuotas
  const reservationsRaw = await prisma.developmentReservation.findMany({
    where: { lotId: lotRaw.id },
    include: {
      Installments: { orderBy: { installmentNumber: "asc" } },
      Lead: { select: { fullName: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const STATUS_PRIORITY = ["ACTIVE", "PENDING_APPROVAL", "SOLD", "CANCELLED"];
  const reservationRaw =
    reservationsRaw.length > 0
      ? [...reservationsRaw].sort(
          (a, b) => STATUS_PRIORITY.indexOf(a.status) - STATUS_PRIORITY.indexOf(b.status)
        )[0]
      : null;

  // F-7: mark overdue installments on access, then re-fetch fresh data
  if (reservationRaw) {
    await markOverdueInstallments(reservationRaw.id);
  }

  // Re-fetch the selected reservation with fresh installment statuses
  const reservation = reservationRaw
    ? await prisma.developmentReservation.findUnique({
        where: { id: reservationRaw.id },
        include: {
          Installments: { orderBy: { installmentNumber: "asc" } },
          Lead: { select: { fullName: true, email: true, phone: true } },
        },
      })
    : null;

  const dev = lotRaw.Development;
  const org = dev.Organization;

  const themeColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(dev.themeColor ?? "")
    ? dev.themeColor!
    : "#0D9488";

  const installments = reservation?.Installments ?? [];

  // ── Cálculos comerciales ──────────────────────────────────────────────────
  const totalPriceCents = reservation?.totalPriceCents ?? null;
  const downPaymentCents = reservation?.downPaymentCents ?? null;
  const financedCents =
    totalPriceCents != null && downPaymentCents != null
      ? totalPriceCents - downPaymentCents
      : null;

  const activeInstallments = installments.filter((i) => i.status !== "CANCELLED");
  const paidInstallments = installments.filter((i) => i.status === "PAID");
  const pendingInstallments = installments.filter((i) => i.status === "PENDING");
  const overdueInstallments = installments.filter((i) => i.status === "OVERDUE");

  const paidAmountCents = paidInstallments.reduce((s, i) => s + i.amountCents, 0);
  const pendingAmountCents = activeInstallments
    .filter((i) => i.status !== "PAID")
    .reduce((s, i) => s + i.amountCents, 0);

  const paidPct =
    financedCents && financedCents > 0
      ? Math.round((paidAmountCents / financedCents) * 100)
      : paidInstallments.length > 0 && activeInstallments.length > 0
      ? Math.round((paidInstallments.length / activeInstallments.length) * 100)
      : 0;

  // ── Datos del cliente ─────────────────────────────────────────────────────
  const clientName =
    reservation?.Lead?.fullName ?? lotRaw.clientName ?? null;
  const clientPhone = reservation?.Lead?.phone ?? null;
  const clientEmail = reservation?.Lead?.email ?? null;
  const buyerDni = reservation?.buyerDni ?? null;
  const buyerWhatsapp = reservation?.buyerWhatsapp ?? null;

  const lotLabel = lotRaw.manzana
    ? `Manzana ${lotRaw.manzana} · Lote ${lotRaw.lotNumber}`
    : `Lote ${lotRaw.lotNumber}`;

  // Currency: prefer first installment's currency, then lot currency, fallback USD
  const currency = installments[0]?.currency ?? lotRaw.currency ?? "USD";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-8 print:p-0 print:bg-white print:block">
      <div className="bg-white w-full max-w-[860px] shadow-2xl flex flex-col print:shadow-none print:w-full print:max-w-full print:block print-doc-wrapper">

        {/* ── Acciones (ocultar al imprimir) ── */}
        <div className="print:hidden flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200 gap-3 flex-wrap">
          <Link
            href={`/ficha/${lotId}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a ficha del lote
          </Link>
          <PrintButton />
        </div>

        {/* ── HEADER ── */}
        <div
          className="relative flex-shrink-0 h-48 md:h-48 flex items-end p-7 print:h-48"
          style={{ backgroundColor: themeColor }}
        >
          {dev.logoUrl && (
            <div className="absolute top-5 left-7 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20">
              <img src={dev.logoUrl} alt={dev.name} className="h-10 object-contain" />
            </div>
          )}
          <div className="text-white">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
              Plan de Cuotas · Documento interno
            </p>
            <h1 className="text-2xl font-black tracking-tight leading-tight">{dev.name}</h1>
            <p className="text-white/80 text-sm font-semibold mt-0.5">{lotLabel}</p>
          </div>
          <div className="absolute right-7 bottom-5 text-right text-white/70">
            <p className="text-[10px] font-semibold">Emitido el</p>
            <p className="text-xs font-bold">{fmtEmisionDate()}</p>
          </div>
          <svg className="absolute bottom-0 right-0 h-full text-white/10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,100 100,0 100,100" fill="currentColor" />
          </svg>
        </div>

        {/* ── RESUMEN VISUAL ── */}
        {reservation && (
          <div className="px-7 pt-6 grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total cuotas</p>
              <p className="text-2xl font-black text-slate-800">{activeInstallments.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 mb-1">Pagadas</p>
              <p className="text-2xl font-black text-emerald-700">{paidInstallments.length}</p>
              <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                {fmtCents(paidAmountCents, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-1">Pendientes</p>
              <p className="text-2xl font-black text-amber-700">{pendingInstallments.length}</p>
              <p className="text-[10px] text-amber-500 font-semibold mt-0.5">
                {fmtCents(pendingAmountCents, currency)}
              </p>
            </div>
            <div
              className="rounded-xl border p-3 text-center"
              style={{ borderColor: `${themeColor}30`, backgroundColor: `${themeColor}08` }}
            >
              <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: themeColor }}>
                Avance
              </p>
              <p className="text-2xl font-black" style={{ color: themeColor }}>{paidPct}%</p>
              {overdueInstallments.length > 0 && (
                <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                  {overdueInstallments.length} vencida{overdueInstallments.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── CUERPO PRINCIPAL ── */}
        <div className="px-7 pt-5 pb-7 flex flex-col md:grid md:grid-cols-3 print:block gap-5">

          {/* ── Columna izquierda: cliente + lote + operación ── */}
          <div className="flex flex-col gap-4 print:grid print:grid-cols-3 print:mb-6">

            {/* Cliente */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <User className="w-3 h-3" /> Cliente
              </h2>
              <div className="divide-y divide-slate-100 text-xs">
                {clientName && (
                  <div className="flex justify-between py-1.5 gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">Nombre</span>
                    <span className="font-bold text-slate-800 text-right">{clientName}</span>
                  </div>
                )}
                {buyerDni && (
                  <div className="flex justify-between py-1.5 gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">DNI</span>
                    <span className="font-bold text-slate-700 text-right">{buyerDni}</span>
                  </div>
                )}
                {buyerWhatsapp && (
                  <div className="flex justify-between py-1.5 gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">WhatsApp</span>
                    <span className="font-bold text-slate-700 text-right">{buyerWhatsapp}</span>
                  </div>
                )}
                {clientPhone && (
                  <div className="flex justify-between py-1.5 gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">Teléfono</span>
                    <span className="font-bold text-slate-700 text-right">{clientPhone}</span>
                  </div>
                )}
                {clientEmail && (
                  <div className="flex justify-between py-1.5 gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">Email</span>
                    <span className="font-bold text-slate-700 text-right break-all">{clientEmail}</span>
                  </div>
                )}
                {!clientName && !buyerDni && !buyerWhatsapp && !clientPhone && !clientEmail && (
                  <p className="text-slate-400 italic text-[11px] py-1">Sin datos de cliente</p>
                )}
              </div>
            </div>

            {/* Lote */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Lote
              </h2>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-1.5 gap-2">
                  <span className="text-slate-500 font-semibold">Lote</span>
                  <span className="font-black text-slate-800">{lotRaw.lotNumber}</span>
                </div>
                {lotRaw.manzana && (
                  <div className="flex justify-between py-1.5 gap-2">
                    <span className="text-slate-500 font-semibold">Manzana</span>
                    <span className="font-bold text-slate-700">{lotRaw.manzana}</span>
                  </div>
                )}
                {lotRaw.areaSqm != null && (
                  <div className="flex justify-between py-1.5 gap-2">
                    <span className="text-slate-500 font-semibold">Superficie</span>
                    <span className="font-bold text-slate-700">{lotRaw.areaSqm.toLocaleString("es-AR")} m²</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1.5 gap-2">
                  <span className="text-slate-500 font-semibold">Estado</span>
                  <LotStatusBadge status={lotRaw.status} />
                </div>
              </div>
            </div>

            {/* Operación comercial */}
            {reservation && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <Banknote className="w-3 h-3" /> Operación
                </h2>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between items-center py-1.5 gap-2">
                    <span className="text-slate-500 font-semibold">Estado</span>
                    <ReservationStatusBadge status={reservation.status} />
                  </div>
                  <div className="flex justify-between py-1.5 gap-2">
                    <span className="text-slate-500 font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Fecha
                    </span>
                    <span className="font-bold text-slate-700">{fmtDate(reservation.createdAt)}</span>
                  </div>
                  {totalPriceCents != null && (
                    <div className="flex justify-between py-1.5 gap-2">
                      <span className="text-slate-500 font-semibold">Precio total</span>
                      <span className="font-black text-slate-800">{fmtCents(totalPriceCents, currency)}</span>
                    </div>
                  )}
                  {downPaymentCents != null && (
                    <div className="flex justify-between py-1.5 gap-2">
                      <span className="text-slate-500 font-semibold">Anticipo</span>
                      <span className="font-bold text-slate-700">{fmtCents(downPaymentCents, currency)}</span>
                    </div>
                  )}
                  {financedCents != null && (
                    <div className="flex justify-between py-1.5 gap-2">
                      <span className="text-slate-500 font-semibold">Saldo financiado</span>
                      <span className="font-bold text-slate-700">{fmtCents(financedCents, currency)}</span>
                    </div>
                  )}
                  {reservation.paymentMethod && (
                    <div className="flex justify-between py-1.5 gap-2">
                      <span className="text-slate-500 font-semibold">Método</span>
                      <span className="font-bold text-slate-700 capitalize">{reservation.paymentMethod}</span>
                    </div>
                  )}
                  {reservation.paymentReference && (
                    <div className="flex justify-between py-1.5 gap-2">
                      <span className="text-slate-500 font-semibold">Referencia</span>
                      <span className="font-bold text-slate-700 text-right">{reservation.paymentReference}</span>
                    </div>
                  )}
                  {reservation.firstDueDate && (
                    <div className="flex justify-between py-1.5 gap-2">
                      <span className="text-slate-500 font-semibold">1° vencimiento</span>
                      <span className="font-bold text-slate-700">{fmtDate(reservation.firstDueDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Columna derecha (2 cols): tabla de cuotas ── */}
          <div className="md:col-span-2 print:block flex flex-col gap-4">

            {installments.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Header de tabla */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: themeColor }}
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-white/80" />
                    <span className="text-white font-black text-sm uppercase tracking-wide">
                      Plan de cuotas
                    </span>
                  </div>
                  <span className="text-white/80 text-xs font-semibold">
                    {reservation?.installmentCount ?? activeInstallments.length} cuotas ·{" "}
                    {fmtCents(financedCents ?? activeInstallments.reduce((s, i) => s + i.amountCents, 0), currency)}
                  </span>
                </div>

                {/* Barra de progreso */}
                {paidPct > 0 && (
                  <div className="h-1.5 bg-slate-100 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-400 transition-all"
                      style={{ width: `${paidPct}%` }}
                    />
                  </div>
                )}

                {/* Tabla */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2 text-left font-black text-slate-500 uppercase tracking-wide text-[10px]">#</th>
                        <th className="px-3 py-2 text-left font-black text-slate-500 uppercase tracking-wide text-[10px]">Vencimiento</th>
                        <th className="px-3 py-2 text-right font-black text-slate-500 uppercase tracking-wide text-[10px]">Monto</th>
                        <th className="px-3 py-2 text-center font-black text-slate-500 uppercase tracking-wide text-[10px]">Estado</th>
                        <th className="px-3 py-2 text-left font-black text-slate-500 uppercase tracking-wide text-[10px] print:table-cell hidden sm:table-cell">Pagado el</th>
                        <th className="px-3 py-2 text-left font-black text-slate-500 uppercase tracking-wide text-[10px] print:table-cell hidden md:table-cell">Método / Ref.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {installments.map((inst) => {
                        const isPaid = inst.status === "PAID";
                        const isOverdue = inst.status === "OVERDUE";
                        return (
                          <tr
                            key={inst.id}
                            className={
                              isPaid
                                ? "bg-emerald-50/40"
                                : isOverdue
                                ? "bg-red-50/40"
                                : "hover:bg-slate-50"
                            }
                          >
                            <td className="px-3 py-2 text-slate-500 font-semibold">{inst.installmentNumber}</td>
                            <td className="px-3 py-2 text-slate-700 font-semibold">
                              {fmtDate(inst.dueDate)}
                            </td>
                            <td className="px-3 py-2 text-right font-black text-slate-800">
                              {fmtCents(inst.amountCents, inst.currency)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <InstallmentBadge status={inst.status} />
                            </td>
                            <td className="px-3 py-2 text-slate-600 print:table-cell hidden sm:table-cell">
                              {fmtDate(inst.paidAt)}
                            </td>
                            <td className="px-3 py-2 print:table-cell hidden md:table-cell">
                              {inst.paymentMethod || inst.paymentReference ? (
                                <div className="flex flex-col gap-0.5">
                                  {inst.paymentMethod && (
                                    <span className="text-slate-600 capitalize">{inst.paymentMethod}</span>
                                  )}
                                  {inst.paymentReference && (
                                    <span className="text-slate-400 font-mono">{inst.paymentReference}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totales */}
                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Total pagado</p>
                    <p className="font-black text-sm text-emerald-700">{fmtCents(paidAmountCents, currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Saldo pendiente</p>
                    <p className="font-black text-sm text-amber-700">{fmtCents(pendingAmountCents, currency)}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Sin cuotas */
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2">
                <Receipt className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-400">Sin plan de cuotas</p>
                <p className="text-xs text-slate-400">
                  {reservation
                    ? "Esta operación no tiene cuotas generadas todavía."
                    : "No existe ninguna operación comercial registrada para este lote."}
                </p>
                <Link
                  href={`/ficha/${lotId}`}
                  className="mt-3 text-xs font-semibold text-slate-500 hover:text-slate-800 underline transition-colors print:hidden"
                >
                  Volver a la ficha del lote
                </Link>
              </div>
            )}

            {/* Notas de la reserva */}
            {reservation?.notes && (
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Notas</p>
                <p className="text-xs text-slate-600 leading-relaxed">{reservation.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 bg-slate-900 text-slate-300 px-7 py-4 flex items-center justify-between gap-4 flex-wrap print:flex-nowrap print-footer-bar">
          <div className="flex items-center gap-4 flex-wrap">
            {dev.companyLogoUrl && (
              <img
                src={dev.companyLogoUrl}
                alt={org.name}
                className="h-7 object-contain filter grayscale brightness-200 opacity-70"
              />
            )}
            <div className="flex flex-col gap-1 border-l border-slate-700 pl-4">
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
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Documento interno</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{org.name}</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 portrait; margin: 10mm; }
          .print-doc-wrapper { padding-bottom: 28mm; }
          .print-footer-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 9999;
          }
          tbody tr { break-inside: avoid; page-break-inside: avoid; }
        }
      ` }} />
    </div>
  );
}
