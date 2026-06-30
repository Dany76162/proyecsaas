"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  sourceName?: string | null;
  sourceType?: string | null;
};

const COUNTRY_FLAGS: Record<string, string> = {
  "Argentina": "🇦🇷",
  "Chile": "🇨🇱",
  "Uruguay": "🇺🇾",
  "Paraguay": "🇵🇾",
  "Bolivia": "🇧🇴",
  "Perú": "🇵🇪",
  "Ecuador": "🇪🇨",
  "Colombia": "🇨🇴",
  "México": "🇲🇽",
  "Brasil": "🇧🇷",
  "España": "🇪🇸",
};

function getCountryFlag(country: string | null) {
  if (!country) return null;
  // Try direct match or partial match
  for (const [name, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (country.toLowerCase().includes(name.toLowerCase())) return flag;
  }
  return "🌎";
}

export function ProspectsTable({ prospects }: { prospects: Prospect[] }) {
  if (prospects.length === 0) {
    return (
      <div className="p-16 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
           <Users className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Todavía no hay prospectos registrados</h3>
        <p className="text-sm font-medium text-slate-400 mt-1 mb-8 max-w-sm mx-auto">
          Podés buscar empresas en la web, pegar resultados o crear uno manualmente para empezar la prospección.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-10 font-bold border-slate-200 bg-white">
            <Link href="/platform/agents/prospecting/search">Buscar prospectos</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-10 font-bold border-slate-200 bg-white">
            <Link href="/platform/agents/prospecting/search?tab=paste">Pegar datos / URLs</Link>
          </Button>
          <Button asChild size="sm" className="h-10 font-bold bg-slate-900">
            <Link href="/platform/agents/prospecting/new">Crear prospecto manual</Link>
          </Button>
        </div>
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
                  <Link href={`/platform/agents/prospecting/${p.id}`} className="group block">
                    <div className="flex items-center gap-2">
                       <span className="text-lg grayscale group-hover:grayscale-0 transition-all">
                          {getCountryFlag(p.country)}
                       </span>
                       <p className="font-black text-slate-900 group-hover:text-brand-600 transition truncate max-w-[200px]">
                          {p.companyName}
                       </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                       <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                          {PROSPECT_COMPANY_TYPE_LABELS[p.companyType as ProspectCompanyType]}
                       </p>
                       {p.sourceName && (
                         <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-slate-50 text-slate-400 border-slate-200 font-bold">
                            {p.sourceName}
                         </Badge>
                       )}
                       {p.sourceType === "GOOGLE_PLACES" && (
                         <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-amber-50 text-amber-600 border-amber-200 font-bold ml-1">
                            Places
                         </Badge>
                       )}
                    </div>
                  </Link>
                </td>

                {/* Status */}
                <td className="py-4 px-3">
                  <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest", PROSPECT_STATUS_COLORS[p.status as ProspectStatus])}>
                    {PROSPECT_STATUS_LABELS[p.status as ProspectStatus]}
                  </Badge>
                </td>

                {/* AI Score */}
                <td className="py-4 px-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-base font-black text-slate-900 tabular-nums">{p.qualityScore ?? 0}</span>
                    <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full mt-0.5", getScoreBadgeColor(qualityLevel))}>
                      {qualityLevel}
                    </span>
                  </div>
                </td>

                {/* Risk */}
                <td className="py-4 px-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-base font-black text-slate-900 tabular-nums">{p.riskScore ?? 0}</span>
                    <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full mt-0.5", getRiskBadgeColor(riskLevel))}>
                      {riskLevel}
                    </span>
                  </div>
                </td>

                {/* Manual Rating */}
                <td className="py-4 px-3 text-center">
                  {p.manualRating ? (
                    <div className={cn("w-8 h-8 mx-auto flex items-center justify-center rounded-xl border-2 font-black text-xs", MANUAL_RATING_COLORS[p.manualRating as ManualRating])}>
                      {p.manualRating}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-200 font-bold">—</span>
                  )}
                </td>

                {/* Priority */}
                <td className="py-4 px-3 text-center">
                  {p.priority ? (
                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase", PRIORITY_COLORS[p.priority as ProspectPriority])}>
                      {PRIORITY_LABELS[p.priority as ProspectPriority]}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-slate-200 font-bold">—</span>
                  )}
                </td>

                {/* Manual Status */}
                <td className="py-4 px-3">
                  {p.manualStatus ? (
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-tighter", MANUAL_STATUS_COLORS[p.manualStatus as ManualProspectStatus])}>
                      {MANUAL_STATUS_LABELS[p.manualStatus as ManualProspectStatus]}
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-slate-300 font-bold italic">Sin decisión</span>
                  )}
                </td>

                {/* Contact */}
                <td className="py-4 px-3">
                  <div className="flex flex-col gap-0.5 max-w-[150px]">
                    {p.email && (
                      <p className="text-[11px] font-bold text-slate-600 truncate hover:text-brand-600 cursor-pointer">{p.email}</p>
                    )}
                    <p className="text-[9px] font-bold text-slate-400 truncate">
                       {[p.city, p.country].filter(Boolean).join(", ")}
                    </p>
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
