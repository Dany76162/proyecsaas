"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ExternalLink, 
  Plus, 
  X, 
  Receipt, 
  Copy, 
  Check, 
  MessageCircle, 
  Mail, 
  Search, 
  Archive, 
  Calendar, 
  TrendingUp, 
  Download, 
  Eye, 
  Printer, 
  AlertTriangle,
  Clock,
  Settings2,
  Brain
} from "lucide-react";
import type { OrgBillingRecord, Organization } from "@prisma/client";
import { BillingStatus } from "@prisma/client";
import type { PlatformPlanOption } from "@/modules/platform/types";
import {
  createBillingRecordAction,
  generateMPPaymentLinkAction,
  updateBillingStatusAction,
  updateInvoiceStatusAction,
  archiveBillingRecordAction,
  suggestBillingMessageAction,
  updateBillingProAction,
  toggleBillingRemindersAction
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RecordWithOrg = OrgBillingRecord & { organization: Pick<Organization, "id" | "name" | "slug"> };
type ActiveOrg = { id: string; name: string };

const BILLING_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
  OVERDUE: "Vencido",
  ARCHIVED: "Archivado",
};

const BILLING_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-50 text-slate-500 border-slate-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  ARCHIVED: "bg-slate-100 text-slate-400 border-slate-200",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Sin factura",
  ISSUED: "Emitida",
  EXEMPT: "Exenta",
};

const formatARS = (cents: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const formatDate = (d: Date | null) => {
  if (!d) return "â€”";
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

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
  const [activeTab, setActiveTab] = useState("active");

  // Suggestion state
  const [suggestedMsg, setSuggestedMsg] = useState<string | null>(null);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    let base = records;
    const q = search.trim().toLowerCase();

    if (activeTab === "active") {
      base = records.filter(r => r.status !== "ARCHIVED" && r.status !== "CANCELLED");
    } else if (activeTab === "paid") {
      base = records.filter(r => r.status === "PAID");
    } else if (activeTab === "archived") {
      base = records.filter(r => r.status === "ARCHIVED" || r.status === "CANCELLED");
    }

    if (q) {
      base = base.filter((r: RecordWithOrg) => r.organization.name.toLowerCase().includes(q));
    }
    return base;
  }, [records, search, activeTab]);

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
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [planId, setPlanId] = useState("");
  const [createError, setCreateError] = useState("");

  // Edit dialog state
  const [editingRecord, setEditingRecord] = useState<RecordWithOrg | null>(null);

  // Receipt state
  const [receiptRecord, setReceiptRecord] = useState<RecordWithOrg | null>(null);

  const resetCreate = () => {
    setOrgId(""); setDesc(""); setAmount(""); setDueDate(""); setNotes(""); setPlanId(""); setCreateError("");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    startTransition(async () => {
      const res = await createBillingRecordAction({
        organizationId: orgId,
        description: desc,
        amountARS: parseFloat(amount),
        dueDate: dueDate || undefined,
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

  const handleArchive = (recordId: string) => {
    if (!confirm("Â¿Seguro que querÃ©s archivar este cobro? DejarÃ¡ de aparecer en la lista activa.")) return;
    startTransition(async () => {
      await archiveBillingRecordAction(recordId);
      router.refresh();
    });
  };

  const handleSuggestMessage = (recordId: string) => {
    setSuggestingId(recordId);
    startTransition(async () => {
      const res = await suggestBillingMessageAction(recordId);
      if (res.success) {
        setSuggestedMsg(res.data.message);
      } else {
        alert(res.message);
        setSuggestingId(null);
      }
    });
  };

  const exportCSV = () => {
    const headers = ["Fecha", "Cliente", "Descripcion", "Monto", "Estado", "Vencimiento", "Pago", "Metodo", "Recibo"];
    const rows = filteredRecords.map(r => [
      new Date(r.createdAt).toLocaleDateString(),
      r.organization.name,
      r.description,
      r.amountCents / 100,
      r.status,
      r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "",
      r.paidAt ? new Date(r.paidAt).toLocaleDateString() : "",
      r.paymentMethod || "",
      r.receiptNumber || ""
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `balance_comercial_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Tabs defaultValue="active" onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="active" className="text-xs font-bold px-4">Activos</TabsTrigger>
            <TabsTrigger value="paid" className="text-xs font-bold px-4">Pagados</TabsTrigger>
            <TabsTrigger value="archived" className="text-xs font-bold px-4">Historial / Bajas</TabsTrigger>
            <TabsTrigger value="balance" className="text-xs font-bold px-4">Balances</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="h-9 px-4">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 w-9 p-0">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="balance" className="mt-0">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-brand-600" />
              <h3 className="text-lg font-bold">Balance Operativo</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Desglose Mensual</h4>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => {
                    const d = new Date(); d.setMonth(d.getMonth() - i);
                    const monthName = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
                    const monthRecords = records.filter(r => new Date(r.createdAt).getMonth() === d.getMonth());
                    const paid = monthRecords.filter(r => r.status === "PAID").reduce((s, r) => s + r.amountCents, 0);
                    const total = monthRecords.reduce((s, r) => s + r.amountCents, 0);
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/50">
                        <div>
                          <p className="text-sm font-bold capitalize text-slate-700">{monthName}</p>
                          <p className="text-xs text-slate-400">{monthRecords.length} cobros</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">{formatARS(paid)}</p>
                          <p className="text-[10px] text-slate-400">de {formatARS(total)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={80} /></div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">ProyecciÃ³n Anual</p>
                <h2 className="text-4xl font-black mt-2 text-brand-400">
                  {formatARS(records.reduce((s, r) => s + r.amountCents, 0))}
                </h2>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Cobrado real</p>
                    <p className="text-xl font-bold">{formatARS(records.filter(r => r.status === "PAID").reduce((s, r) => s + r.amountCents, 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Cobrabilidad</p>
                    <p className="text-xl font-bold">
                      {Math.round((records.filter(r => r.status === "PAID").length / records.length) * 100) || 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="mt-0">
          <Card className="overflow-hidden border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[200px] px-5">Inmobiliaria</TableHead>
                  <TableHead className="px-5">Concepto / Vencimiento</TableHead>
                  <TableHead className="px-5">Monto</TableHead>
                  <TableHead className="px-5 text-center">Estado</TableHead>
                  <TableHead className="px-5 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium">
                      No hay registros activos para mostrar.
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.map((r: RecordWithOrg) => {
                  const now = new Date();
                  const isOverdue = r.dueDate && new Date(r.dueDate) < now && r.status !== "PAID";
                  const status = isOverdue ? "OVERDUE" : r.status;
                  
                  return (
                    <TableRow key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-5 py-4">
                        <p className="font-bold text-slate-900">{r.organization.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">/{r.organization.slug}</p>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <p className="font-medium text-slate-700">{r.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className={`text-xs font-bold ${isOverdue ? "text-red-500" : "text-slate-500"}`}>
                            {r.dueDate ? `Vence: ${formatDate(r.dueDate)}` : "Sin vencimiento"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 font-black text-slate-900">{formatARS(r.amountCents)}</TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-black uppercase ${BILLING_STATUS_COLORS[status]}`}>
                          {BILLING_STATUS_LABELS[status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-brand-600 hover:bg-brand-50"
                            onClick={() => handleSuggestMessage(r.id)}
                            title="Sugerir mensaje cobranza"
                          >
                            <Brain className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => { setEditingRecord(r); }}
                            title="Editar detalles"
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          {r.status === "PAID" ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => setReceiptRecord(r)}
                              title="Ver Recibo"
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
                              onClick={() => handleArchive(r.id)}
                              title="Archivar"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="paid" className="mt-0">
          {/* Similar table but for paid only */}
          <Card className="overflow-hidden border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="px-5">Cliente</TableHead>
                  <TableHead className="px-5">Concepto</TableHead>
                  <TableHead className="px-5">Monto</TableHead>
                  <TableHead className="px-5">Fecha Pago</TableHead>
                  <TableHead className="px-5 text-right">Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((r: RecordWithOrg) => (
                   <TableRow key={r.id}>
                    <TableCell className="px-5 py-4 font-bold">{r.organization.name}</TableCell>
                    <TableCell className="px-5 py-4 text-slate-500">{r.description}</TableCell>
                    <TableCell className="px-5 py-4 font-black">{formatARS(r.amountCents)}</TableCell>
                    <TableCell className="px-5 py-4 text-emerald-600 font-bold">{formatDate(r.paidAt || r.updatedAt)}</TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setReceiptRecord(r)} className="h-8 px-3 text-xs font-bold">
                        <Receipt className="mr-2 h-3.5 w-3.5" />
                        Ver Recibo
                      </Button>
                    </TableCell>
                   </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="archived" className="mt-0">
           <Card className="overflow-hidden border-slate-200 opacity-70">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="px-5">Cliente</TableHead>
                  <TableHead className="px-5">Concepto</TableHead>
                  <TableHead className="px-5 text-center">Estado</TableHead>
                  <TableHead className="px-5 text-right">Fecha Archivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((r: RecordWithOrg) => (
                   <TableRow key={r.id}>
                    <TableCell className="px-5 py-4 font-bold text-slate-500">{r.organization.name}</TableCell>
                    <TableCell className="px-5 py-4 text-slate-400">{r.description}</TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Badge variant="outline" className="text-[10px] font-bold">{BILLING_STATUS_LABELS[r.status]}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right text-xs text-slate-400">{formatDate(r.archivedAt || r.updatedAt)}</TableCell>
                   </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suggestion Dialog */}
      {suggestedMsg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <Card className="w-full max-w-lg p-8 relative shadow-2xl border-brand-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600">
                <Brain className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Agente de Cobranzas</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sugerencia Pro</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative">
              <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{suggestedMsg}</p>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(suggestedMsg);
                  alert("Mensaje copiado al portapapeles.");
                }} 
                className="flex-1 h-12 font-bold"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar mensaje
              </Button>
              <Button variant="outline" onClick={() => setSuggestedMsg(null)} className="h-12 px-6">Cerrar</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create Dialog */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-8 relative shadow-2xl">
            <Button variant="ghost" size="sm" onClick={() => { resetCreate(); setCreateOpen(false); }} className="absolute right-4 top-4 h-8 w-8 p-0">
              <X className="h-5 w-5" />
            </Button>
            <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Nuevo Cobro</h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Inmobiliaria *</label>
                <select
                  required
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium focus:border-brand-500 outline-none"
                >
                  <option value="">Seleccioná...</option>
                  {activeOrgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Descripción *</label>
                <Input required value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Abono mensual Mayo" className="h-11 px-4 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Monto ARS *</label>
                  <Input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="h-11 px-4 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Vencimiento</label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11 px-4 rounded-xl" />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 font-bold mt-4" disabled={isPending}>
                {isPending ? "Procesando..." : "Crear Registro Comercial"}
              </Button>
              {createError && <p className="text-xs text-red-500 font-bold text-center mt-2">{createError}</p>}
            </form>
          </Card>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-sm print:bg-white print:p-0">
          <Card className="w-full max-w-lg bg-white p-12 shadow-2xl relative print:shadow-none print:w-full print:max-w-none">
            <Button variant="ghost" size="sm" onClick={() => setReceiptRecord(null)} className="absolute right-4 top-4 h-8 w-8 p-0 print:hidden">
              <X className="h-5 w-5" />
            </Button>
            
            <div id="printable-receipt" className="space-y-10">
              <div className="flex justify-between items-start border-b pb-8 border-slate-100">
                <div>
                  <h1 className="text-3xl font-black tracking-tighter text-slate-900">
                    Raíces<span className="text-brand-600">Pilot</span>
                  </h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Infraestructura Operativa</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-brand-200 text-brand-700 font-black">RECIBO INTERNO</Badge>
                  <p className="text-xs font-bold text-slate-500 mt-2">#{receiptRecord.receiptNumber || receiptRecord.id.slice(-6).toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entregado a</p>
                  <p className="font-black text-slate-900 text-lg">{receiptRecord.organization.name}</p>
                  <p className="text-sm text-slate-500">ID: {receiptRecord.organization.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha de Pago</p>
                  <p className="font-bold text-slate-900">{formatDate(receiptRecord.paidAt || receiptRecord.updatedAt)}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                  <p className="text-sm font-bold text-slate-600">{receiptRecord.description}</p>
                  <p className="text-sm font-black text-slate-900">{formatARS(receiptRecord.amountCents)}</p>
                </div>
                <div className="flex justify-between items-center pt-4">
                  <p className="text-sm font-black text-slate-900">TOTAL CANCELADO</p>
                  <p className="text-xl font-black text-emerald-600">{formatARS(receiptRecord.amountCents)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-widest">Método</span>
                  <span className="text-slate-700 font-black">{receiptRecord.paymentMethod || "Electrónico (MP)"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-widest">Estado</span>
                  <span className="text-emerald-600 font-black">CONFIRMADO</span>
                </div>
              </div>

              <div className="pt-10 border-t border-slate-100 text-center">
                <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                  Este documento es un comprobante interno de gestión administrativa de RaicesPilot.<br />
                  No posee valor fiscal como factura A/B/C. Los pagos vÃa Mercado Pago son procesados por su respectiva pasarela.
                </p>
              </div>
            </div>

            <div className="mt-10 flex gap-3 print:hidden">
              <Button className="flex-1 h-12 font-bold" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir comprobante
              </Button>
              <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setReceiptRecord(null)}>
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Details Dialog */}
      {editingRecord && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
         <Card className="w-full max-w-lg p-8 relative shadow-2xl">
           <Button variant="ghost" size="sm" onClick={() => { setEditingRecord(null); }} className="absolute right-4 top-4 h-8 w-8 p-0">
             <X className="h-5 w-5" />
           </Button>
           <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Editar Detalles</h2>
           <form onSubmit={(e) => {
             e.preventDefault();
             const data = new FormData(e.currentTarget);
             startTransition(async () => {
               await updateBillingProAction({
                 id: editingRecord.id,
                 paymentMethod: data.get("paymentMethod") as string,
                 receiptNumber: data.get("receiptNumber") as string,
                 internalNotes: data.get("internalNotes") as string,
                 status: data.get("status") as any,
                 dueDate: data.get("dueDate") as string || null,
                 paidAt: data.get("paidAt") as string || null,
               });
               setEditingRecord(null);
               router.refresh();
             });
           }} className="space-y-5">
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Estado</label>
                <select name="status" defaultValue={editingRecord.status} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold">
                  <option value="PENDING">Pendiente</option>
                  <option value="PAID">Pagado</option>
                  <option value="CANCELLED">Cancelado</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Método de Pago</label>
                <Input name="paymentMethod" defaultValue={editingRecord.paymentMethod || ""} placeholder="Efectivo, Transferencia..." className="h-11 rounded-xl px-4" />
              </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400">Vencimiento</label>
                 <Input type="date" name="dueDate" defaultValue={editingRecord.dueDate ? new Date(editingRecord.dueDate).toISOString().split("T")[0] : ""} className="h-11 rounded-xl" />
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400">Fecha de Pago</label>
                 <Input type="date" name="paidAt" defaultValue={editingRecord.paidAt ? new Date(editingRecord.paidAt).toISOString().split("T")[0] : ""} className="h-11 rounded-xl" />
               </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">N° Recibo / Transacción</label>
                <Input name="receiptNumber" defaultValue={editingRecord.receiptNumber || ""} placeholder="ABC-0001" className="h-11 rounded-xl" />
              </div>

             <div className="space-y-1.5">
               <label className="text-xs font-black uppercase tracking-widest text-slate-400">Notas Internas (No visibles al cliente)</label>
               <textarea name="internalNotes" defaultValue={editingRecord.internalNotes || ""} className="w-full min-h-[100px] rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-brand-500" placeholder="Historial de contacto..." />
             </div>

             <Button type="submit" className="w-full h-12 font-bold" disabled={isPending}>
               {isPending ? "Guardando..." : "Actualizar Registro"}
             </Button>
           </form>
         </Card>
       </div>
      )}
    </>
  );
}
