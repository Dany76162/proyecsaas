import { getCampaigns } from "@/modules/prospecting/campaign-service";
import { 
  Plus, ArrowLeft, Mail, Send, Calendar, CheckCircle2, 
  AlertCircle, ChevronRight, BarChart3, Users
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS } from "@/modules/prospecting/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
            <Link href="/platform/agents/prospecting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Campañas de Prospección</h1>
            <p className="text-slate-500 font-medium mt-1">Envío asistido de emails comerciales por lotes.</p>
          </div>
        </div>
        <Button asChild className="h-11 px-6 bg-slate-900 font-bold rounded-xl shadow-lg active:scale-95 transition-all">
          <Link href="/platform/agents/prospecting/campaigns/new">
            <Plus className="mr-2 h-4 w-4" /> Crear Campaña
          </Link>
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 rounded-2xl bg-white border-slate-200 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Campañas</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{campaigns.length}</p>
        </Card>
        <Card className="p-6 rounded-2xl bg-white border-slate-200 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emails Enviados</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">
            {campaigns.reduce((acc, c) => acc + c.sentCount, 0)}
          </p>
        </Card>
        <Card className="p-6 rounded-2xl bg-white border-slate-200 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">En Ejecución</p>
          <p className="text-3xl font-black text-amber-500 mt-1">
            {campaigns.filter(c => c.status === "SENDING").length}
          </p>
        </Card>
        <Card className="p-6 rounded-2xl bg-white border-slate-200 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Promedio Apertura</p>
          <p className="text-3xl font-black text-brand-600 mt-1">--%</p>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card className="rounded-[2.5rem] border-slate-200 shadow-soft overflow-hidden bg-white">
        {campaigns.length === 0 ? (
          <div className="p-20 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
              <Mail className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No hay campañas creadas</h3>
            <p className="text-sm font-medium text-slate-500 mt-1 mb-8 max-w-xs mx-auto">
              Empezá creando una campaña para contactar a tus prospectos aprobados.
            </p>
            <Button asChild className="h-11 px-8 bg-slate-900 font-bold rounded-xl shadow-lg">
              <Link href="/platform/agents/prospecting/campaigns/new">Crear mi primera campaña</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="py-5 px-8">Nombre de Campaña</th>
                  <th className="py-5 px-4">Estado</th>
                  <th className="py-5 px-4 text-center">Alcance</th>
                  <th className="py-5 px-4 text-center">Enviados</th>
                  <th className="py-5 px-4">Último envío</th>
                  <th className="py-5 px-8"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition group">
                    <td className="py-5 px-8">
                      <Link href={`/platform/agents/prospecting/campaigns/${c.id}`} className="block">
                        <p className="font-bold text-slate-900 group-hover:text-brand-600 transition">{c.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{c.subject || "Sin asunto"}</p>
                      </Link>
                    </td>
                    <td className="py-5 px-4">
                      <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-wider", CAMPAIGN_STATUS_COLORS[c.status])}>
                        {CAMPAIGN_STATUS_LABELS[c.status]}
                      </Badge>
                    </td>
                    <td className="py-5 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-black text-slate-900 tabular-nums">{c.totalRecipients}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Destinatarios</span>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-black text-emerald-600 tabular-nums">{c.sentCount}</span>
                        {c.failedCount > 0 && (
                          <span className="text-[9px] font-bold text-red-400">({c.failedCount} errores)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                        <Calendar className="h-3 w-3" />
                        {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "No enviada"}
                      </div>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <Button asChild variant="ghost" size="sm" className="h-8 px-3 font-bold text-brand-600 hover:bg-brand-50 rounded-lg">
                        <Link href={`/platform/agents/prospecting/campaigns/${c.id}`}>
                          Gestionar <ChevronRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Safe Send Policy */}
      <Card className="p-8 rounded-[2rem] border-slate-200 bg-amber-50/50 border-amber-100 flex gap-6 items-center">
         <div className="h-12 w-12 shrink-0 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
            <AlertCircle className="h-6 w-6" />
         </div>
         <div>
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Política de Envío Seguro</h4>
            <p className="text-xs font-bold text-amber-800/70 mt-1 leading-relaxed">
              Las campañas no se envían automáticamente. Solo los prospectos marcados como <span className="text-amber-900">Apto para contacto</span> son incluidos.
              Respetamos rigurosamente las listas de supresión y el estado de "No contactar".
            </p>
         </div>
      </Card>
    </div>
  );
}
