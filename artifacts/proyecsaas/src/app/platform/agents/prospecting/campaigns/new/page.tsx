import { getEligibleProspectsForCampaign } from "@/modules/prospecting/campaign-service";
import { 
  ArrowLeft, Mail, Send, Sparkles, AlertCircle, 
  CheckCircle2, Users, Target, Info
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createCampaignAction } from "@/modules/prospecting/campaign-actions";
import { PROSPECT_COMPANY_TYPE_LABELS } from "@/modules/prospecting/types";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const prospects = await getEligibleProspectsForCampaign();

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
          <Link href="/platform/agents/prospecting/campaigns">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Crear Nueva Campaña</h1>
          <p className="text-slate-500 font-medium mt-1">Configurá el contenido y seleccioná los destinatarios.</p>
        </div>
      </div>

      <form action={createCampaignAction} className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="space-y-8">
          <Card className="p-8 rounded-[2.5rem] border-slate-200 shadow-soft bg-white">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Nombre de la Campaña</label>
                <Input name="name" placeholder="Ej: Lanzamiento RaicesPilot - Inmobiliarias CABA" required />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Asunto del Email</label>
                <Input name="subject" placeholder="Ej: Nueva herramienta de gestión para tu inmobiliaria" required />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Cuerpo del Mensaje (HTML)</label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-black text-brand-600 hover:bg-brand-50">
                    <Sparkles className="mr-1 h-3 w-3" /> Generar con IA
                  </Button>
                </div>
                <Textarea 
                  name="body" 
                  placeholder="Hola {{companyName}}, te escribimos de RaicesPilot..." 
                  className="min-h-[300px] font-medium leading-relaxed resize-none"
                  required
                />
                <p className="text-[11px] text-slate-400 font-medium italic mt-2">
                   Podés usar etiquetas como {"{{companyName}}"} para personalizar el envío.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-8 rounded-[2.5rem] border-slate-200 shadow-soft bg-slate-50/50">
             <div className="flex items-center justify-between mb-6">
                <div>
                   <h3 className="text-lg font-black text-slate-900">Segmento de Destinatarios</h3>
                   <p className="text-sm font-medium text-slate-500">Solo se incluyen prospectos aptos y aprobados.</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                   {prospects.length} Prospectos Aptos
                </Badge>
             </div>

             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {prospects.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                     <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                           <Users className="h-4 w-4" />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-900">{p.companyName}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">{p.email}</p>
                        </div>
                     </div>
                     <Badge variant="outline" className="text-[9px] font-black uppercase">
                        {PROSPECT_COMPANY_TYPE_LABELS[p.companyType as keyof typeof PROSPECT_COMPANY_TYPE_LABELS] || p.companyType}
                     </Badge>
                  </div>
                ))}
             </div>
          </Card>
        </div>

        <aside className="space-y-6 sticky top-8">
          <Card className="p-8 rounded-[2rem] border-slate-200 bg-white shadow-soft">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <Info className="h-4 w-4 text-brand-500" /> Resumen
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-500">Destinatarios:</span>
                <span className="text-slate-900">{prospects.length}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-500">Canal:</span>
                <span className="text-slate-900 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-500">Modo:</span>
                <span className="text-amber-600">Manual Asistido</span>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-black font-black rounded-xl shadow-xl transition-all active:scale-95">
                  Continuar a revisión
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-slate-200 bg-emerald-50/30 border-emerald-100">
             <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-[11px] font-bold text-emerald-800 leading-relaxed">
                   Al crear la campaña, los prospectos seleccionados serán vinculados permanentemente a ella.
                </p>
             </div>
          </Card>

          <Card className="p-6 rounded-2xl border-slate-200 bg-amber-50/30 border-amber-100">
             <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                   Se aplicará exclusión automática por duplicados y lista de supresión antes del envío.
                </p>
             </div>
          </Card>
        </aside>
      </form>
    </div>
  );
}
