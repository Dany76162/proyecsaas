import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getVisitSummary, listOrganizationVisits } from "@/modules/visits/service";
import { prisma } from "@/server/db/prisma";
import { formatDate } from "@/lib/utils";

export default async function VisitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgSlug } = await params;
  const view = (await searchParams).tab === "all" ? "all" : "upcoming";

  const [organization, visits, summary] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationVisits(prisma, orgSlug, view),
    getVisitSummary(prisma, orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="All visits" value={String(summary.total)} hint="Current scheduled operational visits." />
        <MetricCard label="Pending" value={String(summary.pendingCount)} hint="Awaiting final confirmation." />
        <MetricCard label="Confirmed" value={String(summary.confirmedCount)} hint="Ready to execute." />
        <MetricCard label="Completed" value={String(summary.completedCount)} hint="Finished and ready for follow-up." />
      </section>

      <SectionCard
        eyebrow="Schedule"
        title="Visit board"
        description="Lean scheduling surface focused on clarity, not a full calendar engine."
      >
        <nav className="mb-5 flex gap-4 border-b border-slate-200 pb-4">
          <Link
            href={`/${orgSlug}/visits`}
            className={
              view === "upcoming"
                ? "text-sm font-semibold text-brand-600"
                : "text-sm font-medium text-slate-500 hover:text-slate-700"
            }
          >
            Upcoming
          </Link>
          <Link
            href={`/${orgSlug}/visits?tab=all`}
            className={
              view === "all"
                ? "text-sm font-semibold text-brand-600"
                : "text-sm font-medium text-slate-500 hover:text-slate-700"
            }
          >
            All visits
          </Link>
        </nav>

        <div className="space-y-4">
          {visits.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              {view === "upcoming"
                ? 'No pending or confirmed visits. Use "All visits" to see history.'
                : "No visits recorded yet."}
            </p>
          ) : (
            visits.map((visit) => (
              <article
                key={visit.id}
                className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-lg font-semibold text-slate-950">{visit.leadName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    <Link href={`/${orgSlug}/properties/${visit.propertyId}`} className="hover:text-brand-600">
                      {visit.propertyTitle}
                    </Link>
                    {" / "}
                    <Link href={`/${orgSlug}/leads/${visit.leadId}`} className="hover:text-brand-600">
                      Lead detail
                    </Link>
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{visit.notes}</p>
                </div>

                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <StatusBadge
                    label={visit.status}
                    tone={visit.status === "CONFIRMED" ? "success" : "warning"}
                  />
                  <p className="text-sm text-slate-500">{formatDate(visit.scheduledAt)}</p>
                  <p className="text-sm text-slate-500">{visit.ownerName}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </SectionCard>
    </>
  );
}
