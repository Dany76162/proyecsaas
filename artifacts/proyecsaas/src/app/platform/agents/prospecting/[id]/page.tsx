import { getProspectById, canGenerateEmail } from "@/modules/prospecting/service";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Mail,
  Globe,
  Phone,
  Bot,
  Copy,
  MessageSquare,
  Clock,
  Share2,
  ShieldAlert,
  BarChart3,
  RefreshCw,
  Star
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  getRiskBadgeColor
} from "@/modules/prospecting/types";
import { cn, formatDateTime } from "@/lib/utils";
import { 
  generateProspectingEmailAction, 
  markDraftSentAction, 
  updateProspectStatusAction,
  updateManualQualificationAction,
  recalculateScoresAction,
  convertToOrganizationAction
} from "@/modules/prospecting/actions";
import { Card } from "@/components/ui/card";
import { HandoffDemoModal } from "./handoff-demo-modal";

export const dynamic = "force-dynamic";

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await getProspectById(id);

  if (!prospect) notFound();

  const emailEligibility = canGenerateEmail(prospect);

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
          <Link href="/platform/agents/prospecting">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{prospect.companyName}</h1>
            <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", PROSPECT_STATUS_COLORS[prospect.status as keyof typeof PROSPECT_STATUS_COLORS])}>
              {PROSPECT_STATUS_LABELS[prospect.status as keyof typeof PROSPECT_STATUS_LABELS]}
            </Badge>
            {prospect.manualRating && (
              <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", MANUAL_RATING_COLORS[prospect.manualRating as keyof typeof MANUAL_RATING_COLORS])}>
                {prospect.manualRating}
              </Badge>
            )}
            {prospect.priority && (
              <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", PRIORITY_COLORS[prospect.priority as keyof typeof PRIORITY_COLORS])}>
                {PRIORITY_LABELS[prospect.priority as keyof typeof PRIORITY_LABELS]}
              </Badge>
            )}
          </div>
          <p className="text-slate-500 font-medium mt-1">
            {PROSPECT_COMPANY_TYPE_LABELS[prospect.companyType as keyof typeof PROSPECT_COMPANY_TYPE_LABELS]} • {[prospect.city, prospect.country].filter(Boolean).join(", ")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div className="flex flex-col gap-8">

          {/* ── AI Scoring Panel ──────────────────────────────────────── */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Calificación IA</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Scoring automático</p>
                </div>
              </div>
              <form action={async () => { "use server"; await recalculateScoresAction(prospect.id); }}>
                <Button type="submit" variant="outline" size="sm" className="text-xs font-bold">
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Recalcular
                </Button>
              </form>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <ScoreCard label="Calidad de Datos" score={prospect.qualityScore} type="quality" />
              <ScoreCard label="Fit con RaicesPilot" score={prospect.fitScore} type="quality" />
              <ScoreCard label="Confianza" score={prospect.confidenceScore} type="quality" />
              <ScoreCard label="Riesgo" score={prospect.riskScore} type="risk" />
            </div>

            {prospect.aiScoringNotes && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Análisis del agente</p>
                <p className="text-sm text-slate-700 leading-relaxed">{prospect.aiScoringNotes}</p>
              </div>
            )}
          </div>

          {/* ── Manual Qualification ─────────────────────────────────── */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Calificación Comercial</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Revisión manual del Superadmin</p>
              </div>
            </div>

            {prospect.manualStatus && (
              <div className="mb-6 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase">Estado manual actual:</span>
                <Badge variant="outline" className={cn("text-[10px] font-black uppercase", MANUAL_STATUS_COLORS[prospect.manualStatus as keyof typeof MANUAL_STATUS_COLORS])}>
                  {MANUAL_STATUS_LABELS[prospect.manualStatus as keyof typeof MANUAL_STATUS_LABELS]}
                </Badge>
              </div>
            )}

            <form action={updateManualQualificationAction}>
              <input type="hidden" name="prospectId" value={prospect.id} />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Calificación</label>
                  <select name="manualRating" defaultValue={prospect.manualRating || ""} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Sin calificación</option>
                    <option value="A">A — Excelente</option>
                    <option value="B">B — Bueno</option>
                    <option value="C">C — Regular</option>
                    <option value="D">D — Bajo</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Prioridad</label>
                  <select name="priority" defaultValue={prospect.priority || "MEDIUM"} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Media</option>
                    <option value="LOW">Baja</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Decisión</label>
                  <select name="manualStatus" defaultValue={prospect.manualStatus || ""} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Sin decisión</option>
                    <option value="APTO_CONTACTO">✅ Apto para contacto</option>
                    <option value="REVISAR">🔍 Pendiente de revisión</option>
                    <option value="CONTACTAR_MAS_ADELANTE">📅 Contactar más adelante</option>
                    <option value="DESCARTAR">❌ Descartar</option>
                    <option value="NO_CONTACTAR">🚫 No contactar</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Fecha para contactar (opcional)</label>
                <input 
                  type="date" 
                  name="contactLaterDate" 
                  defaultValue={prospect.contactLaterDate ? new Date(prospect.contactLaterDate).toISOString().split("T")[0] : ""}
                  className="w-full md:w-auto rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Notas internas del Superadmin</label>
                <textarea 
                  name="manualNotes" 
                  defaultValue={prospect.manualNotes || ""} 
                  placeholder="Notas sobre la decisión, contexto comercial, motivo de rechazo..."
                  className="w-full min-h-[100px] rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <Button type="submit" className="h-11 bg-slate-900 font-bold px-8">
                Guardar calificación
              </Button>

              {prospect.reviewedAt && (
                <p className="mt-3 text-[10px] text-slate-400 font-bold uppercase">
                  Última revisión: {formatDateTime(prospect.reviewedAt.toISOString())}
                </p>
              )}
            </form>
          </div>

          {/* ── IA Assistant / Drafts ────────────────────────────────── */}
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
              {emailEligibility.allowed ? (
                <form action={async () => { "use server"; await generateProspectingEmailAction(prospect.id); }}>
                  <Button type="submit" size="sm" className="h-10 bg-slate-900 font-bold px-6">
                    Generar email con IA
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-100">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700">{emailEligibility.reason}</span>
                </div>
              )}
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
                        <p className="font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">{draft.subject}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Cuerpo</p>
                        <div className="whitespace-pre-wrap text-sm text-slate-700 bg-white p-4 rounded-xl border border-slate-200 shadow-sm leading-relaxed">{draft.body}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                      <Button variant="ghost" size="sm" className="text-xs font-bold">
                        <Copy className="mr-2 h-3.5 w-3.5" /> Copiar
                      </Button>
                      <form action={async () => { "use server"; await markDraftSentAction(draft.id); }}>
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

          {/* ── Activity Logs ────────────────────────────────────────── */}
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

        {/* ── Sidebar ────────────────────────────────────────────────── */}
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
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Acciones Rápidas</h3>
            <div className="flex flex-col gap-3">
              {prospect.status === "CONVERTED" ? (
                <div className="w-full p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center text-center gap-2">
                   <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                   <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Prospecto Convertido</p>
                   <p className="text-[10px] text-emerald-600 font-bold">Este prospecto ya es una organización real.</p>
                </div>
              ) : (
                <form action={async () => { "use server"; await convertToOrganizationAction(prospect.id); }}>
                  <Button type="submit" className="w-full h-11 bg-brand-600 hover:bg-brand-700 font-black shadow-lg shadow-brand-200">
                    🚀 Convertir en Organización
                  </Button>
                </form>
              )}
              
              <div className="w-full h-px bg-slate-200 my-2" />

              {(prospect.whatsapp || prospect.phone) && prospect.status !== "CONVERTED" && prospect.status !== "HANDED_TO_DEMO_AGENT" && (
                <HandoffDemoModal prospectId={prospect.id} phone={(prospect.whatsapp || prospect.phone)!} />
              )}
              
              <div className="w-full h-px bg-slate-200 my-2" />

              <form action={async () => { "use server"; await updateProspectStatusAction(prospect.id, "APPROVED"); }}>
                <Button type="submit" disabled={prospect.status === "APPROVED" || prospect.status === "CONTACT_READY" || prospect.status === "CONVERTED"} className="w-full h-11 bg-slate-900 font-bold">
                  ✅ Aprobar para contacto
                </Button>
              </form>
              <form action={async () => { "use server"; await updateProspectStatusAction(prospect.id, "DISCARDED"); }}>
                <Button type="submit" variant="outline" disabled={prospect.status === "CONVERTED"} className="w-full h-11 font-bold text-slate-600 border-slate-200">
                  ❌ Descartar
                </Button>
              </form>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function ScoreCard({ label, score, type }: { label: string; score: number | null; type: "quality" | "risk" }) {
  const s = score ?? 0;
  const isRisk = type === "risk";
  const level = isRisk ? getRiskLevel(s) : getScoreLevel(s);
  const badgeColor = isRisk ? getRiskBadgeColor(level as any) : getScoreBadgeColor(level as any);
  const barColor = isRisk
    ? (s >= 50 ? "bg-red-500" : s >= 25 ? "bg-amber-500" : "bg-emerald-500")
    : (s >= 70 ? "bg-emerald-500" : s >= 40 ? "bg-amber-500" : "bg-red-500");

  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 leading-tight">{label}</p>
        <span className={cn("text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full", badgeColor)}>
          {level}
        </span>
      </div>
      <p className="text-2xl font-black text-slate-900 tabular-nums">{s}%</p>
      <div className="w-full h-1.5 bg-white rounded-full border border-slate-100 overflow-hidden mt-2">
        <div className={cn("h-full transition-all duration-1000 rounded-full", barColor)} style={{ width: `${s}%` }} />
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
          <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" className="text-sm font-bold text-slate-900 truncate block hover:text-brand-600">{value}</a>
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
