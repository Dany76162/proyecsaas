import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { resolveConversationFollowUpAction } from "@/modules/conversations/actions";
import {
  listConversationNotifications,
  listOrganizationAvailability,
  listOrganizationConversations,
} from "@/modules/conversations/service";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { formatDateTime, formatMinuteRange, formatWeekday } from "@/lib/utils";

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, conversations, availability, notifications] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationConversations(orgSlug),
    listOrganizationAvailability(orgSlug),
    listConversationNotifications(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  const getTemperatureTone = (temperature: "hot" | "warm" | "cold" | "unclear") => {
    if (temperature === "hot") {
      return "warning" as const;
    }

    if (temperature === "warm") {
      return "info" as const;
    }

    return "neutral" as const;
  };

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          eyebrow="Conversations"
          title="Property-aware conversation records"
          description="Persisted conversation history now keeps the future WhatsApp and AI flow anchored to property and lead context."
        >
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <article key={conversation.id} className="rounded-[1.5rem] border border-slate-200 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge label={conversation.channel} tone="info" />
                  <StatusBadge
                    label={conversation.status}
                    tone={
                      conversation.status === "QUALIFIED"
                        ? "success"
                        : conversation.status === "CLOSED"
                          ? "neutral"
                          : "warning"
                    }
                  />
                  <StatusBadge label={conversation.leadStatus} tone="info" />
                  <StatusBadge
                    label={conversation.leadTemperature}
                    tone={getTemperatureTone(conversation.leadTemperature)}
                  />
                  {conversation.requiresFollowUp ? (
                    <StatusBadge label="Follow-up" tone="warning" />
                  ) : null}
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">{conversation.subject}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {conversation.participantName} / {conversation.participantPhone}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {conversation.propertyContextNote}
                </p>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                  {conversation.propertyId ? (
                    <Link
                      href={`/${orgSlug}/properties/${conversation.propertyId}`}
                      className="hover:text-brand-600"
                    >
                      {conversation.propertyTitle}
                    </Link>
                  ) : (
                    <span>{conversation.propertyTitle}</span>
                  )}
                  {conversation.leadId ? (
                    <Link
                      href={`/${orgSlug}/leads/${conversation.leadId}`}
                      className="hover:text-brand-600"
                    >
                      {conversation.leadName}
                    </Link>
                  ) : (
                    <span>{conversation.leadName}</span>
                  )}
                  <span>{formatDateTime(conversation.lastMessageAt)}</span>
                </div>

                {conversation.requiresFollowUp && conversation.followUpReason ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">Operator follow-up recommended</p>
                    <p className="mt-1 leading-6">{conversation.followUpReason}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {conversation.followUpActiveAt ? (
                        <span className="text-xs font-medium uppercase tracking-[0.2em] text-amber-700">
                          Active since {formatDateTime(conversation.followUpActiveAt)}
                        </span>
                      ) : null}
                      <form action={resolveConversationFollowUpAction}>
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input type="hidden" name="conversationId" value={conversation.id} />
                        <input type="hidden" name="leadId" value={conversation.leadId ?? ""} />
                        <button
                          type="submit"
                          className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                        >
                          Mark resolved
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {conversation.messages.map((message) => (
                    <div key={message.id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">
                          {message.direction === "INBOUND" ? "Inbound" : "Outbound"}
                        </p>
                        <span className="text-sm text-slate-500">
                          {formatDateTime(message.sentAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{message.body}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Scheduling"
            title="Availability foundation"
            description="Recurring availability windows give future orchestration a simple structure before we build full automation."
          >
            <div className="space-y-3">
              {availability.map((slot) => (
                <div key={slot.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">{slot.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{slot.propertyTitle}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatWeekday(slot.weekday)} / {formatMinuteRange(slot.startMinute, slot.endMinute)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {slot.userName} / {slot.timezone}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Notifications"
            title="Automation and visit feed"
            description="The existing internal feed now highlights both visit events and automation states that require operator follow-up."
          >
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={
                        notification.type === "OPERATOR_ACTION_REQUIRED"
                          ? "Action required"
                          : notification.type === "FOLLOW_UP_RESOLVED"
                            ? "Resolved"
                            : "Visit event"
                      }
                      tone={
                        notification.type === "OPERATOR_ACTION_REQUIRED"
                          ? "warning"
                          : notification.type === "FOLLOW_UP_RESOLVED"
                            ? "success"
                            : "info"
                      }
                    />
                  </div>
                  <p className="font-semibold text-slate-950">{notification.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{notification.body}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-500">
                    <span>{formatDateTime(notification.createdAt)}</span>
                    {notification.link ? (
                      <Link href={notification.link} className="hover:text-brand-600">
                        Open
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>
    </>
  );
}
