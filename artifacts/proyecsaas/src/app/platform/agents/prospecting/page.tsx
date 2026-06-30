import { getProspects } from "@/modules/prospecting/service";
import { ProspectsTable } from "@/components/prospecting/prospects-table";
import { Button } from "@/components/ui/button";
import { Plus, Download, Filter, Target, CheckCircle2, AlertCircle, Users, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { PROSPECT_STATUS_LABELS } from "@/modules/prospecting/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProspectingPage() {
  const prospects = await getProspects();

  const stats = {
    total: prospects.length,
    needsReview: prospects.filter(p => p.status === "NEEDS_REVIEW").length,
    approved: prospects.filter(p => p.status === "APPROVED" || p.status === "CONTACT_READY").length,
    contacted: prospects.filter(p => p.status === "CONTACTED").length,
    demoRequested: prospects.filter(p => p.status === "DEMO_REQUESTED").length,
    doNotContact: prospects.filter(p => p.isDoNotContact).length,
  };

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Prospección AgentOS</h1>
          <p className="text-slate-500 mt-1 font-medium">Gestión de prospección comercial B2B para RaicesPilot.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-10 font-bold border-slate-200">
            <Link href="/platform/agents/prospecting/campaigns">
              <Mail className="mr-2 h-4 w-4 text-brand-600" /> Campañas
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-10 font-bold border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100">
            <Link href="/platform/agents/prospecting/explore">
              <MapPin className="mr-2 h-4 w-4" /> Explorador Territorial
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-10 font-bold border-slate-200">
            <Link href="/platform/agents/prospecting/search">
              <Plus className="mr-2 h-4 w-4 text-brand-600" /> Buscar Prospectos
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-10 font-bold border-slate-200">
            <Link href="/platform/agents/prospecting/search?tab=paste">
              <Download className="mr-2 h-4 w-4 text-brand-600" /> Pegar Datos
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-10 font-bold border-slate-200">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <Button asChild size="sm" className="h-10 font-bold bg-slate-900">
            <Link href="/platform/agents/prospecting/new">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Manual
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Prospectos Totales" 
          value={stats.total} 
          icon={Users} 
          trend="Base de datos global"
        />
        <StatCard 
          label="Pendientes" 
          value={stats.needsReview} 
          icon={AlertCircle} 
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard 
          label="Aprobados" 
          value={stats.approved} 
          icon={CheckCircle2} 
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard 
          label="Solicitudes Demo" 
          value={stats.demoRequested} 
          icon={Target} 
          color="text-brand-600"
          bgColor="bg-brand-50"
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Todos los Prospectos</h2>
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500">
               <Filter className="mr-2 h-3.5 w-3.5" /> Filtrar
             </Button>
          </div>
        </div>
        <ProspectsTable prospects={prospects} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "text-slate-900", bgColor = "bg-white", trend }: any) {
  return (
    <div className={cn("p-6 rounded-2xl border border-slate-200 shadow-sm", bgColor)}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", bgColor === "bg-white" ? "bg-slate-100" : "bg-white/50")}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <h3 className={cn("text-3xl font-black", color)}>{value}</h3>
      </div>
      {trend && <p className="text-[10px] text-slate-400 mt-2 font-medium">{trend}</p>}
    </div>
  );
}
