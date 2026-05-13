import { getEligibleProspectsForCampaign } from "@/modules/prospecting/campaign-service";
import { 
  ArrowLeft, Users
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROSPECT_COMPANY_TYPE_LABELS } from "@/modules/prospecting/types";
import { CampaignForm } from "./campaign-form";

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

      <CampaignForm prospectCount={prospects.length} />

      <div className="space-y-4">
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

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {prospects.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                     <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                           <Users className="h-4 w-4" />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{p.companyName}</p>
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
    </div>
  );
}
