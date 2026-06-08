"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Landmark,
  X,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SettlementStatusBadge,
  type SettlementStatus,
} from "@/components/developments/settlement-status-badge";
import {
  registerSettlementAction,
  updateSettlementStatusAction,
} from "@/modules/platform/reservation-actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReservationRow = {
  id: string;
  status: string;
  depositCents: number;
  grossAmountCents: number | null;
  netAmountCents: number | null;
  commissionCents: number | null;
  mpPaymentId: string | null;
  mpCurrency: string | null;
  settlementStatus: SettlementStatus | null;
  settledAt: Date | null;
  settlementReference: string | null;
  settlementNotes: string | null;
  createdAt: Date;
  Lead: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  } | null;
  DevelopmentLot: {
    id: string;
    lotNumber: string;
    Development: {
      id: string;
      name: string;
      Organization: {
        id: string;
        name: string;
        slug: string;
      };
    };
  } | null;
};

type Kpis = {
  totalConfirmed: number;
  totalGrossCents: number;
  totalNetCents: number;
  pendingSettlementCount: number;
  settledCount: number;
  pendingSettlementCents: number;
};

type Props = {
  reservations: ReservationRow[];
  kpis: Kpis;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SETTLEMENT_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "Todos", value: "ALL" },
  { label: "Pendiente", value: "PENDING" },
  { label: "En revisión", value: "IN_REVIEW" },
  { label: "Liquidado", value: "SETTLED" },
  { label: "Retenido", value: "HELD" },
  { label: "Devuelto", value: "REFUNDED" },
];

function formatARS(cents: number | null) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

// ── Settlement Modal ──────────────────────────────────────────────────────────

function SettlementModal({
  reservation,
  onClose,
}: {
  reservation: ReservationRow;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await registerSettlementAction({
        reservationId: reservation.id,
        settlementReference: reference,
        settlementNotes: notes || undefined,
      });
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  const org = reservation.DevelopmentLot?.Development?.Organization;
  const dev = reservation.DevelopmentLot?.Development;
  const lot = reservation.DevelopmentLot;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Landmark className="h-5 w-5" />
            <h2 className="text-base font-bold">Registrar Liquidación</h2>
          </div>
          <p className="text-sm text-slate-500">
            Confirmás que el monto neto fue transferido a la desarrolladora.
          </p>
        </div>

        {/* Resumen */}
        <div className="mb-5 rounded-xl bg-slate-50 p-4 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Desarrolladora</span>
            <span className="font-semibold text-slate-800">{org?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Desarrollo / Lote</span>
            <span className="font-semibold text-slate-800">
              {dev?.name ?? "—"} / Lote {lot?.lotNumber ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Comprador</span>
            <span className="font-semibold text-slate-800">
              {reservation.Lead?.fullName ?? "—"}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
            <span className="text-slate-500">Monto bruto (MP)</span>
            <span className="font-semibold">{formatARS(reservation.grossAmountCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Monto neto a liquidar</span>
            <span className="font-bold text-emerald-700 text-base">
              {formatARS(reservation.netAmountCents)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">ID de pago MP</span>
            <span className="font-mono text-xs text-slate-600">
              {reservation.mpPaymentId ?? "—"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Referencia de transferencia <span className="text-red-500">*</span>
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej: TRF-20260608-001, CVU de destino, etc."
              required
              minLength={2}
              maxLength={200}
              disabled={isPending}
            />
            <p className="text-xs text-slate-400">
              Número de CVU, CBU, referencia bancaria o código de la transferencia.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Notas internas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones adicionales para el registro..."
              maxLength={1000}
              rows={3}
              disabled={isPending}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isPending || !reference.trim()}
            >
              {isPending ? "Registrando…" : "Confirmar liquidación"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Status Updater ────────────────────────────────────────────────────────────

function StatusUpdater({
  reservation,
}: {
  reservation: ReservationRow;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (
    reservation.settlementStatus === "SETTLED" ||
    reservation.settlementStatus === "REFUNDED"
  ) {
    return null;
  }

  const options =
    reservation.settlementStatus === "HELD"
      ? [{ label: "Mover a En revisión", value: "IN_REVIEW" }]
      : reservation.settlementStatus === "IN_REVIEW"
      ? [{ label: "Retener pago", value: "HELD" }]
      : [
          { label: "Marcar En revisión", value: "IN_REVIEW" },
          { label: "Retener pago", value: "HELD" },
        ];

  function handleSelect(newStatus: string) {
    setOpen(false);
    startTransition(async () => {
      const result = await updateSettlementStatusAction({
        reservationId: reservation.id,
        newStatus: newStatus as "IN_REVIEW" | "HELD",
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50"
      >
        {isPending ? "…" : "Estado"}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-slate-200 bg-white shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReservationsTable({ reservations, kpis }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [settling, setSettling] = useState<ReservationRow | null>(null);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const matchesStatus =
        statusFilter === "ALL" || r.settlementStatus === statusFilter;

      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.Lead?.fullName?.toLowerCase().includes(q) ||
        r.Lead?.email?.toLowerCase().includes(q) ||
        r.DevelopmentLot?.Development?.Organization?.name?.toLowerCase().includes(q) ||
        r.DevelopmentLot?.Development?.name?.toLowerCase().includes(q) ||
        r.DevelopmentLot?.lotNumber?.toLowerCase().includes(q) ||
        r.mpPaymentId?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [reservations, search, statusFilter]);

  return (
    <>
      {settling && (
        <SettlementModal
          reservation={settling}
          onClose={() => setSettling(null)}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Cobros confirmados
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {kpis.totalConfirmed}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">Pagos vía MP activos</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total recaudado
          </p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">
            {formatARS(kpis.totalGrossCents)}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">Bruto MP acumulado</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pendiente a liquidar
          </p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">
            {formatARS(kpis.pendingSettlementCents)}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            {kpis.pendingSettlementCount} cobro
            {kpis.pendingSettlementCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Liquidados
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {kpis.settledCount}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">Transferencias registradas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar comprador, desarrollo, lote, ID MP…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SETTLEMENT_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                statusFilter === opt.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16">
          <Landmark className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">Sin cobros de reservas</p>
          <p className="text-xs text-slate-400 mt-1">
            Aquí aparecerán los pagos de señas confirmados por Mercado Pago.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Desarrolladora / Desarrollo
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Lote
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Comprador
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  ID Pago MP
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                  Bruto
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                  Neto
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Estado liquidación
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Liquidado
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const org = r.DevelopmentLot?.Development?.Organization;
                const dev = r.DevelopmentLot?.Development;
                const lot = r.DevelopmentLot;
                const canSettle =
                  r.settlementStatus !== "SETTLED" &&
                  r.settlementStatus !== "REFUNDED" &&
                  r.mpPaymentId &&
                  r.grossAmountCents &&
                  r.netAmountCents;

                return (
                  <TableRow key={r.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="font-semibold text-slate-800 text-sm">
                        {org?.name ?? "—"}
                      </div>
                      <div className="text-xs text-slate-400">{dev?.name ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {lot?.lotNumber ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-800">
                        {r.Lead?.fullName ?? "—"}
                      </div>
                      <div className="text-xs text-slate-400">{r.Lead?.email ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-500">
                        {r.mpPaymentId ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-700">
                      {formatARS(r.grossAmountCents)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">
                      {formatARS(r.netAmountCents)}
                    </TableCell>
                    <TableCell>
                      <SettlementStatusBadge
                        status={r.settlementStatus ?? "PENDING"}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {r.settledAt ? formatDate(r.settledAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canSettle && (
                          <button
                            type="button"
                            onClick={() => setSettling(r)}
                            className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Liquidar
                          </button>
                        )}
                        <StatusUpdater reservation={r} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
