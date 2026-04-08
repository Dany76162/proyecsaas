"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, X, Receipt, Copy, Check, MessageCircle, Mail, Search } from "lucide-react";
import type { OrgBillingRecord, Organization } from "@prisma/client";
import type { PlatformPlanOption } from "@/modules/platform/types";
import {
  createBillingRecordAction,
  generateMPPaymentLinkAction,
  updateBillingStatusAction,
  updateInvoiceStatusAction,
} from "@/modules/platform/billing-actions";

type RecordWithOrg = OrgBillingRecord & { organization: Pick<Organization, "id" | "name" | "slug"> };
type ActiveOrg = { id: string; name: string };

const BILLING_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Sin factura",
  ISSUED: "Emitida",
  EXEMPT: "Exenta",
};

function buildWhatsAppUrl(record: RecordWithOrg, paymentUrl: string): string {
  const text = [
    `*${record.organization.name}*`,
    record.description,
    `Monto: ${new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(record.amountCents / 100)}`,
    `Link de pago: ${paymentUrl}`,
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function buildMailtoUrl(record: RecordWithOrg, paymentUrl: string): string {
  const subject = `Cobro — ${record.organization.name} — ${record.description}`;
  const body = [
    `Hola,`,
    ``,
    `Te enviamos el link de pago correspondiente a:`,
    ``,
    `Inmobiliaria: ${record.organization.name}`,
    `Concepto: ${record.description}`,
    `Monto: ${new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(record.amountCents / 100)}`,
    ``,
    `Link de pago: ${paymentUrl}`,
  ].join("\n");
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const formatARS = (cents: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const formatDate = (d: Date) =>
  new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export function BillingTable({
  records,
  activeOrgs,
  plans,
}: {
  records: RecordWithOrg[];
  activeOrgs: ActiveOrg[];
  plans: PlatformPlanOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => r.organization.name.toLowerCase().includes(q));
  }, [records, search]);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    });
  };

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [planId, setPlanId] = useState("");
  const [createError, setCreateError] = useState("");

  // Invoice dialog
  const [invoiceRecord, setInvoiceRecord] = useState<RecordWithOrg | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<"PENDING" | "ISSUED" | "EXEMPT">("ISSUED");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceError, setInvoiceError] = useState("");

  const resetCreate = () => {
    setOrgId(""); setDesc(""); setAmount(""); setNotes(""); setPlanId(""); setCreateError("");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    startTransition(async () => {
      const res = await createBillingRecordAction({
        organizationId: orgId,
        description: desc,
        amountARS: parseFloat(amount),
        notes: notes || undefined,
        planId: planId || undefined,
      });
      if (res.success) {
        resetCreate();
        setCreateOpen(false);
        // Defer refresh to the next tick so React commits the modal unmount
        // before reconciling the server component tree. Calling router.refresh()
        // synchronously with setCreateOpen(false) inside startTransition causes
        // a concurrent DOM mutation race that produces a removeChild crash.
        setTimeout(() => router.refresh(), 0);
      } else {
        setCreateError(res.message);
      }
    });
  };

  const handleGenerateMP = (recordId: string) => {
    startTransition(async () => {
      const res = await generateMPPaymentLinkAction(recordId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.message);
      }
    });
  };

  const handleBillingStatus = (recordId: string, status: "PAID" | "CANCELLED" | "PENDING") => {
    startTransition(async () => {
      await updateBillingStatusAction(recordId, status);
      router.refresh();
    });
  };

  const handleInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceRecord) return;
    setInvoiceError("");
    startTransition(async () => {
      const res = await updateInvoiceStatusAction(
        invoiceRecord.id,
        invoiceStatus,
        invoiceNumber || undefined,
      );
      if (res.success) {
        setInvoiceRecord(null);
        setInvoiceNumber("");
        setTimeout(() => router.refresh(), 0);
      } else {
        setInvoiceError(res.message);
      }
    });
  };

  return (
    <>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por inmobiliaria..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-slate-400 transition"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-400">
            {filteredRecords.length} de {records.length} registro{records.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo cobro
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Inmobiliaria</th>
                <th className="px-5 py-3.5">Descripción</th>
                <th className="px-5 py-3.5">Monto</th>
                <th className="px-5 py-3.5">Cobro</th>
                <th className="px-5 py-3.5">Factura</th>
                <th className="px-5 py-3.5">Link MP</th>
                <th className="px-5 py-3.5 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-4 font-semibold text-slate-900">{r.organization.name}</td>
                  <td className="px-5 py-4 text-slate-600 max-w-[200px]">
                    <p className="truncate">{r.description}</p>
                    {r.notes && <p className="text-xs text-slate-400 truncate">{r.notes}</p>}
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-900">{formatARS(r.amountCents)}</td>

                  {/* Payment status */}
                  <td className="px-5 py-4">
                    <select
                      disabled={isPending}
                      value={r.status}
                      onChange={(e) => handleBillingStatus(r.id, e.target.value as "PAID" | "CANCELLED" | "PENDING")}
                      className={`rounded-lg border px-2 py-1 text-xs font-bold outline-none transition ${
                        r.status === "PAID"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : r.status === "CANCELLED"
                            ? "border-slate-200 bg-slate-50 text-slate-400"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      <option value="PENDING">Pendiente</option>
                      <option value="PAID">Pagado</option>
                      <option value="CANCELLED">Cancelado</option>
                    </select>
                  </td>

                  {/* Invoice status */}
                  <td className="px-5 py-4">
                    <button
                      onClick={() => { setInvoiceRecord(r); setInvoiceStatus(r.invoiceStatus as "PENDING" | "ISSUED" | "EXEMPT"); setInvoiceNumber(r.invoiceNumber ?? ""); }}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-bold transition hover:opacity-80 ${
                        r.invoiceStatus === "ISSUED"
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : r.invoiceStatus === "EXEMPT"
                            ? "border-slate-200 bg-slate-50 text-slate-500"
                            : "border-orange-200 bg-orange-50 text-orange-700"
                      }`}
                    >
                      <Receipt className="h-3 w-3" />
                      {INVOICE_STATUS_LABELS[r.invoiceStatus]}
                    </button>
                  </td>

                  {/* MP Link */}
                  <td className="px-5 py-4">
                    {r.mpPaymentUrl ? (
                      <div className="flex items-center gap-1">
                        <a
                          href={r.mpPaymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir link de pago"
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Abrir
                        </a>
                        <button
                          onClick={() => handleCopy(r.mpPaymentUrl!, r.id)}
                          title="Copiar link"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        >
                          {copiedId === r.id
                            ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <a
                          href={buildWhatsAppUrl(r, r.mpPaymentUrl!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Compartir por WhatsApp"
                          className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={buildMailtoUrl(r, r.mpPaymentUrl!)}
                          title="Enviar por email"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ) : r.status !== "CANCELLED" && r.status !== "PAID" ? (
                      <button
                        disabled={isPending}
                        onClick={() => handleGenerateMP(r.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Generar link
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-right text-xs text-slate-400">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    {search ? (
                      <>
                        <p className="text-base font-semibold text-slate-900">Sin resultados para &ldquo;{search}&rdquo;</p>
                        <p className="mt-1 text-sm text-slate-500">Probá con otro nombre de inmobiliaria.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-base font-semibold text-slate-900">Sin registros comerciales</p>
                        <p className="mt-1 text-sm text-slate-500">Creá el primer cobro con el botón &ldquo;Nuevo cobro&rdquo;.</p>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create dialog */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nuevo cobro</h2>
              <button onClick={() => { resetCreate(); setCreateOpen(false); }} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Inmobiliaria <span className="text-red-500">*</span></label>
                <select
                  required
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="">Seleccioná una inmobiliaria...</option>
                  {activeOrgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Descripción <span className="text-red-500">*</span></label>
                <input required type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Suscripción mensual — Starter" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-900" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Monto en ARS <span className="text-red-500">*</span></label>
                <input required type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej: 15000" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-900" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Plan a activar</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="">Solo cobrar, sin activar plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Si elegís un plan, el webhook de Mercado Pago renovará la suscripción al acreditarse.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Notas internas</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-900 resize-none" />
              </div>
              {createError && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{createError}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => { resetCreate(); setCreateOpen(false); }} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={isPending} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50">{isPending ? "Guardando..." : "Crear registro"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice status dialog */}
      {invoiceRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Estado de factura</h2>
              <button onClick={() => setInvoiceRecord(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 text-sm text-slate-500">{invoiceRecord.organization.name} — {invoiceRecord.description}</p>
            <form onSubmit={handleInvoiceSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Estado</label>
                <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value as "PENDING" | "ISSUED" | "EXEMPT")} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none">
                  <option value="PENDING">Sin factura</option>
                  <option value="ISSUED">Emitida</option>
                  <option value="EXEMPT">Exenta</option>
                </select>
              </div>
              {invoiceStatus === "ISSUED" && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Número de comprobante</label>
                  <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Ej: 0001-00000123" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none" />
                </div>
              )}
              {invoiceError && <p className="text-sm text-red-600">{invoiceError}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setInvoiceRecord(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={isPending} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50">{isPending ? "Guardando..." : "Confirmar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
