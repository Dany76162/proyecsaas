"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { loginFinancialVaultAction } from "@/modules/developments/financial-vault-actions";

interface Props {
  orgSlug: string;
  developmentId: string;
  ownerEmailMasked: string;
}

export default function BalanceLoginForm({ orgSlug, developmentId, ownerEmailMasked }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vaultKey, setVaultKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vaultKey) {
      setError("Ingresá la clave privada del módulo.");
      return;
    }

    startTransition(async () => {
      const result = await loginFinancialVaultAction(orgSlug, developmentId, vaultKey);
      if (result.ok) {
        toast.success("Acceso autorizado.");
        router.refresh();
      } else {
        setError(result.error);
        setVaultKey("");
      }
    });
  };

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-slate-500" />
        </div>

        <h2 className="text-sm font-black text-slate-800 dark:text-white mb-1">
          Módulo financiero protegido
        </h2>
        <p className="text-[11px] text-slate-500 mb-1">Balance y Rendición</p>
        <p className="text-[10px] text-slate-400 mb-5">
          Responsable: {ownerEmailMasked}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">
              Clave privada del módulo
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                required
                value={vaultKey}
                onChange={(e) => setVaultKey(e.target.value)}
                placeholder="Ingresá la clave"
                autoFocus
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5 pr-10 rounded-xl focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition disabled:opacity-60"
          >
            {isPending && (
              <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            )}
            {isPending ? "Verificando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
          Se registrará cada acceso al módulo financiero.
        </p>
      </div>
    </div>
  );
}
