"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, X } from "lucide-react";

import { setOrganizationCommercialStateAction } from "@/modules/platform/billing-actions";
import type { PlatformPlanOption } from "@/modules/platform/types";

const STATUS_OPTIONS = [
  { value: "TRIALING", label: "Trial" },
  { value: "ACTIVE", label: "Activa" },
  { value: "PAST_DUE", label: "Pago pendiente" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "SUSPENDED", label: "Suspendida" },
] as const;

const BILLING_MODE_OPTIONS = [
  { value: "ONLINE", label: "Online" },
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "COURTESY", label: "Cortesía" },
  { value: "MANUAL", label: "Manual" },
] as const;

function formatDateInput(isoDate: string | null) {
  if (!isoDate) return "";
  return isoDate.slice(0, 10);
}

function addDays(base: Date, days: number) {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

export function CommercialControls({
  organizationId,
  orgName,
  planOptions,
  currentPlanId,
  currentStatus,
  currentBillingMode,
  currentPeriodEnd,
  internalBillingNotes,
}: {
  organizationId: string;
  orgName: string;
  planOptions: PlatformPlanOption[];
  currentPlanId: string | null;
  currentStatus: string;
  currentBillingMode: string | null;
  currentPeriodEnd: string | null;
  internalBillingNotes: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const defaultPlanId = useMemo(
    () => currentPlanId ?? planOptions[0]?.id ?? "",
    [currentPlanId, planOptions],
  );

  const defaultStatus =
    currentStatus === "LEGACY" ? "ACTIVE" : currentStatus === "EXPIRED" ? "PAST_DUE" : currentStatus;

  const [planId, setPlanId] = useState(defaultPlanId);
  const [subscriptionStatus, setSubscriptionStatus] = useState(defaultStatus);
  const [billingMode, setBillingMode] = useState(currentBillingMode ?? "MANUAL");
  const [periodEnd, setPeriodEnd] = useState(
    formatDateInput(currentPeriodEnd) || addDays(new Date(), 30),
  );
  const [notes, setNotes] = useState(internalBillingNotes ?? "");

  const resetState = () => {
    setPlanId(defaultPlanId);
    setSubscriptionStatus(defaultStatus);
    setBillingMode(currentBillingMode ?? "MANUAL");
    setPeriodEnd(formatDateInput(currentPeriodEnd) || addDays(new Date(), 30));
    setNotes(internalBillingNotes ?? "");
    setError("");
    setSuccess("");
  };

  const handleOpen = () => {
    resetState();
    setOpen(true);
  };

  const applyQuickPreset = (nextStatus: string, nextMode: string, days: number) => {
    setSubscriptionStatus(nextStatus);
    setBillingMode(nextMode);
    setPeriodEnd(addDays(new Date(), days));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await setOrganizationCommercialStateAction({
        organizationId,
        planId,
        subscriptionStatus,
        billingMode,
        currentPeriodEnd: periodEnd,
        internalBillingNotes: notes || undefined,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess(result.message);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 250);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
      >
        <CreditCard className="inline h-3.5 w-3.5 mr-1" />
        Comercial
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Control Comercial</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{orgName}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Activá manualmente, extendé vencimiento o suspendé sin depender solo del pago online.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => applyQuickPreset("ACTIVE", "TRANSFER", 30)}
                className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 transition hover:bg-emerald-100"
              >
                Activar 30d
              </button>
              <button
                type="button"
                onClick={() => applyQuickPreset("TRIALING", "MANUAL", 14)}
                className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-700 transition hover:bg-brand-100"
              >
                Trial 14d
              </button>
              <button
                type="button"
                onClick={() => setSubscriptionStatus("SUSPENDED")}
                className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-rose-700 transition hover:bg-rose-100"
              >
                Suspender
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Plan</label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  >
                    {planOptions.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Estado</label>
                  <select
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Modo de cobro</label>
                  <select
                    value={billingMode}
                    onChange={(e) => setBillingMode(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  >
                    {BILLING_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Vence el</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Notas internas</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: cliente abonó por transferencia, confirmar ingreso el 15/04."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                  {success}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !planId || !periodEnd}
                  className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 shadow-sm shadow-brand-500/20 disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Guardar estado comercial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
