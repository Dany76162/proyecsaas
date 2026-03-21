import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getUserRoleBreakdown, listOrganizationUsers } from "@/modules/users/service";

export default async function UsersSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, users, roleBreakdown] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationUsers(orgSlug),
    getUserRoleBreakdown(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Members"
          value={String(users.length)}
          hint="People with organization-scoped access to this workspace."
        />
        <MetricCard
          label="Active roles"
          value={String(roleBreakdown.length)}
          hint="Clear role visibility helps keep future authorization explicit."
        />
        <MetricCard
          label="Owners/Admins"
          value={String(roleBreakdown.filter((item) => item.role !== "ASSISTANT" && item.role !== "AGENT").reduce((sum, item) => sum + item.count, 0))}
          hint="Leadership roles currently represented in the tenant."
        />
      </section>

      <SectionCard
        eyebrow="Team"
        title="Users and roles"
        description="This is the first internal member directory for the MVP."
      >
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 p-5 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-lg font-semibold text-slate-950">{user.fullName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {user.jobTitle} • {user.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={user.isActive ? "Active" : "Inactive"} tone="success" />
                <StatusBadge label={user.role} tone="info" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
