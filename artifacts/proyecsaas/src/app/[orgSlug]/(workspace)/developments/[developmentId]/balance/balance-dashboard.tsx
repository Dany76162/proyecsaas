"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  TrendingUp,
  Receipt,
  FileText,
  BarChart3,
  LogOut,
  Clock,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { logoutFinancialVaultAction } from "@/modules/developments/financial-vault-actions";
import { FinancialEntityType } from "@prisma/client";

const ENTITY_TYPE_LABELS: Record<FinancialEntityType, string> = {
  DEVELOPER: "Desarrollador",
  TRUST: "Fideicomiso",
  CONSTRUCTION: "Constructora",
  COMPANY: "Empresa",
  ADMINISTRATOR: "Administrador",
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  orgSlug: string;
  developmentId: string;
  vault: {
    ownerName: string;
    ownerEmail: string;
    ownerEntityType: FinancialEntityType;
    lastAccessAt: Date | null;
    accessCount: number;
    activatedAt: Date;
  };
  userEmail: string;
}

export default function BalanceDashboard({ orgSlug, developmentId, vault, userEmail }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutFinancialVaultAction();
      toast.success("Sesión financiera cerrada.");
      router.refresh();
    });
  };

  const placeholderCards = [
    {
      icon: TrendingUp,
      label: "Ingresos confirmados",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-100 dark:border-emerald-800",
    },
    {
      icon: Receipt,
      label: "Gastos registrados",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-100 dark:border-amber-800",
    },
    {
      icon: FileText,
      label: "Comprobantes",
      color: "text-sky-600",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      border: "border-sky-100 dark:border-sky-800",
    },
    {
      icon: BarChart3,
      label: "Reportes para contador",
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-100 dark:border-purple-800",
    },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                Balance y Rendición
              </h2>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                Área financiera protegida · Sesión activa
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:text-red-600 hover:border-red-200 transition disabled:opacity-60"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>

        {/* Información del responsable */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Responsable financiero
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
              {vault.ownerName}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {ENTITY_TYPE_LABELS[vault.ownerEntityType]}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{vault.ownerEmail}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Actividad
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Último acceso:
              </span>{" "}
              {fmtDate(vault.lastAccessAt)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Total accesos:
              </span>{" "}
              {vault.accessCount}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Activado: {fmtDate(vault.activatedAt)}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <p className="text-[10px] text-slate-500">
            Sesión activa como <span className="font-semibold text-slate-700 dark:text-slate-300">{userEmail}</span> ·
            Rol: <span className="font-semibold text-brand-600">Responsable financiero</span>
          </p>
        </div>
      </div>

      {/* Cards placeholder */}
      <div className="grid grid-cols-2 gap-3">
        {placeholderCards.map(({ icon: Icon, label, color, bg, border }) => (
          <div
            key={label}
            className={`rounded-2xl border ${border} ${bg} p-4 flex flex-col gap-3`}
          >
            <div className={`w-8 h-8 rounded-lg bg-white/60 dark:bg-white/10 flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                {label}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Próxima fase</p>
            </div>
          </div>
        ))}
      </div>

      {/* Nota de privacidad */}
      <div className="border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-900/50">
        <p className="text-[10px] text-slate-400 leading-relaxed text-center">
          Todo acceso a este módulo queda registrado en la auditoría financiera. Los datos de
          Balance y Rendición son privados del tenant y no son accesibles por la plataforma.
        </p>
      </div>
    </div>
  );
}
