import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { confirmLeadPropertyAction, updateLeadAction } from "@/modules/leads/actions";
import { getLeadDetail } from "@/modules/leads/service";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { listOrganizationProperties } from "@/modules/properties/service";
import { createVisitAction } from "@/modules/visits/actions";
import { formatDate, formatDateTime } from "@/lib/utils";

const leadStageOptions = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "VISIT",
  "CLOSED",
] as const;

function getTemperatureTone(temperature: "hot" | "warm" | "cold" | "unclear") {
  if (temperature === "hot") {
    return "warning" as const;
  }

  if (temperature === "warm") {
    return "info" as const;
  }

  return "neutral" as const;
}

function getFollowUpLabel(category: "TECHNICAL" | "COMMERCIAL" | null) {
  if (category === "TECHNICAL") {
    return "Delivery issue";
  }

  if (category === "COMMERCIAL") {
    return "Commercial follow-up";
  }

  return "Operator follow-up";
}

function getPropertyMatchLabel(
  status:
    | "matched"
    | "existing-link"
    | "manual-confirmed"
    | "manual-overridden"
    | "no-match",
) {
  if (status === "matched") {
    return "Auto-matched";
  }

  if (status === "existing-link") {
    return "Existing link";
  }

  if (status === "manual-confirmed") {
    return "Confirmed manually";
  }

  if (status === "manual-overridden") {
    return "Changed manually";
  }

  return "Needs manual review";
}

function getPropertyMatchTone(
  status:
    | "matched"
    | "existing-link"
    | "manual-confirmed"
    | "manual-overridden"
    | "no-match",
) {
  if (status === "matched") {
    return "success" as const;
  }

  if (status === "existing-link" || status === "manual-confirmed") {
    return "info" as const;
  }

  return "neutral" as const;
}

function formatNextBestAction(action: string | null) {
  if (!action) {
    return null;
  }

  return action
    .split("-")
    .join(" ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getDeliveryStatusTone(status: "RECEIVED" | "PENDING" | "SENT" | "FAILED" | "SKIPPED") {
  if (status === "SENT" || status === "RECEIVED") {
    return "success" as const;
  }

  if (status === "FAILED") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getVisitStatusTone(status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELED") {
  if (status === "CONFIRMED" || status === "COMPLETED") {
    return "success" as const;
  }

  if (status === "CANCELED") {
    return "neutral" as const;
  }

  return "warning" as const;
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; leadId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { orgSlug, leadId } = await params;
  const { success, error } = await searchParams;
  const [organization, lead, properties] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    getLeadDetail(orgSlug, leadId),
    listOrganizationProperties(orgSlug),
  ]);

  if (!organization || !lead) {
    notFound();
  }

  const nextVisit = [...lead.visits]
    .sort(
      (left, right) =>
        new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
    )
    .find((visit) => new Date(visit.scheduledAt).getTime() >= Date.now());

  const successMessage =
    success === "lead-created"
      ? "Lead created successfully."
      : success === "lead-updated"
        ? "Lead updated successfully."
        : success === "visit-created"
          ? "Visit scheduled successfully."
          : null;

  const errorMessage =
    error === "missing-property"
      ? "Assign a property before creating a visit."
      : error === "invalid-visit"
        ? "Enter a valid visit date and status."
        : error === "property-unavailable"
          ? "The selected property is no longer available for this lead."
          : error === "missing-owner"
            ? "No assigned user is available to create this visit."
            : error === "visit-create-failed"
              ? "The visit could not be created. Please try again."
              : null;

  return (
    <>
      {successMessage ? (
        <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 shadow-soft">
          {successMessage}
        </section>
      ) : null}
      {errorMessage ? (
        <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800 shadow-soft">
          {errorMessage}
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                label={lead.status}
                tone={
                  lead.status === "CLOSED"
                    ? "success"
                    : lead.status === "VISIT"
                      ? "warning"
                      : "info"
                }
              />
              <StatusBadge
                label={lead.leadTemperature}
                tone={getTemperatureTone(lead.leadTemperature)}
              />
              <StatusBadge label={lead.interestLabel} />
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {lead.fullName}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{lead.notes}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {lead.propertyId ? (
              <Link
                href={`/${orgSlug}/properties/${lead.propertyId}`}
                className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Open related property
              </Link>
            ) : null}
            <Link
              href={`/${orgSlug}/visits`}
              className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Open visit schedule
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Phone" value={lead.phone} hint="Primary direct contact." />
        <MetricCard label="Email" value={lead.email || "No email"} hint="Primary email contact." />
        <MetricCard label="Owner" value={lead.ownerName} hint={lead.assignedUserEmail} />
        <MetricCard
          label="Next visit"
          value={nextVisit ? formatDateTime(nextVisit.scheduledAt) : "Not scheduled"}
          hint={nextVisit ? nextVisit.propertyTitle : "Create a visit from this lead to plan the next step."}
        />
      </section>

      {lead.extractedPreferences.budget ||
      lead.extractedPreferences.zones.length ||
      lead.extractedPreferences.rooms ||
      lead.extractedPreferences.purpose ? (
        <SectionCard
          eyebrow="Commercial signals"
          title="Detected preferences"
          description="Lightweight AI-read context for the assigned agent. Empty values stay hidden."
        >
          <div className="flex flex-wrap gap-2">
            {lead.extractedPreferences.budget ? (
              <StatusBadge label={`Budget: ${lead.extractedPreferences.budget}`} tone="info" />
            ) : null}
            {lead.extractedPreferences.zones.map((zone) => (
              <StatusBadge key={zone} label={`Zone: ${zone}`} tone="neutral" />
            ))}
            {lead.extractedPreferences.rooms ? (
              <StatusBadge label={`Rooms: ${lead.extractedPreferences.rooms}`} tone="neutral" />
            ) : null}
            {lead.extractedPreferences.purpose ? (
              <StatusBadge
                label={`Purpose: ${lead.extractedPreferences.purpose}`}
                tone="neutral"
              />
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {lead.propertyMatch ? (
        <SectionCard
          eyebrow="Inventory match"
          title="Property linkage context"
          description="A lightweight trace of how the workspace kept or assigned the property for this lead."
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={getPropertyMatchLabel(lead.propertyMatch.status)}
              tone={getPropertyMatchTone(lead.propertyMatch.status)}
            />
            {lead.propertyMatch.score !== null ? (
              <StatusBadge label={`Score: ${lead.propertyMatch.score}`} tone="neutral" />
            ) : null}
            {lead.propertyMatch.consideredSignals.map((signal) => (
              <StatusBadge key={signal} label={`Signal: ${signal}`} tone="neutral" />
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">
              {lead.propertyMatch.propertyId && lead.propertyTitle !== "No property linked yet"
                ? lead.propertyTitle
                : "No property assigned automatically"}
            </p>
            {lead.propertyMatch.propertyId ? (
              <Link
                href={`/${orgSlug}/properties/${lead.propertyMatch.propertyId}`}
                className="mt-2 inline-flex rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Open matched property
              </Link>
            ) : null}
          </div>

          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
            {lead.propertyMatch.reasons.map((reason) => (
              <li key={reason} className="rounded-2xl border border-slate-200 px-4 py-3">
                {reason}
              </li>
            ))}
          </ul>

          {lead.propertyMatch.shortlist.length ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-slate-950">
                Suggested properties for manual review
              </p>
              {lead.propertyMatch.shortlist.map((candidate) => (
                <article
                  key={candidate.propertyId}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{candidate.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {[candidate.neighborhood, candidate.city].filter(Boolean).join(" / ") ||
                          "Location pending"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge label={`Score: ${candidate.score}`} tone="neutral" />
                      {candidate.propertyType ? (
                        <StatusBadge label={candidate.propertyType} tone="neutral" />
                      ) : null}
                      {candidate.bedrooms ? (
                        <StatusBadge label={`${candidate.bedrooms} br`} tone="neutral" />
                      ) : null}
                    </div>
                  </div>

                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {candidate.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/${orgSlug}/properties/${candidate.propertyId}`}
                      className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Open property
                    </Link>
                    <form action={confirmLeadPropertyAction}>
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="leadId" value={lead.id} />
                      <input type="hidden" name="propertyId" value={candidate.propertyId} />
                      <button
                        type="submit"
                        className="rounded-full bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
                      >
                        {lead.propertyId === candidate.propertyId
                          ? "Keep this property"
                          : lead.propertyId
                            ? "Use this instead"
                            : "Confirm this property"}
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {lead.nextBestAction || lead.automationSummary ? (
        <SectionCard
          eyebrow="Automation guidance"
          title="Recommended next step"
          description="A concise operational read of what the workflow thinks should happen next."
        >
          <div className="flex flex-wrap items-center gap-2">
            {lead.nextBestAction ? (
              <StatusBadge
                label={formatNextBestAction(lead.nextBestAction) ?? "Suggested action"}
                tone="info"
              />
            ) : null}
            {lead.requiresFollowUp ? (
              <StatusBadge
                label={getFollowUpLabel(lead.followUpCategory)}
                tone="warning"
              />
            ) : null}
          </div>
          {lead.automationSummary ? (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              {lead.automationSummary}
            </p>
          ) : null}
        </SectionCard>
      ) : null}

      {lead.requiresFollowUp && lead.followUpReason ? (
        <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-soft">
          <p className="font-semibold">{getFollowUpLabel(lead.followUpCategory)} recommended</p>
          <p className="mt-1 leading-6">{lead.followUpReason}</p>
        </section>
      ) : null}

      {lead.conversationContext ? (
        <SectionCard
          eyebrow="Conversation"
          title="WhatsApp context"
          description="The assigned agent can review the latest bot-assisted thread here without leaving the lead."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-950">
                {lead.conversationContext.subject}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {lead.conversationContext.participantName}
                {" / "}
                {lead.conversationContext.participantPhone}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={lead.conversationContext.status} />
              {lead.conversationContext.followUpActive ? (
                <StatusBadge
                  label={getFollowUpLabel(lead.conversationContext.followUpCategory)}
                  tone="warning"
                />
              ) : null}
              <Link
                href={`/${orgSlug}/conversations`}
                className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Open full inbox
              </Link>
            </div>
          </div>

          {lead.conversationContext.followUpActive && lead.conversationContext.followUpReason ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {lead.conversationContext.followUpReason}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {lead.conversationContext.messages.length ? (
              lead.conversationContext.messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-2xl px-4 py-3 ${
                    message.direction === "OUTBOUND"
                      ? "ml-auto border border-brand-200 bg-brand-50"
                      : "mr-auto border border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{message.senderName}</p>
                    <StatusBadge label={message.direction} tone="neutral" />
                    {message.direction === "OUTBOUND" ? (
                      <StatusBadge
                        label={message.deliveryStatus}
                        tone={getDeliveryStatusTone(message.deliveryStatus)}
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{message.body}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(message.sentAt)}</p>
                  {message.direction === "OUTBOUND" && message.deliveryError ? (
                    <p className="mt-2 text-xs font-medium text-rose-600">{message.deliveryError}</p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-500">No WhatsApp messages stored yet for this lead.</p>
            )}
          </div>
        </SectionCard>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Edit"
          title="Lead details"
          description="Minimal practical controls so an agent can keep the lead moving."
        >
          <form action={updateLeadAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="leadId" value={leadId} />

            <label className="space-y-2 text-sm text-slate-600">
              <span>Name</span>
              <input
                name="fullName"
                required
                defaultValue={lead.fullName}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Phone</span>
              <input
                name="phone"
                required
                defaultValue={lead.phone}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Email</span>
              <input
                name="email"
                type="email"
                defaultValue={lead.email}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Status</span>
              <select
                name="status"
                defaultValue={lead.status}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              >
                {leadStageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
              <span>Related property</span>
              <select
                name="propertyId"
                defaultValue={lead.propertyId ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              >
                <option value="">No property assigned</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Save Lead
              </button>
              <a
                href={`tel:${lead.phone}`}
                className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Call Lead
              </a>
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Email Lead
                </a>
              ) : null}
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Visits"
          title="Add visit"
          description="Create a visit in context without leaving the lead."
        >
          <form action={createVisitAction} className="space-y-4">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="leadId" value={leadId} />
            <label className="space-y-2 text-sm text-slate-600 block">
              <span>Date and time</span>
              <input
                name="scheduledAt"
                type="datetime-local"
                required
                min={new Date().toISOString().slice(0, 16)}
                step={900}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600 block">
              <span>Status</span>
              <select
                name="status"
                defaultValue="PENDING"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              >
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={!lead.propertyId}
              className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              + Add Visit
            </button>
            {!lead.propertyId ? (
              <p className="text-sm text-slate-500">
                Assign a property first so the visit is linked correctly.
              </p>
            ) : null}
          </form>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="Activity"
          title="Lead history"
          description="Simple placeholder history so the CRM already feels timeline-oriented."
        >
          <div className="space-y-4">
            {lead.activity.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <span className="text-sm text-slate-500">{formatDate(item.happenedAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Visits"
          title="Scheduled visits"
          description="Visits are now directly attached to the lead and the selected property."
        >
          <div className="space-y-4">
            {lead.visits.length ? (
              lead.visits.map((visit) => (
                <div key={visit.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{visit.propertyTitle}</p>
                    <StatusBadge
                      label={visit.status}
                      tone={getVisitStatusTone(visit.status)}
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatDateTime(visit.scheduledAt)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{visit.notes}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No visits scheduled yet.</p>
            )}
          </div>
        </SectionCard>
      </section>
    </>
  );
}
