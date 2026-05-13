import { getCampaignById, getEligibleProspectsForCampaign } from "@/modules/prospecting/campaign-service";
import { 
  ArrowLeft, Mail, Send, Calendar, CheckCircle2, 
  AlertCircle, ChevronRight, BarChart3, Users,
  Trash2, Play, Pause, RefreshCw, Eye, Sparkles,
  Info, ExternalLink, ShieldCheck, MailWarning
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CAMPAIGN_STATUS_LABELS, 
  CAMPAIGN_STATUS_COLORS,
  RECIPIENT_STATUS_LABELS,
  RECIPIENT_STATUS_COLORS
} from "@/modules/prospecting/types";
import { cn } from "@/lib/utils";
import CampaignExecutionFlow from "./execution-flow";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  // If no recipients, we might need to populate them
  const eligibleProspects = campaign.totalRecipients === 0 
    ? await getEligibleProspectsForCampaign() 
    : [];

  const isEmailSendEnabled = process.env.AGENTOS_ENABLE_PROSPECTING_EMAIL_SEND === "true";
  const isBulkEnabled = process.env.AGENTOS_ENABLE_PROSPECTING_BULK_EMAIL === "true";

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
            <Link href="/platform/agents/prospecting/campaigns">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
             <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{campaign.name}</h1>
                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-wider h-5", CAMPAIGN_STATUS_COLORS[campaign.status])}>
                  {CAMPAIGN_STATUS_LABELS[campaign.status]}
                </Badge>
             </div>
             <p className="text-slate-500 font-medium mt-1">ID: {campaign.id} • Creada el {new Date(campaign.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" size="sm" className="h-10 font-bold border-slate-200">
             <Trash2 className="mr-2 h-4 w-4" /> Eliminar
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
        <div className="space-y-8">
          {/* Main Execution Control */}
          <Card className="p-8 rounded-[2.5rem] border-slate-200 shadow-enterprise bg-white overflow-hidden relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-indigo-500" />
             
             <CampaignExecutionFlow 
               campaignId={campaign.id} 
               status={campaign.status}
               totalRecipients={campaign.totalRecipients}
               sentCount={campaign.sentCount}
               failedCount={campaign.failedCount}
               skippedCount={campaign.skippedCount}
               eligibleCount={eligibleProspects.length}
               isEmailSendEnabled={isEmailSendEnabled}
               isBulkEnabled={isBulkEnabled}
             />
          </Card>

          {/* Message Preview */}
          <Card className="p-8 rounded-[2.5rem] border-slate-200 bg-slate-50/30">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                   <Eye className="h-5 w-5 text-slate-400" /> Previsualización del Email
                </h3>
                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black text-brand-600 hover:bg-brand-50">
                   Editar Contenido
                </Button>
             </div>
             <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="mb-4 pb-4 border-b border-slate-100">
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Asunto</p>
                   <p className="font-bold text-slate-900">{campaign.subject || "Sin asunto"}</p>
                </div>
                <div>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cuerpo</p>
                   <div 
                     className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap"
                     dangerouslySetInnerHTML={{ __html: campaign.body || "Sin contenido" }}
                   />
                </div>
             </div>
          </Card>

          {/* Recipients List */}
          <Card className="rounded-[2.5rem] border-slate-200 bg-white shadow-soft overflow-hidden">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Destinatarios ({campaign.recipients.length})</h3>
                <div className="flex gap-2">
                   <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                      {campaign.recipients.filter(r => r.status === "SENT").length} Enviados
                   </Badge>
                   <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      {campaign.recipients.filter(r => r.status === "PENDING").length} Pendientes
                   </Badge>
                </div>
             </div>
             <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                   <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                         <th className="py-4 px-8">Prospecto</th>
                         <th className="py-4 px-4 text-center">Estado</th>
                         <th className="py-4 px-8 text-right">Acción</th>
                      </tr>
                   </thead>
                   <tbody>
                      {campaign.recipients.map((r) => (
                        <tr key={r.id} className="border-b border-slate-50">
                           <td className="py-4 px-8">
                              <p className="font-bold text-slate-900">{r.prospect.companyName}</p>
                              <p className="text-[11px] text-slate-400 font-medium">{r.email}</p>
                           </td>
                           <td className="py-4 px-4 text-center">
                              <span className={cn("text-[10px] font-black px-2 py-1 rounded-lg uppercase", RECIPIENT_STATUS_COLORS[r.status])}>
                                 {RECIPIENT_STATUS_LABELS[r.status]}
                              </span>
                           </td>
                           <td className="py-4 px-8 text-right">
                              <Link href={`/platform/agents/prospecting/${r.prospectId}`} className="text-xs font-bold text-brand-600 hover:underline">
                                 Ver detalle →
                              </Link>
                           </td>
                        </tr>
                      ))}
                      {campaign.recipients.length === 0 && (
                        <tr>
                           <td colSpan={3} className="py-20 text-center text-slate-400 font-bold">
                              No hay destinatarios vinculados todavía.
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </Card>
        </div>

        <aside className="space-y-6 sticky top-8">
           {/* Summary Sidebar */}
           <Card className="p-8 rounded-[2rem] border-slate-200 bg-white shadow-soft">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Métricas de Campaña</h3>
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <CheckCircle2 className="h-4 w-4" />
                       </div>
                       <span className="text-sm font-bold text-slate-600">Aceptación</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">--%</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Send className="h-4 w-4" />
                       </div>
                       <span className="text-sm font-bold text-slate-600">Entregados</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">{campaign.sentCount}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                          <MailWarning className="h-4 w-4" />
                       </div>
                       <span className="text-sm font-bold text-slate-600">Fallidos</span>
                    </div>
                    <span className="text-lg font-black text-slate-900 text-red-600">{campaign.failedCount}</span>
                 </div>
              </div>
           </Card>

           {/* Security Sidebar */}
           <Card className="p-8 rounded-[2rem] border-slate-200 bg-slate-900 shadow-enterprise text-white">
              <div className="flex items-center gap-3 mb-6">
                 <ShieldCheck className="h-6 w-6 text-brand-400" />
                 <h4 className="text-xs font-black uppercase tracking-widest text-brand-400">Seguridad Prospecting</h4>
              </div>
              <ul className="space-y-4">
                 <li className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-brand-500 mt-1.5 shadow-[0_0_8px_rgba(var(--brand-500-rgb),0.8)]" />
                    <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                       Solo se envía a prospectos con aprobación manual.
                    </p>
                 </li>
                 <li className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-brand-500 mt-1.5 shadow-[0_0_8px_rgba(var(--brand-500-rgb),0.8)]" />
                    <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                       Exclusión automática de bajas y rebotados.
                    </p>
                 </li>
                 <li className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-brand-500 mt-1.5 shadow-[0_0_8px_rgba(var(--brand-500-rgb),0.8)]" />
                    <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                       Los envíos se realizan en lotes pequeños de 20 para proteger la reputación del dominio.
                    </p>
                 </li>
              </ul>
           </Card>
        </aside>
      </div>
    </div>
  );
}
