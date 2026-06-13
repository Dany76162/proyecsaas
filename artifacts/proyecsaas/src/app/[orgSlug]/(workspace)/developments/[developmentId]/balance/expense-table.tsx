"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  Ban,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { ExpenseCategory, ExpenseStatus } from "@prisma/client";
import {
  approveExpenseAction,
  rejectExpenseAction,
  voidExpenseAction,
} from "@/modules/developments/financial-expense-actions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExpenseRow {
  id: string;
  date: Date;
  category: ExpenseCategory;
  description: string;
  provider: string | null;
  amountCents: number;
  currency: string;
  status: ExpenseStatus;
  attachments: { id: string; filename: string; r2Key: string }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

const STATUS_CONFIG: Record<ExpenseStatus, { label: string; cls: string }> = {
  PENDING:  { label: "Pendiente", cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
  APPROVED: { label: "Aprobado",  cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  REJECTED: { label: "Rechazado", cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
  VOIDED:   { label: "Anulado",   cls: "bg-slate-100 dark:bg-slate-800 text-slate-500" },
};

function fmtAmount(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── ReasonModal ───────────────────────────────────────────────────────────────

function ReasonModal({
  title,
  label,
  onConfirm,
  onClose,
}: {
  title: string;
  label: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-sm p-5 space-y-4">
        <h4 className="text-sm font-black text-slate-800 dark:text-white">{title}</h4>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">{label}</label>
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-80 transition disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ExpenseTable ──────────────────────────────────────────────────────────────

interface Props {
  orgSlug: string;
  developmentId: string;
  expenses: ExpenseRow[];
}

export default function ExpenseTable({ orgSlug, developmentId, expenses }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<{
    expenseId: string;
    type: "reject" | "void";
  } | null>(null);

  const handleApprove = (expenseId: string) => {
    startTransition(async () => {
      const res = await approveExpenseAction(orgSlug, developmentId, expenseId);
      if (res.ok) {
        toast.success("Gasto aprobado.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleRejectConfirm = (expenseId: string, reason: string) => {
    setReasonModal(null);
    startTransition(async () => {
      const res = await rejectExpenseAction(orgSlug, developmentId, expenseId, reason);
      if (res.ok) {
        toast.success("Gasto rechazado.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleVoidConfirm = (expenseId: string, reason: string) => {
    setReasonModal(null);
    startTransition(async () => {
      const res = await voidExpenseAction(orgSlug, developmentId, expenseId, reason);
      if (res.ok) {
        toast.success("Gasto anulado.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  if (expenses.length === 0) {
    return (
      <div className="border border-slate-100 dark:border-slate-800 rounded-xl px-6 py-10 text-center bg-slate-50 dark:bg-slate-900/50 space-y-1">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
          Todavía no hay gastos cargados.
        </p>
        <p className="text-[11px] text-slate-400">
          Usá <strong>Cargar gasto</strong> para registrar el primer movimiento del desarrollo.
        </p>
      </div>
    );
  }

  return (
    <>
      {reasonModal && (
        <ReasonModal
          title={reasonModal.type === "reject" ? "Rechazar gasto" : "Anular gasto"}
          label={reasonModal.type === "reject" ? "Motivo de rechazo *" : "Motivo de anulación *"}
          onConfirm={(reason) =>
            reasonModal.type === "reject"
              ? handleRejectConfirm(reasonModal.expenseId, reason)
              : handleVoidConfirm(reasonModal.expenseId, reason)
          }
          onClose={() => setReasonModal(null)}
        />
      )}

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Fecha</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Categoría</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-400 hidden md:table-cell">Proveedor / Descripción</th>
              <th className="text-right px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Monto</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Estado</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Doc.</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.map((exp) => {
              const st = STATUS_CONFIG[exp.status];
              const isExpanded = expanded === exp.id;
              const hasAttachments = exp.attachments.length > 0;

              return (
                <>
                  <tr
                    key={exp.id}
                    className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                      {fmtDate(exp.date)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {CATEGORY_LABELS[exp.category]}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <p className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[200px]">
                        {exp.description}
                      </p>
                      {exp.provider && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{exp.provider}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap font-bold text-slate-800 dark:text-white">
                      {fmtAmount(exp.amountCents, exp.currency)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {hasAttachments ? (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : exp.id)}
                          className="text-brand-500 hover:text-brand-600 transition flex items-center gap-0.5 mx-auto"
                          title="Ver comprobante(s)"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">{exp.attachments.length}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {exp.status === "PENDING" && (
                          <>
                            <button
                              disabled={isPending}
                              onClick={() => handleApprove(exp.id)}
                              title="Aprobar"
                              className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition disabled:opacity-50 flex items-center justify-center"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => setReasonModal({ expenseId: exp.id, type: "reject" })}
                              title="Rechazar"
                              className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/60 transition disabled:opacity-50 flex items-center justify-center"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {exp.status !== "VOIDED" && (
                          <button
                            disabled={isPending}
                            onClick={() => setReasonModal({ expenseId: exp.id, type: "void" })}
                            title="Anular"
                            className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50 flex items-center justify-center"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded attachments row */}
                  {isExpanded && hasAttachments && (
                    <tr key={`${exp.id}-attachments`} className="bg-slate-50 dark:bg-slate-800/50">
                      <td colSpan={7} className="px-6 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-2">Comprobantes</p>
                        <div className="flex flex-wrap gap-2">
                          {exp.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={`/api/storage/view?key=${encodeURIComponent(att.r2Key)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-brand-400 hover:text-brand-600 transition"
                            >
                              <Paperclip className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[180px]">{att.filename}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                            </a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
