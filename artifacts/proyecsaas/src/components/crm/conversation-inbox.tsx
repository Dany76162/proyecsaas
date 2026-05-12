"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Send,
  User,
  Bot,
  MessageSquare,
  Home
} from "lucide-react";

import { confirmLeadPropertyAction } from "@/modules/leads/actions";
import {
  releaseConversationAction,
  resolveConversationFollowUpAction,
  sendManualMessageAction,
  takeConversationAction,
} from "@/modules/conversations/actions";
import { cn, formatDateTime } from "@/lib/utils";
import type { ConversationListItem } from "@/modules/conversations/types";
import { StatusBadge } from "@/components/workspace/status-badge";
import { Button } from "@/components/ui/button";
import { ConversationRow } from "@/components/inbox/conversation-row";
import { IaAssistantPanel } from "@/components/inbox/ia-assistant-panel";
import { HandoffBanner } from "@/components/inbox/handoff-banner";
import { SectionCard } from "@/components/workspace/section-card";
import { EmptyState } from "@/components/ui/empty-state";

// â”€â”€â”€ types & helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type FilterKey = "all" | "followup" | "failed";

enum UrgencyLevel {
  FAILED_DELIVERY = 4,
  TECHNICAL_FOLLOWUP = 3,
  COMMERCIAL_FOLLOWUP = 2,
  NORMAL = 1,
}

function hasFailedDelivery(c: ConversationListItem) {
  return c.messages.some((m) => m.deliveryStatus === "FAILED");
}

function getConversationUrgency(c: ConversationListItem): UrgencyLevel {
  if (hasFailedDelivery(c)) return UrgencyLevel.FAILED_DELIVERY;
  if (c.requiresFollowUp) {
    return c.followUpCategory === "TECHNICAL"
      ? UrgencyLevel.TECHNICAL_FOLLOWUP
      : UrgencyLevel.COMMERCIAL_FOLLOWUP;
  }
  return UrgencyLevel.NORMAL;
}

function ConversationDetail({
  conv,
  orgSlug,
  currentCursor,
}: {
  conv: ConversationListItem;
  orgSlug: string;
  currentCursor?: string;
}) {
  const shortlist = conv.propertyMatch?.shortlist ?? [];

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      {/* â”€â”€â”€ Header: Mesa de Operación â”€â”€â”€ */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold">
            {conv.participantName[0]}
            <span className={cn(
              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
              conv.leadTemperature === "hot" ? "bg-red-500" : "bg-emerald-500"
            )} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold text-slate-900 leading-tight">
                {conv.participantName}
              </h2>
              <StatusBadge label={conv.status} tone={conv.status === "QUALIFIED" ? "success" : "neutral"} dot />
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {conv.participantPhone}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Uto. mensaje {formatDateTime(conv.lastMessageAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conv.leadId && (
            <Button asChild variant="outline" size="sm" className="text-[11px] font-extrabold uppercase tracking-widest h-9 px-4">
              <Link href={`/${orgSlug}/leads/${conv.leadId}`}>Ficha Lead</Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-5 min-h-0 overflow-hidden">
        {/* â”€â”€â”€ Chat Area â”€â”€â”€ */}
        <div className="flex flex-1 flex-col gap-4 min-w-0">
          
          <HandoffBanner 
            isHumanControlled={conv.isHumanControlled}
            requiresFollowUp={conv.requiresFollowUp}
            followUpReason={conv.followUpReason}
            onTakeControl={() => {
              const form = document.getElementById(`take-control-${conv.id}`) as HTMLFormElement;
              form?.requestSubmit();
            }}
            onReleaseControl={() => {
              const form = document.getElementById(`release-control-${conv.id}`) as HTMLFormElement;
              form?.requestSubmit();
            }}
            onResolveFollowUp={() => {
              const form = document.getElementById(`resolve-followup-${conv.id}`) as HTMLFormElement;
              form?.requestSubmit();
            }}
          />

          {/* Hidden forms for actions */}
          <form id={`take-control-${conv.id}`} action={takeConversationAction} className="hidden">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="conversationId" value={conv.id} />
          </form>
          <form id={`release-control-${conv.id}`} action={releaseConversationAction} className="hidden">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="conversationId" value={conv.id} />
          </form>
          <form id={`resolve-followup-${conv.id}`} action={resolveConversationFollowUpAction} className="hidden">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="conversationId" value={conv.id} />
            <input type="hidden" name="leadId" value={conv.leadId ?? ""} />
          </form>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-inner custom-scrollbar space-y-6">
            {conv.messages.length === 0 ? (
              <EmptyState title="Sin mensajes" description="Esta conversación aún no tiene actividad registrada." icon={MessageSquare} />
            ) : (
              conv.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.direction === "INBOUND" ? "items-start self-start" : "items-end self-end ml-auto"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-xs font-bold text-slate-400 tabular-nums">
                      {formatDateTime(msg.sentAt)}
                    </span>
                    {msg.direction === "OUTBOUND" && (
                      <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        {msg.senderName === "Unknown sender" ? "Asistente IA" : msg.senderName}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-5 py-3 text-[15px] leading-relaxed shadow-sm",
                      msg.direction === "INBOUND"
                        ? "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50"
                        : "bg-slate-900 text-white rounded-tr-none"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                  </div>
                  {msg.deliveryStatus === "FAILED" && (
                    <span className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-widest">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Envío fallido: {msg.deliveryError || "Error desconocido"}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          <form
            action={sendManualMessageAction}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="conversationId" value={conv.id} />
            <textarea
              name="messageBody"
              rows={2}
              placeholder="Escribe un mensaje para responder manualmente..."
              className="w-full resize-none rounded-xl border-none bg-transparent px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
            />
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 mt-2 pt-2 px-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex h-2 w-2 rounded-full",
                  conv.isHumanControlled ? "bg-blue-500" : "bg-brand-500 animate-pulse"
                )} />
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                  {conv.isHumanControlled ? "Agente al control" : "IA en espera"}
                </p>
              </div>
              <Button type="submit" size="sm" className="h-8 px-4 rounded-lg bg-slate-900">
                <Send className="h-3.5 w-3.5 mr-2" />
                Enviar
              </Button>
            </div>
          </form>
        </div>

        {/* â”€â”€â”€ Sidebar: Intelligence Center â”€â”€â”€ */}
        <aside className="w-80 shrink-0 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          <IaAssistantPanel 
            summary={conv.automationSummary}
            intent={conv.nextBestAction}
            reasons={conv.propertyMatch?.reasons}
            signals={conv.propertyMatch?.consideredSignals}
            nextAction={conv.nextBestAction}
          />

          <SectionCard eyebrow="Inmueble" title="Propiedad Vinculada" noPadding>
            {conv.propertyId ? (
              <div className="p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{conv.propertyTitle}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{conv.propertyContextNote || "Sin notas de contexto"}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full text-[11px] font-extrabold uppercase tracking-widest h-9">
                  <Link href={`/${orgSlug}/properties/${conv.propertyId}`}>Ver ficha técnica</Link>
                </Button>
              </div>
            ) : (
              <div className="p-6 text-center italic text-slate-400 text-sm">
                Ninguna propiedad vinculada directamente.
              </div>
            )}
          </SectionCard>

          {shortlist.length > 0 && (
            <SectionCard eyebrow="Sugerencias" title="Opciones IA" noPadding>
              <div className="divide-y divide-slate-100">
                {shortlist.map((candidate) => (
                  <div key={candidate.propertyId} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{candidate.title}</p>
                      <span className="text-xs font-bold text-brand-600 tabular-nums">{candidate.score}% Match</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-2">
                      "{candidate.reasons[0]}"
                    </p>
                    <div className="flex gap-2">
                      <Button asChild variant="ghost" size="sm" className="flex-1 h-8 text-[11px] font-extrabold uppercase tracking-widest">
                        <Link href={`/${orgSlug}/properties/${candidate.propertyId}`}>Detalles</Link>
                      </Button>
                      <form action={confirmLeadPropertyAction} className="flex-1">
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input type="hidden" name="leadId" value={conv.leadId ?? ""} />
                        <input type="hidden" name="propertyId" value={candidate.propertyId} />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={
                            currentCursor
                              ? `/${orgSlug}/conversations?cursor=${encodeURIComponent(currentCursor)}&selected=${encodeURIComponent(conv.id)}`
                              : `/${orgSlug}/conversations?selected=${encodeURIComponent(conv.id)}`
                          }
                        />
                        <Button type="submit" variant="outline" size="sm" className="w-full h-8 text-[11px] font-extrabold uppercase tracking-widest border-brand-200 text-brand-700 hover:bg-brand-50">
                          Vincular
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </aside>
      </div>
    </div>
  );
}

// â”€â”€â”€ main inbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ConversationInbox({
  conversations,
  orgSlug,
  currentCursor,
  initialSelectedId,
}: {
  conversations: ConversationListItem[];
  orgSlug: string;
  currentCursor?: string;
  initialSelectedId?: string;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId && conversations.some((conversation) => conversation.id === initialSelectedId)
      ? initialSelectedId
      : conversations[0]?.id ?? null,
  );
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const prioritized = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const urgencyA = getConversationUrgency(a);
      const urgencyB = getConversationUrgency(b);
      if (urgencyA !== urgencyB) return urgencyB - urgencyA;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }, [conversations]);

  const filtered = prioritized.filter((c) => {
    if (activeFilter === "followup") return c.requiresFollowUp;
    if (activeFilter === "failed") return hasFailedDelivery(c);
    return true;
  });

  const selected = prioritized.find((c) => c.id === (selectedId || filtered[0]?.id)) ?? null;

  const followUpCount = prioritized.filter((c) => c.requiresFollowUp).length;
  const failedCount = prioritized.filter(hasFailedDelivery).length;

  return (
    <div className="grid h-[calc(100vh-160px)] min-h-[500px] gap-4 lg:grid-cols-[340px_1fr]">
      {/* â”€â”€â”€ List Panel â”€â”€â”€ */}
      <div className={cn("flex flex-col gap-3 overflow-hidden", mobileShowDetail ? "hidden lg:flex" : "flex")}>
        {/* Navigation Filters */}
        <div className="flex gap-1 rounded-xl bg-slate-100/50 p-1 ring-1 ring-slate-200/50">
          {[
            { key: "all", label: "Todas", count: prioritized.length },
            { key: "followup", label: "Pendientes", count: followUpCount, alert: true },
            { key: "failed", label: "Errores", count: failedCount, danger: true },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setActiveFilter(f.key as FilterKey);
                setSelectedId(null);
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                activeFilter === f.key
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/30",
              )}
            >
              {f.label}
              {f.count > 0 && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    activeFilter === f.key
                      ? "bg-slate-100 text-slate-900"
                      : f.danger
                        ? "bg-red-100 text-red-600"
                        : f.alert
                          ? "bg-orange-100 text-orange-600"
                          : "bg-slate-200/50 text-slate-600",
                  )}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Scrollable Feed */}
        <div className="flex-1 space-y-0.5 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-inner custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
              <p className="text-xs font-semibold text-slate-400 italic">
                {activeFilter === "failed"
                  ? "No hay fallas de envío."
                  : activeFilter === "followup"
                    ? "La bandeja operativa está vacía."
                    : "No hay conversaciones."}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <ConversationRow
                key={conv.id}
                conv={conv}
                isSelected={conv.id === selectedId || (!selectedId && conv.id === filtered[0]?.id)}
                onClick={() => { setSelectedId(conv.id); setMobileShowDetail(true); }}
              />
            ))
          )}
        </div>
      </div>

      {/* â”€â”€â”€ Detail Panel â”€â”€â”€ */}
      <div className={cn(
        "overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/30 p-4 sm:p-8 shadow-inner",
        !mobileShowDetail ? "hidden lg:block" : "block"
      )}>
        {selected ? (
          <>
            {/* Back button â€” mobile only */}
            <button
              type="button"
              onClick={() => setMobileShowDetail(false)}
              className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition lg:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a conversaciones
            </button>
            <ConversationDetail conv={selected} orgSlug={orgSlug} currentCursor={currentCursor} />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-40">
            <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-brand-500 animate-spin mb-4" />
            <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">
              Selecciona una conversación
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
