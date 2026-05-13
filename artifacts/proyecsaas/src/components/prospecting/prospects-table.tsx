"use client";

import Link from "next/link";
import { 
  Eye, 
  Target,
  Mail,
  Globe,
  Phone
} from "lucide-react";
import { 
  PROSPECT_COMPANY_TYPE_LABELS, 
  PROSPECT_STATUS_LABELS, 
  PROSPECT_STATUS_COLORS 
} from "@/modules/prospecting/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function ProspectsTable({ prospects }: { prospects: any[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead className="w-[280px]">Empresa</TableHead>
            <TableHead>Tipo / Ubicación</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="text-center">Calidad</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prospects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                <div className="flex flex-col items-center gap-2">
                  <Target className="h-8 w-8 opacity-20" />
                  <p className="font-medium">No se encontraron prospectos</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            prospects.map((p) => (
              <TableRow key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                <TableCell className="py-4">
                  <div>
                    <p className="font-bold text-slate-900 line-clamp-1">{p.companyName}</p>
                    {p.sourceName && (
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                        Fuente: {p.sourceName}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-xs font-semibold text-slate-600">
                    {PROSPECT_COMPANY_TYPE_LABELS[p.companyType as keyof typeof PROSPECT_COMPANY_TYPE_LABELS]}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {[p.city, p.country].filter(Boolean).join(", ")}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {p.email && <Mail className="h-3.5 w-3.5 text-slate-400" />}
                    {p.website && <Globe className="h-3.5 w-3.5 text-slate-400" />}
                    {(p.phone || p.whatsapp) && <Phone className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                      PROSPECT_STATUS_COLORS[p.status as keyof typeof PROSPECT_STATUS_COLORS]
                    )}
                  >
                    {PROSPECT_STATUS_LABELS[p.status as keyof typeof PROSPECT_STATUS_LABELS]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn(
                      "text-[11px] font-bold",
                      p.qualityScore > 70 ? "text-emerald-600" : p.qualityScore > 40 ? "text-amber-600" : "text-slate-400"
                    )}>
                      {p.qualityScore}%
                    </span>
                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full",
                          p.qualityScore > 70 ? "bg-emerald-500" : p.qualityScore > 40 ? "bg-amber-500" : "bg-slate-300"
                        )}
                        style={{ width: `${p.qualityScore}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm" className="h-8 font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg px-3">
                    <Link href={`/platform/agents/prospecting/${p.id}`}>
                      <Eye className="mr-2 h-3.5 w-3.5" /> Ver
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
