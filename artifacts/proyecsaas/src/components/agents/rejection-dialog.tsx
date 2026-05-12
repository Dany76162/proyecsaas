"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { approveOrRejectDraft } from "@/modules/agents/actions";

interface RejectionDialogProps {
  approvalId: string;
  onClose: () => void;
}

export function RejectionDialog({ approvalId, onClose }: RejectionDialogProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900 text-lg">Rechazar borrador</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form 
          action={async (formData) => {
            setIsSubmitting(true);
            try {
              await approveOrRejectDraft(formData);
            } finally {
              setIsSubmitting(false);
              onClose();
            }
          }}
          className="p-6 space-y-4"
        >
          <input type="hidden" name="approvalId" value={approvalId} />
          <input type="hidden" name="decision" value="REJECTED" />
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Motivo del rechazo
            </label>
            <textarea
              name="comments"
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ej: El copy es muy informal, por favor corregir..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Rechazando..." : "Confirmar rechazo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
