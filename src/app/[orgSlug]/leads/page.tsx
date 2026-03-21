import Link from "next/link";
import { notFound } from "next/navigation";

import { LeadMiniCard } from "@/components/workspace/lead-mini-card";
import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StageColumn } from "@/components/workspace/stage-column";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { createLeadAction } from "@/modules/leads/actions";
import { getLeadSummary, listOrganizationLeads } from "@/modules/leads/service";
import type { LeadStage } from "@/modules/leads/types";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { formatDate } from "@/lib/utils";

const stageOrder: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "VISIT",
  "CLOSED",
];

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { orgSlug } = await params;
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const [organization, allLeads, summary] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationLeads(orgSlug),
    getLeadSummary(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  const leads = query
    ? allLeads.filter((lead) =>
        [lead.fullName, lead.phone, lead.email].some((value) =>
          value.toLowerCase().includes(query),
        ),
      )
    : allLeads;

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="Action"
          title="New lead"
          description="Fast manual capture for agents working the pipeline in real time."
        >
          <form action={createLeadAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <label className="space-y-2 text-sm text-slate-600">
              <span>Name</span>
              <input
                name="fullName"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
                placeholder="Lead full name"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>Phone</span>
              <input
                name="phone"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
                placeholder="+54 11 ..."
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
              <span>Email (optional)</span>
              <input
                name="email"
                type="email"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
                placeholder="lead@example.com"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                New Lead
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Search"
          title="Find leads quickly"
          description="Filter by name, phone, or email without leaving the list."
        >
          <form className="space-y-3">
            <input
              name="q"
              defaultValue={q}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              placeholder="Search name, phone, or email"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Search
              </button>
              {q ? (
                <Link
                  href={`/${orgSlug}/leads`}
                  className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
          <p className="mt-4 text-sm text-slate-500">
            Showing {leads.length} of {allLeads.length} leads.
          </p>
        </SectionCard>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <MetricCard label="New" value={String(summary.newCount)} hint="Fresh inbound demand." />
        <MetricCard
          label="Contacted"
          value={String(summary.contactedCount)}
          hint="Initial outreach is underway."
        />
        <MetricCard
          label="Interested"
          value={String(summary.interestedCount)}
          hint="Qualified enough to match with inventory."
        />
        <MetricCard
          label="Visit"
          value={String(summary.visitCount)}
          hint="Already moved into scheduling."
        />
        <MetricCard
          label="Closed"
          value={String(summary.closedCount)}
          hint="Commercial cycle completed."
        />
      </section>

      <SectionCard
        eyebrow="Pipeline"
        title="Lead CRM flow"
        description="The pipeline now mirrors the real commercial progression from inbound demand to visit and closure."
      >
        <div className="grid gap-4 xl:grid-cols-5">
          {stageOrder.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.status === stage);

            return (
              <StageColumn key={stage} title={stage.replaceAll("_", " ")} count={stageLeads.length}>
                {stageLeads.map((lead) => (
                  <LeadMiniCard
                    key={lead.id}
                    href={`/${orgSlug}/leads/${lead.id}`}
                    fullName={lead.fullName}
                    interestLabel={lead.interestLabel}
                    ownerName={lead.ownerName}
                    propertyTitle={lead.propertyTitle}
                    stageLabel={lead.status}
                  />
                ))}
              </StageColumn>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="List"
        title="Lead register"
        description="A tabular operational view remains useful alongside the pipeline."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="text-sm text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Lead</th>
                <th className="pb-3 font-medium">Property</th>
                <th className="pb-3 font-medium">Owner</th>
                <th className="pb-3 font-medium">Source</th>
                <th className="pb-3 font-medium">Stage</th>
                <th className="pb-3 font-medium">Last contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="py-4">
                    <Link
                      href={`/${orgSlug}/leads/${lead.id}`}
                      className="font-semibold text-slate-950 hover:text-brand-600"
                    >
                      {lead.fullName}
                    </Link>
                    <div className="mt-1 text-sm text-slate-500">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="hover:text-brand-600">
                          {lead.email}
                        </a>
                      ) : (
                        <span>No email</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      <a href={`tel:${lead.phone}`} className="hover:text-brand-600">
                        {lead.phone}
                      </a>
                    </div>
                  </td>
                  <td className="py-4 text-sm text-slate-600">
                    {lead.propertyId ? (
                      <Link
                        href={`/${orgSlug}/properties/${lead.propertyId}`}
                        className="hover:text-brand-600"
                      >
                        {lead.propertyTitle}
                      </Link>
                    ) : (
                      lead.propertyTitle
                    )}
                  </td>
                  <td className="py-4 text-sm text-slate-600">{lead.ownerName}</td>
                  <td className="py-4 text-sm text-slate-600">{lead.source}</td>
                  <td className="py-4">
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
                  </td>
                  <td className="py-4 text-sm text-slate-600">
                    {formatDate(lead.lastContactAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
