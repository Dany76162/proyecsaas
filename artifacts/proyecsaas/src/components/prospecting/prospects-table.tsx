"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PROSPECT_COMPANY_TYPE_LABELS,
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUS_COLORS,
  MANUAL_RATING_LABELS,
  MANUAL_RATING_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  MANUAL_STATUS_LABELS,
  MANUAL_STATUS_COLORS,
  getScoreLevel,
  getScoreBadgeColor,
  getRiskLevel,
  getRiskBadgeColor,
} from "@/modules/prospecting/types";
import type { ProspectCompanyType, ProspectStatus, ManualRating, ProspectPriority, ManualProspectStatus } from "@prisma/client";

type Prospect = {
  id: string;
  companyName: string;
  companyType: string;
  status: string;
  email: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  qualityScore: number | null;
  fitScore: number | null;
  confidenceScore: number | null;
  riskScore: number | null;
  manualRating: string | null;
  priority: string | null;
  manualStatus: string | null;
};

export function ProspectsTable({ prospects }: { prospects: Prospect[] }) {
  if (prospects.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
        <p className="text-sm font-medium text-slate-400">
          No hay prospectos registrados. Creá el primero.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <th className="py-4 px-3">Empresa</th>
            <th className="py-4 px-3">Estado</th>
            <th className="py-4 px-3 text-center">Score IA</th>
            <th className="py-4 px-3 text-center">Riesgo</th>
            <th className="py-4 px-3 text-center">Calif.</th>
            <th className="py-4 px-3 text-center">Prioridad</th>
            <th className="py-4 px-3">Decisión</th>
            <th className="py-4 px-3">Contacto</th>
            <th className="py-4 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((p) => {
            const qualityLevel = getScoreLevel(p.qualityScore);
            const riskLevel = getRiskLevel(p.riskScore);

            return (
              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                {/* Company */}
                <td className="py-4 px-3">
                  <Link href={`/platform/agents/prospecting/${p.id}`} className="block">
                    <p className="font-bold text-slate-900 hover:text-brand-600 transition truncate max-w-[200px]">{p.companyName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {PROSPECT_COMPANY_TYPE_LABELS[p.companyType as ProspectCompanyType]}
                    </p>
                  </Link>
                </td>

                {/* Status */}
                <td className="py-4 px-3">
                  <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-wider", PROSPECT_STATUS_COLORS[p.status as ProspectStatus])}>
                    {PROSPECT_STATUS_LABELS[p.status as ProspectStatus]}
                  </Badge>
                </td>

                {/* AI Score */}
                <td className="py-4 px-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg font-black text-slate-900 tabular-nums">{p.qualityScore ?? 0}</span>
                    <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full", getScoreBadgeColor(qualityLevel))}>
                      {qualityLevel}
                    </span>
                  </div>
                </td>

                {/* Risk */}
                <td className="py-4 px-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg font-black text-slate-900 tabular-nums">{p.riskScore ?? 0}</span>
                    <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full", getRiskBadgeColor(riskLevel))}>
                      {riskLevel}
                    </span>
                  </div>
                </td>

                {/* Manual Rating */}
                <td className="py-4 px-3 text-center">
                  {p.manualRating ? (
                    <Badge variant="outline" className={cn("text-[10px] font-black", MANUAL_RATING_COLORS[p.manualRating as ManualRating])}>
                      {p.manualRating}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold">—</span>
                  )}
                </td>

                {/* Priority */}
                <td className="py-4 px-3 text-center">
                  {p.priority ? (
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase", PRIORITY_COLORS[p.priority as ProspectPriority])}>
                      {PRIORITY_LABELS[p.priority as ProspectPriority]}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold">—</span>
                  )}
                </td>

                {/* Manual Status */}
                <td className="py-4 px-3">
                  {p.manualStatus ? (
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase", MANUAL_STATUS_COLORS[p.manualStatus as ManualProspectStatus])}>
                      {MANUAL_STATUS_LABELS[p.manualStatus as ManualProspectStatus]}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold">Sin decisión</span>
                  )}
                </td>

                {/* Contact */}
                <td className="py-4 px-3">
                  <div className="flex flex-col gap-0.5">
                    {p.email && <p className="text-xs text-slate-600 truncate max-w-[160px]">{p.email}</p>}
                    {p.city && <p className="text-[10px] text-slate-400">{[p.city, p.country].filter(Boolean).join(", ")}</p>}
                  </div>
                </td>

                {/* Action */}
                <td className="py-4 px-3">
                  <Link
                    href={`/platform/agents/prospecting/${p.id}`}
                    className="text-xs font-bold text-brand-600 hover:underline whitespace-nowrap"
                  >
                    Ver detalle →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
