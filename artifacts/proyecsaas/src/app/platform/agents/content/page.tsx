import { listAgentContentDrafts } from "@/modules/agents/service";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, ExternalLink, Camera, Globe, Users, MessageSquare, Terminal, Eye } from "lucide-react";
import Link from "next/link";
import { PostPreview } from "@/components/agents/post-preview";
import { getMetaConnectionStatus } from "@/modules/agents/meta-service";
import { MetaPublisherAction } from "./MetaPublisherAction";

const PLATFORM_ICONS: Record<string, any> = {
  INSTAGRAM: Camera,
  FACEBOOK: Globe,
  LINKEDIN: Users,
  WHATSAPP_BUSINESS: MessageSquare,
};

const DRAFT_STATUS_CONFIG: Record<string, { label: string; className: string; icon: any; subtext?: string }> = {
  DRAFT: { 
    label: "Pendiente de revisión", 
    className: "border-amber-200 bg-amber-50 text-amber-700", 
    icon: Clock,
    subtext: "En espera de decisión humana"
  },
  APPROVED: { 
    label: "Listo para uso manual", 
    className: "border-emerald-200 bg-emerald-50 text-emerald-700", 
    icon: CheckCircle2,
    subtext: "Aprobado para publicación"
  },
  REJECTED: { 
    label: "Requiere revisión", 
    className: "border-red-200 bg-red-50 text-red-700", 
    icon: XCircle,
    subtext: "Rechazado por el operador"
  },
};

export default async function PlatformAgentsContentPage() {
  const [drafts, metaStatus] = await Promise.all([
    listAgentContentDrafts(),
    getMetaConnectionStatus()
  ]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-slate-400">
           <Terminal className="h-5 w-5" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Salida del Agente</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase">Borradores de Contenido</h1>
        <p className="text-sm font-medium text-slate-500">
          Resultados generados por el Agente de Marketing listos para uso manual.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {drafts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-3 py-20 rounded-[2.5rem] border border-dashed border-slate-200 bg-slate-50/50">
            <div className="rounded-full bg-white p-4 shadow-sm">
              <Clock className="h-8 w-8 text-slate-200" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Sin contenido generado</p>
          </div>
        ) : (
          drafts.map((draft) => {
            const config = DRAFT_STATUS_CONFIG[draft.status] || DRAFT_STATUS_CONFIG.DRAFT;
            const Icon = config.icon;
            const PlatformIcon = PLATFORM_ICONS[draft.platform] || Terminal;
            const approvalId = draft.task?.approvals?.[0]?.id;

            return (
              <div key={draft.id} className="group flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600">
                      <PlatformIcon className="h-4 w-4" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{draft.platform}</p>
                       <p className="text-[10px] font-bold text-slate-500">{new Date(draft.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-wider",
                      config.className
                    )}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                    <span className="mt-1 text-[9px] font-bold text-slate-400">{config.subtext}</span>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                        {draft.title ?? "Sin título"}
                      </h2>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 font-medium line-clamp-6">
                        {draft.content}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {draft.hashtags.map((tag) => (
                          <span key={tag} className="rounded-xl bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:w-[240px] shrink-0">
                       <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                         <Eye className="h-3 w-3" /> Preview Rápido
                       </p>
                       <div className="scale-[0.65] origin-top-left -mb-20">
                          <PostPreview 
                            platform={draft.platform}
                            content={draft.content}
                            hashtags={draft.hashtags}
                            className="shadow-none border-slate-100"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       Tarea: <span className="text-slate-600">{draft.task?.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {draft.status === "APPROVED" && (
                        <MetaPublisherAction draft={draft} metaStatus={metaStatus as any} />
                      )}
                      {approvalId && (
                        <Link 
                          href={`/platform/agents/approvals?status=${draft.status === 'DRAFT' ? 'PENDING' : draft.status}`}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 transition-colors"
                        >
                          Gestionar Aprobación <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
