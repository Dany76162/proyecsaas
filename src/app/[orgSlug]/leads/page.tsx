import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getLeadSummary, listOrganizationLeads } from "@/modules/leads/service";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { formatDate } from "@/lib/utils";

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

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Pipeline size"
          value={String(summary.total)}
          hint="Initial CRM volume currently visible in the workspace."
        />
        <MetricCard
          label="New leads"
          value={String(summary.newCount)}
          hint="Inbound demand that still needs first response."
        />
        <MetricCard
          label="Qualified leads"
          value={String(summary.qualifiedCount)}
          hint="Ready for stronger commercial follow-up and property matching."
        />
      </section>

      <SectionCard
        eyebrow="Lead list"
        title="Tenant pipeline"
        description="This is the first real operational view for the CRM foundation."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="text-sm text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Lead</th>
                <th className="pb-3 font-medium">Interest</th>
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
                    <p className="font-semibold text-slate-950">{lead.fullName}</p>
                    <p className="mt-1 text-sm text-slate-500">{lead.email}</p>
                  </td>
                  <td className="py-4 text-sm text-slate-600">
                    <p>{lead.interestLabel}</p>
                    <p className="mt-1 text-slate-500">{lead.budgetLabel}</p>
                  </td>
                  <td className="py-4 text-sm text-slate-600">{lead.ownerName}</td>
                  <td className="py-4 text-sm text-slate-600">{lead.source}</td>
                  <td className="py-4">
                    <StatusBadge
                      label={lead.status.replaceAll("_", " ")}
                      tone={lead.status === "QUALIFIED" ? "success" : "info"}
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
