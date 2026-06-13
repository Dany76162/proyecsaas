"use client";

import { useState, useTransition, useRef } from "react";
import { X, Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ExpenseCategory } from "@prisma/client";
import { createExpenseAction } from "@/modules/developments/financial-expense-actions";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MENSURA: "Mensura",
  AGRIMENSURA: "Agrimensura",
  MUNICIPALIDAD: "Municipalidad",
  APROBACIONES: "Aprobaciones",
  ESCRITURAS: "Escrituras",
  INFRAESTRUCTURA: "Infraestructura",
  CALLES: "Calles",
  LUZ: "Electricidad",
  AGUA: "Agua",
  SEGURIDAD: "Seguridad",
  MARKETING: "Marketing",
  COMISIONES: "Comisiones",
  ADMINISTRACION: "Administración",
  HONORARIOS: "Honorarios",
  IMPUESTOS: "Impuestos",
  GASTOS_MENORES: "Gastos menores",
  OTROS: "Otros",
};

interface Props {
  orgSlug: string;
  developmentId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function ExpenseForm({ orgSlug, developmentId, onClose, onCreated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [category, setCategory] = useState<ExpenseCategory>("OTROS");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 10 * 1024 * 1024) {
      setError("El archivo supera el máximo de 10 MB.");
      return;
    }
    setSelectedFile(f);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount.replace(",", "."));
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("El monto debe ser un número mayor a cero.");
      return;
    }

    startTransition(async () => {
      const result = await createExpenseAction(orgSlug, developmentId, {
        date,
        amountCents: Math.round(amountNum * 100),
        currency,
        category,
        description,
        provider: provider || undefined,
        paidBy: paidBy || undefined,
        paymentMethod: paymentMethod || undefined,
        paymentReference: paymentReference || undefined,
        internalNotes: internalNotes || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Upload attachment if selected
      if (selectedFile && result.data?.expenseId) {
        setIsUploading(true);
        try {
          const fd = new FormData();
          fd.append("file", selectedFile);
          fd.append("orgSlug", orgSlug);
          fd.append("developmentId", developmentId);
          fd.append("expenseId", result.data.expenseId);

          const res = await fetch("/api/balance/attachments/upload", {
            method: "POST",
            body: fd,
          });
          const json = await res.json();
          if (!json.success) {
            toast.warning(`Gasto creado, pero el comprobante no se pudo subir: ${json.error}`);
          }
        } catch {
          toast.warning("Gasto creado, pero ocurrió un error al subir el comprobante.");
        } finally {
          setIsUploading(false);
        }
      }

      toast.success("Gasto registrado correctamente.");
      onCreated();
    });
  };

  const inputCls =
    "w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl focus:outline-none focus:border-brand-500";
  const labelCls = "block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1";

  const busy = isPending || isUploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-black text-slate-800 dark:text-white">Cargar gasto</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Row: date + amount + currency */}
          <div className="grid grid-cols-[1fr_1fr_80px] gap-3">
            <div>
              <label className={labelCls}>Fecha</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Monto</label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Moneda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
                <option value="UF">UF</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className={inputCls}
            >
              {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((k) => (
                <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Descripción *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describí el gasto brevemente"
              className={inputCls}
            />
          </div>

          {/* Provider + PaidBy */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Proveedor</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Nombre o empresa"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Pagado por</label>
              <input
                type="text"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                placeholder="Nombre"
                className={inputCls}
              />
            </div>
          </div>

          {/* PaymentMethod + Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Medio de pago</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls}>
                <option value="">— Sin especificar —</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Cheque">Cheque</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Referencia</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="N° transferencia, cheque..."
                className={inputCls}
              />
            </div>
          </div>

          {/* Internal notes */}
          <div>
            <label className={labelCls}>Notas internas</label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              placeholder="Notas solo visibles dentro del módulo financiero"
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Attachment */}
          <div>
            <label className={labelCls}>Comprobante (opcional)</label>
            <div
              className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-brand-400 transition"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500">
                {selectedFile ? selectedFile.name : "PDF, JPEG, PNG o WebP — máx. 10 MB"}
              </span>
              {selectedFile && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="ml-auto text-slate-400 hover:text-red-500 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form=""
            disabled={busy}
            onClick={(e) => {
              // trigger form submit via the nearest form
              const form = (e.currentTarget as HTMLElement)
                .closest(".fixed")
                ?.querySelector("form");
              form?.requestSubmit();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition disabled:opacity-60"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isUploading ? "Subiendo..." : isPending ? "Guardando..." : "Guardar gasto"}
          </button>
        </div>
      </div>
    </div>
  );
}
