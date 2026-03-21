import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getOrganizationWorkspace(orgSlug);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Workspace slug"
          value={organization.slug}
          hint="Tenant routing is already grounded in the organization slug."
        />
        <MetricCard
          label="Plan"
          value={organization.planLabel}
          hint="Commercial packaging is visible without introducing billing logic yet."
        />
        <MetricCard
          label="Market"
          value={organization.city}
          hint="Useful context for future listing coverage and assignment rules."
        />
      </section>

      <SectionCard
        eyebrow="Organization"
        title="Workspace profile"
        description="Foundational tenant information for the internal product."
      >
        <dl className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5">
            <dt className="text-sm text-slate-500">Organization name</dt>
            <dd className="mt-2 text-lg font-semibold text-slate-950">{organization.name}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <dt className="text-sm text-slate-500">Market focus</dt>
            <dd className="mt-2 text-lg font-semibold text-slate-950">
              {organization.marketFocus}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 md:col-span-2">
            <dt className="text-sm text-slate-500">Workspace description</dt>
            <dd className="mt-2 text-lg font-semibold text-slate-950">
              {organization.description}
            </dd>
          </div>
        </dl>
      </SectionCard>
    </>
  );
}
