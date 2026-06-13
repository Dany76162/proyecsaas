"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  FileText,
  ListChecks,
} from "lucide-react";
import type { LotEconomicRow } from "./page";

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtCents(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function fmtSqm(v: number | null) {
  if (!v || v <= 0) return "—";
  return `${v.toLocaleString("es-AR", { maximumFractionDigits: 1 })} m²`;
}

function fmtPrice(cents: number | null, currency: string) {
  if (!cents || cents <= 0) return null;
  return fmtCents(cents, currency);
}

function fmtPricePerSqm(v: number | null, currency: string) {
  if (v === null) return null;
  return `${currency} ${v.toLocaleString("es-AR", { maximumFractionDigits: 0 })}/m²`;
}

// ── Status badges ─────────────────────────────────────────────────────────────

const LOT_STATUS_CONFIG: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  AVAILABLE: {
    label: "Disponible",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  RESERVED_PENDING: {
    label: "Reserva pendiente",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  RESERVED: {
    label: "Reserva confirmada",
    cls: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  SOLD: {
    label: "Vendido",
    cls: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  BLOCKED: {
    label: "Bloqueado",
    cls: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
  },
};

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pendiente aprobación",
  ACTIVE: "Activa",
  SOLD: "Vendida",
  CANCELLED: "Cancelada",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  lots: LotEconomicRow[];
  orgSlug: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LotEconomicsTable({ lots, orgSlug }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");

  // Collect unique currencies for filter
  const currencies = useMemo(
    () => [...new Set(lots.map((l) => l.currency))],
    [lots],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lots.filter((l) => {
      if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
      if (currencyFilter !== "ALL" && l.currency !== currencyFilter) return false;
      if (q) {
        const haystack =
          `${l.lotNumber} ${l.manzana ?? ""} ${l.etapaNombre ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [lots, search, statusFilter, currencyFilter]);

  // Aggregates for filtered set
  const totals = useMemo(() => {
    const totalArea = filtered.reduce((s, l) => s + (l.areaSqm ?? 0), 0);
    const totalPrice = filtered
      .filter((l) => l.priceCents && l.priceCents > 0)
      .reduce((s, l) => s + (l.priceCents ?? 0), 0);
    const totalCollected = filtered.reduce((s, l) => s + l.totalCollectedCents, 0);
    const totalPending = filtered.reduce((s, l) => s + l.pendingInstallmentsCents, 0);
    return { totalArea, totalPrice, totalCollected, totalPending };
  }, [filtered]);

  const defaultCurrency = lots[0]?.currency ?? "USD";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por lote o manzana…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="ALL">Todos los estados</option>
          <option value="AVAILABLE">Disponible</option>
          <option value="RESERVED_PENDING">Reserva pendiente</option>
          <option value="RESERVED">Reserva confirmada</option>
          <option value="SOLD">Vendido</option>
          <option value="BLOCKED">Bloqueado</option>
        </select>

        {/* Currency filter */}
        {currencies.length > 1 && (
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="ALL">Todas las monedas</option>
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        <span className="text-[10px] text-slate-400 ml-auto">
          {filtered.length} de {lots.length} lote{lots.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Aggregates banner */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "m² totales", value: fmtSqm(totals.totalArea) },
            {
              label: "Valor lista",
              value: totals.totalPrice > 0 ? fmtCents(totals.totalPrice, defaultCurrency) : "—",
            },
            {
              label: "Cobrado confirmado",
              value: totals.totalCollected > 0 ? fmtCents(totals.totalCollected, defaultCurrency) : "—",
            },
            {
              label: "Cuotas pendientes",
              value: totals.totalPending > 0 ? fmtCents(totals.totalPending, defaultCurrency) : "—",
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2.5"
            >
              <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
              <p className="text-xs font-black text-slate-800 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl px-6 py-8 text-center bg-slate-50 dark:bg-slate-900/50">
          <p className="text-xs font-bold text-slate-500">Sin resultados</p>
          <p className="text-[11px] text-slate-400 mt-1">
            No hay lotes que coincidan con los filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-3 py-2.5 font-black text-[10px] uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Lote
                </th>
                <th className="text-left px-3 py-2.5 font-black text-[10px] uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Estado
                </th>
                <th className="text-right px-3 py-2.5 font-black text-[10px] uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  m²
                </th>
                <th className="text-right px-3 py-2.5 font-black text-[10px] uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Precio
                </th>
                <th className="text-right px-3 py-2.5 font-black text-[10px] uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  $/m²
                </th>
                <th className="text-left px-3 py-2.5 font-black text-[10px] uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Reserva
                </th>
                <th className="text-right px-3 py-2.5 font-black text-[10px] uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Cobrado
                </th>
                <th className="text-right px-3 py-2.5 font-black text-[10px] uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Cuotas pend.
                </th>
                <th className="text-right px-3 py-2.5 font-black text-[10px] uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Saldo
                </th>
                <th className="text-left px-3 py-2.5 font-black text-[10px] uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((lot) => (
                <LotRow key={lot.id} lot={lot} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function LotRow({ lot }: { lot: LotEconomicRow }) {
  const statusCfg = LOT_STATUS_CONFIG[lot.status] ?? {
    label: lot.status,
    cls: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
  };

  const price = fmtPrice(lot.priceCents, lot.currency);
  const pricePerSqm = fmtPricePerSqm(lot.pricePerSqm, lot.currency);
  const missingData = !lot.priceCents || !lot.areaSqm;

  return (
    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
      {/* Lote */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="font-bold text-slate-800 dark:text-white">
          {lot.lotNumber}
        </div>
        {lot.manzana && (
          <div className="text-[10px] text-slate-400">Mz. {lot.manzana}</div>
        )}
        {lot.etapaNombre && !lot.manzana && (
          <div className="text-[10px] text-slate-400">{lot.etapaNombre}</div>
        )}
      </td>

      {/* Estado */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusCfg.cls}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
      </td>

      {/* m² */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap text-slate-700 dark:text-slate-300">
        {fmtSqm(lot.areaSqm)}
      </td>

      {/* Precio */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {price ? (
          <span className="font-bold text-slate-800 dark:text-white">{price}</span>
        ) : (
          <MissingDataBadge />
        )}
      </td>

      {/* $/m² */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {pricePerSqm ? (
          <span className="text-slate-600 dark:text-slate-300">{pricePerSqm}</span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>

      {/* Reserva */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        {lot.reservation ? (
          <div className="space-y-0.5">
            <ReservationBadge status={lot.reservation.status} />
            {lot.paymentConfirmed ? (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-[10px] text-emerald-600 font-semibold">
                  Pago confirmado
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-[10px] text-amber-600">Sin confirmar</span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>

      {/* Cobrado */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {lot.totalCollectedCents > 0 ? (
          <div>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {fmtCents(lot.totalCollectedCents, lot.currency)}
            </span>
            {lot.installmentSummary.paidCount > 0 && (
              <div className="text-[10px] text-slate-400">
                {lot.installmentSummary.paidCount} cuota
                {lot.installmentSummary.paidCount !== 1 ? "s" : ""} pag.
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>

      {/* Pend. cuotas */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {lot.pendingInstallmentsCents > 0 ? (
          <div>
            <span
              className={`font-bold ${lot.installmentSummary.overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
            >
              {fmtCents(lot.pendingInstallmentsCents, lot.currency)}
            </span>
            <div className="text-[10px] text-slate-400">
              {lot.installmentSummary.overdueCount > 0 && (
                <span className="text-red-500">
                  {lot.installmentSummary.overdueCount} venc.{" "}
                </span>
              )}
              {lot.installmentSummary.pendingCount > 0 && (
                <span>{lot.installmentSummary.pendingCount} pend.</span>
              )}
            </div>
          </div>
        ) : lot.installmentSummary.totalCount > 0 ? (
          <span className="text-[10px] text-emerald-500 font-semibold">
            Al día
          </span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>

      {/* Saldo */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {lot.balancePendingCents !== null ? (
          <span
            className={`font-bold ${lot.balancePendingCents === 0 ? "text-emerald-600" : "text-slate-800 dark:text-white"}`}
          >
            {lot.balancePendingCents === 0
              ? "Saldado"
              : fmtCents(lot.balancePendingCents, lot.currency)}
          </span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>

      {/* Acciones */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          {lot.paymentConfirmed ? (
            <>
              <a
                href={`/ficha/${lot.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-100 dark:border-brand-800 text-[10px] font-bold hover:bg-brand-100 transition"
              >
                <FileText className="w-3 h-3" />
                Ficha
                <ChevronRight className="w-2.5 h-2.5" />
              </a>
              {(lot.reservation?.installmentCount ?? 0) > 0 && (
                <a
                  href={`/ficha/${lot.id}/cuotas`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800 text-[10px] font-bold hover:bg-sky-100 transition"
                >
                  <ListChecks className="w-3 h-3" />
                  Cuotas
                  <ChevronRight className="w-2.5 h-2.5" />
                </a>
              )}
            </>
          ) : lot.reservation ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px]">
              <Lock className="w-3 h-3" />
              PAY-LOCK
            </span>
          ) : null}

          {missingData && (
            <span title="Faltan precio o superficie">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReservationBadge({ status }: { status: string }) {
  const label = RESERVATION_STATUS_LABELS[status] ?? status;
  const cls =
    status === "ACTIVE"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : status === "PENDING_APPROVAL"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-slate-500 bg-slate-100 border-slate-200";
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function MissingDataBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
      <AlertTriangle className="w-3 h-3 text-amber-400" />
      Sin datos
    </span>
  );
}
