"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";

import { confirmLeadPropertyAction } from "@/modules/leads/actions";
import {
  releaseConversationAction,
  resolveConversationFollowUpAction,
  sendManualMessageAction,
  takeConversationAction,
} from "@/modules/conversations/actions";
import { cn, formatDateTime } from "@/lib/utils";
import type { ConversationListItem } from "@/modules/conversations/types";

// ─── types & helpers ─────────────────────────────────────────────────────────

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

// ─── sub-components ──────────────────────────────────────────────────────────

function DeliveryBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    FAILED: { label: "Fallido", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
    SENT: { label: "Enviado", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
    RECEIVED: { label: "Recibido", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
    SKIPPED: { label: "Omitido", dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600" },
    PENDING: { label: "Pendiente", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700" },
  };

  const item = config[status] || {
    label: status,
    dot: "bg-slate-300",
    bg: "bg-slate-50",
    text: "text-slate-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        item.bg,
        item.text,
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", item.dot)} />
      {item.label}
    </span>
  );
}

function getPropertyMatchLabel(
  status:
    | "matched"
    | "existing-link"
    | "manual-confirmed"
    | "manual-overridden"
    | "no-match",
) {
  if (status === "matched") return "Auto-vinculada";
  if (status === "existing-link") return "Vínculo previo";
  if (status === "manual-confirmed") return "Confirmada manual";
  if (status === "manual-overridden") return "Cambiada manual";
  return "Revisión requerida";
}

function getPropertyMatchTone(
  status:
    | "matched"
    | "existing-link"
    | "manual-confirmed"
    | "manual-overridden"
    | "no-match",
) {
  if (status === "matched") return "bg-emerald-100 text-emerald-700";
  if (status === "existing-link" || status === "manual-confirmed") {
    return "bg-blue-100 text-blue-700";
  }
  return "bg-slate-100 text-slate-600";
}

function formatNextBestAction(action: string | null | undefined) {
  if (!action) return null;
  return action
    .split("-")
    .join(" ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function ConversationRow({
  conv,
  isSelected,
  onClick,
}: {
  conv: ConversationListItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const urgency = getConversationUrgency(conv);
  const lastMessage = conv.messages[conv.messages.length - 1];
  const lastDeliveryStatus = lastMessage?.deliveryStatus ?? "PENDING";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border p-3 text-left transition-all duration-75",
        isSelected
          ? "border-brand-500 bg-brand-50/70 ring-[0.5px] ring-brand-500"
          : urgency === UrgencyLevel.FAILED_DELIVERY
            ? "border-red-100 bg-white hover:bg-red-50/30"
            : urgency === UrgencyLevel.TECHNICAL_FOLLOWUP
              ? "border-orange-100 bg-white hover:bg-orange-50/30"
              : urgency === UrgencyLevel.COMMERCIAL_FOLLOWUP
                ? "border-amber-100 bg-white hover:bg-amber-50/30"
                : "border-slate-100 bg-white hover:bg-slate-50",
      )}
    >
      {/* Priority Indicator Strip */}
      {urgency > UrgencyLevel.NORMAL && (
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-1",
            urgency === UrgencyLevel.FAILED_DELIVERY
              ? "bg-red-500"
              : urgency === UrgencyLevel.TECHNICAL_FOLLOWUP
                ? "bg-orange-500"
                : "bg-amber-500",
          )}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "truncate text-xs font-semibold uppercase tracking-tight",
                isSelected ? "text-brand-900" : "text-slate-900",
              )}
            >
              {conv.participantName}
            </p>
            {urgency === UrgencyLevel.FAILED_DELIVERY && (
              <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                !
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 opacity-90">
            {conv.latestMessagePreview}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-medium text-slate-400 tabular-nums">
          {formatDateTime(conv.lastMessageAt)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <DeliveryBadge status={lastDeliveryStatus} />

        {conv.requiresFollowUp && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
              conv.followUpCategory === "TECHNICAL"
                ? "bg-orange-100 text-orange-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {conv.followUpCategory === "TECHNICAL" ? "Técnico" : "Comercial"}
          </span>
        )}
        {conv.isHumanControlled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700">
            Agente
          </span>
        )}
      </div>
    </button>
  );
}

function ContextSummary({ title, content }: { title: string; content: string | null | undefined }) {
  if (!content) return null;
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-700 leading-tight">{content}</p>
    </div>
  );
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
  const urgency = getConversationUrgency(conv);
  const shortlist = conv.propertyMatch?.shortlist ?? [];

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ─── Header Section ─── */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                WhatsApp
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-200" />
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  conv.leadTemperature === "hot" ? "text-red-500" : "text-slate-500",
                )}
              >
                {conv.leadTemperature} Lead
              </span>
            </div>
            <h2 className="mt-1 truncate text-xl font-bold text-slate-900">
              {conv.participantName}
            </h2>
            <p className="text-xs font-medium text-slate-500">{conv.participantPhone}</p>
          </div>

          <div className="flex shrink-0 gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                conv.status === "QUALIFIED"
                  ? "bg-emerald-100 text-emerald-700"
                  : conv.status === "CLOSED"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-amber-100 text-amber-700",
              )}
            >
              {conv.status}
            </span>
          </div>
        </div>

        {/* ─── Data Summaries ─── */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <ContextSummary title="Propiedad" content={conv.propertyTitle} />
          <ContextSummary title="Etapa" content={conv.leadStatus} />
          <ContextSummary title="Notas" content={conv.propertyContextNote} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {conv.propertyMatch ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                getPropertyMatchTone(conv.propertyMatch.status),
              )}
            >
              {getPropertyMatchLabel(conv.propertyMatch.status)}
            </span>
          ) : null}
          {conv.nextBestAction ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
              {formatNextBestAction(conv.nextBestAction)}
            </span>
          ) : null}
          {conv.propertyMatch?.score != null ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Score {conv.propertyMatch.score}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {conv.leadId ? (
            <Link
              href={`/${orgSlug}/leads/${conv.leadId}`}
              className="rounded-full border border-slate-300 px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Abrir lead
            </Link>
          ) : null}
          {conv.propertyId ? (
            <Link
              href={`/${orgSlug}/properties/${conv.propertyId}`}
              className="rounded-full border border-slate-300 px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Abrir propiedad
            </Link>
          ) : null}
        </div>
      </div>

      {/* ─── Action Center ─── */}
      <div className="space-y-2">
        {(conv.automationSummary || conv.propertyMatch) && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Contexto analizado
              </p>
              {conv.propertyMatch?.consideredSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600"
                >
                  {signal}
                </span>
              ))}
            </div>

            {conv.automationSummary ? (
              <p className="mt-3 text-xs leading-relaxed text-slate-600">{conv.automationSummary}</p>
            ) : null}

            {conv.propertyMatch?.reasons.length ? (
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                {conv.propertyMatch.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            ) : null}

            {shortlist.length ? (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Shortlist sugerida
                </p>
                {shortlist.map((candidate) => (
                  <div
                    key={candidate.propertyId}
                    className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{candidate.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {[candidate.neighborhood, candidate.city].filter(Boolean).join(" / ") ||
                            "Ubicación pendiente"}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-700">
                        Score {candidate.score}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {candidate.propertyType ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200">
                          {candidate.propertyType}
                        </span>
                      ) : null}
                      {candidate.bedrooms ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200">
                          {candidate.bedrooms} br
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                      {candidate.reasons[0]}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/${orgSlug}/properties/${candidate.propertyId}`}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Abrir propiedad
                      </Link>
                      {conv.leadId ? (
                        <form action={confirmLeadPropertyAction}>
                          <input type="hidden" name="orgSlug" value={orgSlug} />
                          <input type="hidden" name="leadId" value={conv.leadId} />
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
                          <button
                            type="submit"
                            className="rounded-full bg-brand-500 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-brand-600"
                          >
                            {conv.propertyId === candidate.propertyId
                              ? "Mantener actual"
                              : conv.propertyId
                                ? "Reemplazar por esta"
                                : "Vincular propiedad"}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
        {/* Delivery failure banner */}
        {hasFailedDelivery(conv) && (
          <div className="relative overflow-hidden rounded-xl border border-red-200 bg-red-50/50 p-4">
            <div className="absolute left-0 top-0 h-full w-1 bg-red-500" />
            <div className="flex items-start gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">!</span>
              <div>
                <p className="text-xs font-bold text-red-900 uppercase tracking-tight">Error de envío</p>
                <p className="mt-0.5 text-xs text-red-800 opacity-90 leading-relaxed">
                  Hubo un error al enviar uno o más mensajes. Revisá los detalles y gestioná el seguimiento manual.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Follow-up banner */}
        {conv.requiresFollowUp && (
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 transition-all text-slate-900 shadow-sm",
              conv.followUpCategory === "TECHNICAL"
                ? "border-orange-200 bg-orange-50/50"
                : "border-amber-200 bg-amber-50/50",
            )}
          >
            <div
              className={cn(
                "absolute left-0 top-0 h-full w-1",
                conv.followUpCategory === "TECHNICAL" ? "bg-orange-500" : "bg-amber-500",
              )}
            />

            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                      conv.followUpCategory === "TECHNICAL"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {conv.followUpCategory === "TECHNICAL" ? "Technical" : "Commercial"}
                  </span>
                  <p className="text-xs font-bold">Seguimiento sugerido</p>
                  {conv.followUpActiveAt && (
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      desde {formatDateTime(conv.followUpActiveAt)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-4">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Motivo</p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed">
                      {conv.followUpReason || "Revisión necesaria."}
                    </p>
                  </div>

                  {conv.nextBestAction && (
                    <div className="rounded-lg border border-slate-200/50 bg-white/50 p-2.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        Acción sugerida (IA)
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-600 italic leading-relaxed">
                        "{conv.nextBestAction}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <form action={resolveConversationFollowUpAction} className="shrink-0 self-center">
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <input type="hidden" name="conversationId" value={conv.id} />
                <input type="hidden" name="leadId" value={conv.leadId ?? ""} />
                <button
                  type="submit"
                  className={cn(
                    "rounded-md px-4 py-2 text-xs font-bold shadow-sm transition-all hover:brightness-95 active:scale-95",
                    conv.followUpCategory === "TECHNICAL"
                      ? "bg-orange-600 text-white"
                      : "bg-amber-600 text-white",
                  )}
                >
                  Marcar como resuelto
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ─── Human Control ─── */}
      {conv.isHumanControlled ? (
        <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                H
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-tight text-blue-900">
                  Agente al control
                </p>
                <p className="mt-0.5 text-xs text-blue-800 opacity-90">
                  Respuestas del bot pausadas. Liberá el bot para reanudar.
                </p>
              </div>
            </div>
            <form action={releaseConversationAction} className="shrink-0">
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <input type="hidden" name="conversationId" value={conv.id} />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:brightness-95 active:scale-95"
              >
                Liberar bot
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <form action={takeConversationAction}>
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="conversationId" value={conv.id} />
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 active:scale-95"
            >
              Tomar control
            </button>
          </form>
        </div>
      )}

      {/* ─── Message List ─── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-50 bg-slate-50/30 px-5 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Historial de mensajes ({conv.messages.length})
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
          {conv.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center opacity-30">
              <p className="text-xs font-semibold italic text-slate-400">Esperando interacción</p>
            </div>
          ) : (
            conv.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "relative flex flex-col space-y-1",
                  msg.direction === "INBOUND" ? "items-start pr-12" : "items-end pl-12",
                )}
              >
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400 tabular-nums">
                  <span>{formatDateTime(msg.sentAt)}</span>
                  <DeliveryBadge status={msg.deliveryStatus} />
                </div>
                <div
                  className={cn(
                    "max-w-full rounded-lg px-3.5 py-2.5 text-xs leading-relaxed",
                    msg.direction === "INBOUND"
                      ? "bg-slate-100 text-slate-800"
                      : "bg-brand-900 text-white",
                    msg.deliveryStatus === "FAILED" && "border border-red-200 bg-red-50 text-red-950",
                    msg.deliveryStatus === "SKIPPED" && "border border-slate-200 bg-slate-100 text-slate-900",
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                  {msg.direction === "OUTBOUND" && (
                    <p
                      className={cn(
                        "mt-1.5 text-[9px] font-semibold uppercase tracking-wider opacity-60",
                        msg.deliveryStatus === "FAILED" ? "text-red-700" : "text-current",
                      )}
                    >
                      {msg.senderName === "Unknown sender" ? "Bot" : msg.senderName}
                    </p>
                  )}
                  {msg.deliveryError && (
                    <div
                      className={cn(
                        "mt-2 rounded p-1.5 text-[10px] font-bold uppercase",
                        msg.deliveryStatus === "FAILED"
                          ? "bg-red-100/50 text-red-900"
                          : msg.deliveryStatus === "SKIPPED"
                            ? "bg-slate-200/50 text-slate-800"
                            : "bg-black/20 text-white"
                      )}
                    >
                      Error: {msg.deliveryError}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Compose ─── */}
      <form
        action={sendManualMessageAction}
        className="shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="conversationId" value={conv.id} />
        <textarea
          name="messageBody"
          rows={2}
          placeholder="Escribí un mensaje..."
          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-400">
            {conv.isHumanControlled
              ? "Control activo — IA pausada"
              : "Responder pausará la IA automáticamente"}
          </p>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-brand-700 active:scale-95"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── main inbox ──────────────────────────────────────────────────────────────

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
      {/* ─── List Panel ─── */}
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
        <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
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

      {/* ─── Detail Panel ─── */}
      <div className={cn(
        "overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/30 p-4 sm:p-8 shadow-inner",
        !mobileShowDetail ? "hidden lg:block" : "block"
      )}>
        {selected ? (
          <>
            {/* Back button — mobile only */}
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
