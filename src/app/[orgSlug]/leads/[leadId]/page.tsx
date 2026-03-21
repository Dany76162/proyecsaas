import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { getLeadDetail } from "@/modules/leads/service";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { formatDate } from "@/lib/utils";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; leadId: string }>;
}) {
  const { orgSlug, leadId } = await params;
  const [organization, lead] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    getLeadDetail(orgSlug, leadId),
  ]);

  if (!organization || !lead) {
    notFound();
  }

  return (
    <>
      <section className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge label={lead.status} tone={lead.status === "CLOSED" ? "success" : lead.status === "VISIT" ? "warning" : "info"} />
              <StatusBadge label={lead.interestLabel} />
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {lead.fullName}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {lead.notes}
            </p>
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
        <MetricCard label="Source" value={lead.source} hint="Current acquisition channel." />
        <MetricCard label="Owner" value={lead.ownerName} hint={lead.assignedUserEmail} />
        <MetricCard label="Property" value={lead.propertyTitle} hint={lead.budgetLabel} />
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
                      tone={visit.status === "CONFIRMED" ? "success" : "warning"}
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{formatDate(visit.scheduledAt)}</p>
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
