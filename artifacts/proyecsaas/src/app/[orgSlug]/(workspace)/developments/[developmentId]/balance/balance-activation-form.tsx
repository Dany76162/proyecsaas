"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { activateFinancialVaultAction } from "@/modules/developments/financial-vault-actions";
import { FinancialEntityType } from "@prisma/client";

const ENTITY_TYPE_LABELS: Record<FinancialEntityType, string> = {
  DEVELOPER: "Desarrollador",
  TRUST: "Fideicomiso",
  CONSTRUCTION: "Constructora",
  COMPANY: "Empresa",
  ADMINISTRATOR: "Administrador",
};

interface Props {
  orgSlug: string;
  developmentId: string;
}

export default function BalanceActivationForm({ orgSlug, developmentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerEntityType, setOwnerEntityType] = useState<FinancialEntityType>("DEVELOPER");
  const [vaultKey, setVaultKey] = useState("");
  const [vaultKeyConfirm, setVaultKeyConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showKeyConfirm, setShowKeyConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accepted) {
      setError("Debés aceptar la declaración de responsabilidad para continuar.");
      return;
    }
    if (vaultKey !== vaultKeyConfirm) {
      setError("Las claves no coinciden.");
      return;
    }
    if (vaultKey.length < 8) {
      setError("La clave debe tener al menos 8 caracteres.");
      return;
    }

    startTransition(async () => {
      const result = await activateFinancialVaultAction(orgSlug, developmentId, {
        ownerName,
        ownerEmail,
        ownerEntityType,
        vaultKey,
      });

      if (result.ok) {
        toast.success("Módulo financiero activado correctamente.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-white">
              Activar Balance y Rendición
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Área financiera protegida</p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
            Esta área es de acceso restringido. La clave privada no podrá recuperarse:
            guardala en un lugar seguro. Cada acceso queda auditado.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre del responsable */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">
              Nombre del responsable o entidad
            </label>
            <input
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ej: Juan García / Fideicomiso Los Pinos SA"
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">
              Email del responsable financiero
            </label>
            <input
              type="email"
              required
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="financiero@empresa.com"
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl focus:outline-none focus:border-brand-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Se notificará a este email cuando alguien ingrese al módulo.
            </p>
          </div>

          {/* Tipo de entidad */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">
              Tipo de entidad
            </label>
            <select
              value={ownerEntityType}
              onChange={(e) => setOwnerEntityType(e.target.value as FinancialEntityType)}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl focus:outline-none focus:border-brand-500"
            >
              {(Object.keys(ENTITY_TYPE_LABELS) as FinancialEntityType[]).map((k) => (
                <option key={k} value={k}>
                  {ENTITY_TYPE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          {/* Clave privada */}
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
                minLength={8}
                placeholder="Mínimo 8 caracteres"
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

          {/* Confirmar clave */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">
              Repetir clave privada
            </label>
            <div className="relative">
              <input
                type={showKeyConfirm ? "text" : "password"}
                required
                value={vaultKeyConfirm}
                onChange={(e) => setVaultKeyConfirm(e.target.value)}
                minLength={8}
                placeholder="Repetí la clave"
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5 pr-10 rounded-xl focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowKeyConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showKeyConfirm ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Declaración */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brand-500 shrink-0"
            />
            <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Declaro que soy el responsable autorizado para activar el área financiera de este
              desarrollo y que la información registrada es verídica.
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending || !accepted}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition disabled:opacity-60"
          >
            {isPending && (
              <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            )}
            {isPending ? "Activando..." : "Activar módulo financiero"}
          </button>
        </form>
      </div>
    </div>
  );
}
