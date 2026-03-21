import Link from "next/link";
import { notFound } from "next/navigation";

import { LeadMiniCard } from "@/components/workspace/lead-mini-card";
import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StageColumn } from "@/components/workspace/stage-column";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
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
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, leads, summary] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationLeads(orgSlug),
    getLeadSummary(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />

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
                    <Link href={`/${orgSlug}/leads/${lead.id}`} className="font-semibold text-slate-950 hover:text-brand-600">
                      {lead.fullName}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">{lead.email}</p>
                  </td>
                  <td className="py-4 text-sm text-slate-600">
                    {lead.propertyId ? (
                      <Link href={`/${orgSlug}/properties/${lead.propertyId}`} className="hover:text-brand-600">
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
                      tone={lead.status === "CLOSED" ? "success" : lead.status === "VISIT" ? "warning" : "info"}
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
