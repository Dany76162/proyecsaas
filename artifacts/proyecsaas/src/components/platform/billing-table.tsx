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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  const subject = `Cobro â€” ${record.organization.name} â€” ${record.description}`;
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

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [planId, setPlanId] = useState("");
  const [createError, setCreateError] = useState("");

  // Invoice dialog state
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between mb-6">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por inmobiliaria..."
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500 font-medium">
            {filteredRecords.length} de {records.length} registros
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cobro
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card variant="elevated" className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Inmobiliaria</TableHead>
              <TableHead className="px-5">DescripciÃ³n</TableHead>
              <TableHead className="px-5">Monto</TableHead>
              <TableHead className="px-5">Cobro</TableHead>
              <TableHead className="px-5">Factura</TableHead>
              <TableHead className="px-5">Link MP</TableHead>
              <TableHead className="px-5 text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="px-5 py-4 font-bold text-slate-900">{r.organization.name}</TableCell>
                <TableCell className="px-5 py-4 text-slate-600 max-w-[200px]">
                  <p className="truncate font-medium">{r.description}</p>
                  {r.notes && <p className="text-xs text-slate-500 mt-1 truncate font-medium">{r.notes}</p>}
                </TableCell>
                <TableCell className="px-5 py-4 font-bold text-slate-900">{formatARS(r.amountCents)}</TableCell>

                <TableCell className="px-5 py-4">
                  <select
                    disabled={isPending}
                    value={r.status}
                    onChange={(e) => handleBillingStatus(r.id, e.target.value as "PAID" | "CANCELLED" | "PENDING")}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold outline-none transition focus:border-brand-500"
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="PAID">Pagado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </TableCell>

                <TableCell className="px-5 py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { 
                      setInvoiceRecord(r); 
                      setInvoiceStatus(r.invoiceStatus as "PENDING" | "ISSUED" | "EXEMPT"); 
                      setInvoiceNumber(r.invoiceNumber ?? ""); 
                    }}
                    className="h-8 px-3 text-[11px] font-extrabold uppercase tracking-widest"
                  >
                    <Receipt className="mr-1.5 h-3 w-3" />
                    {INVOICE_STATUS_LABELS[r.invoiceStatus]}
                  </Button>
                </TableCell>

                <TableCell className="px-5 py-4">
                  {r.mpPaymentUrl ? (
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" asChild className="h-8 px-3 text-[11px] font-extrabold uppercase tracking-widest">
                        <a href={r.mpPaymentUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 h-3 w-3" />
                          Abrir
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(r.mpPaymentUrl!, r.id)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedId === r.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                        <a href={buildWhatsAppUrl(r, r.mpPaymentUrl!)} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  ) : r.status !== "CANCELLED" && r.status !== "PAID" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleGenerateMP(r.id)}
                      className="h-8 text-xs font-bold"
                    >
                      Generar link
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-300">â€”</span>
                  )}
                </TableCell>

                <TableCell className="px-5 py-4 text-right text-sm text-slate-500 font-bold">
                  {formatDate(r.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modals placeholders - simplified for fix */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 relative">
            <Button variant="ghost" size="sm" onClick={() => { resetCreate(); setCreateOpen(false); }} className="absolute right-4 top-4 h-8 w-8 p-0">
              <X className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Nuevo cobro</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Inmobiliaria *</label>
                <select
                  required
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">SeleccionÃ¡...</option>
                  {activeOrgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">DescripciÃ³n *</label>
                <Input required value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: SuscripciÃ³n mensual" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Monto en ARS *</label>
                <Input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej: 15000" />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creando..." : "Crear registro"}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
