import { getProspectById } from "@/modules/prospecting/service";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  Target, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Mail,
  Globe,
  Phone,
  Bot,
  Copy,
  Send,
  MessageSquare,
  Clock,
  Share2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  PROSPECT_COMPANY_TYPE_LABELS, 
  PROSPECT_STATUS_LABELS, 
  PROSPECT_STATUS_COLORS 
} from "@/modules/prospecting/types";
import { cn, formatDateTime } from "@/lib/utils";
import { generateProspectingEmailAction, markDraftSentAction, updateProspectStatusAction } from "@/modules/prospecting/actions";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await getProspectById(id);

  if (!prospect) notFound();

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
          <Link href="/platform/agents/prospecting">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{prospect.companyName}</h1>
            <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", PROSPECT_STATUS_COLORS[prospect.status as keyof typeof PROSPECT_STATUS_COLORS])}>
              {PROSPECT_STATUS_LABELS[prospect.status as keyof typeof PROSPECT_STATUS_LABELS]}
            </Badge>
          </div>
          <p className="text-slate-500 font-medium mt-1">
            {PROSPECT_COMPANY_TYPE_LABELS[prospect.companyType as keyof typeof PROSPECT_COMPANY_TYPE_LABELS]} • {[prospect.city, prospect.country].filter(Boolean).join(", ")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div className="flex flex-col gap-8">
          {/* IA Assistant / Drafts Section */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Asistente de Prospección</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">AgentOS AI Core</p>
                </div>
              </div>
              <form action={async () => {
                "use server";
                await generateProspectingEmailAction(prospect.id);
              }}>
                <Button type="submit" size="sm" className="h-10 bg-slate-900 font-bold px-6">
                  Generar email con IA
                </Button>
              </form>
            </div>

            <div className="space-y-6">
              {prospect.messageDrafts.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                  <p className="text-sm font-medium text-slate-400 italic">
                    Aún no hay borradores generados para este prospecto.
                  </p>
                </div>
              ) : (
                prospect.messageDrafts.map((draft: any) => (
                  <div key={draft.id} className="rounded-3xl border border-slate-200 p-6 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                        Borrador de Email
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tabular-nums">
                        Generado el {formatDateTime(draft.createdAt.toISOString())}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Asunto</p>
                        <p className="font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          {draft.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Cuerpo</p>
                        <div className="whitespace-pre-wrap text-sm text-slate-700 bg-white p-4 rounded-xl border border-slate-200 shadow-sm leading-relaxed">
                          {draft.body}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                      <Button variant="ghost" size="sm" className="text-xs font-bold">
                        <Copy className="mr-2 h-3.5 w-3.5" /> Copiar
                      </Button>
                      <form action={async () => {
                        "use server";
                        await markDraftSentAction(draft.id);
                      }}>
                        <Button type="submit" size="sm" className="h-9 bg-emerald-600 font-bold px-4">
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Marcar enviado
                        </Button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Clock className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Historial de Actividad</h2>
            </div>
            <div className="space-y-6">
              {prospect.activities.map((activity: any) => (
                <div key={activity.id} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-slate-400" />
                    </div>
                    <div className="w-0.5 flex-1 bg-slate-100 my-1" />
                  </div>
                  <div className="pb-6">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-slate-900">{activity.message}</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tabular-nums">
                        {formatDateTime(activity.createdAt.toISOString())}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
                      Tipo: {activity.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="flex flex-col gap-6">
          <Card className="p-6 rounded-[2rem] border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Datos de Contacto</h3>
            <div className="space-y-4">
              <ContactItem icon={Mail} label="Email" value={prospect.email} />
              <ContactItem icon={Globe} label="Sitio Web" value={prospect.website} isLink />
              <ContactItem icon={Phone} label="Teléfono" value={prospect.phone} />
              <ContactItem icon={MessageSquare} label="WhatsApp" value={prospect.whatsapp} />
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                {prospect.instagramUrl && <SocialIcon icon={Share2} href={prospect.instagramUrl} />}
                {prospect.linkedinUrl && <SocialIcon icon={Share2} href={prospect.linkedinUrl} />}
                {prospect.facebookUrl && <SocialIcon icon={Share2} href={prospect.facebookUrl} />}
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-[2rem] border-slate-200 shadow-sm bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Calificación</h3>
            <div className="space-y-6">
              <ScoreItem label="Calidad de Datos" score={prospect.qualityScore} color="emerald" />
              <ScoreItem label="Nivel de Confianza" score={prospect.confidenceScore} color="blue" />
            </div>
          </Card>

          <div className="flex flex-col gap-3">
             <form action={async () => {
               "use server";
               await updateProspectStatusAction(prospect.id, "APPROVED");
             }}>
               <Button type="submit" disabled={prospect.status === "APPROVED"} className="w-full h-12 bg-emerald-600 font-bold">
                 Aprobar Prospecto
               </Button>
             </form>
             <form action={async () => {
               "use server";
               await updateProspectStatusAction(prospect.id, "DISCARDED");
             }}>
               <Button type="submit" variant="outline" className="w-full h-12 font-bold text-rose-600 border-rose-100 hover:bg-rose-50">
                 Descartar
               </Button>
             </form>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ContactItem({ icon: Icon, label, value, isLink }: any) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
        {isLink ? (
          <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" className="text-sm font-bold text-slate-900 truncate block hover:text-brand-600">
            {value}
          </a>
        ) : (
          <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
        )}
      </div>
    </div>
  );
}

function SocialIcon({ icon: Icon, href }: any) {
  return (
    <a href={href} target="_blank" className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:border-brand-200 transition shadow-sm">
      <Icon className="h-5 w-5" />
    </a>
  );
}

function ScoreItem({ label, score, color }: any) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <span className={cn("text-lg font-black", `text-${color}-600`)}>{score}%</span>
      </div>
      <div className="w-full h-2 bg-white rounded-full border border-slate-100 overflow-hidden shadow-inner">
        <div 
          className={cn("h-full transition-all duration-1000", `bg-${color}-500`)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
