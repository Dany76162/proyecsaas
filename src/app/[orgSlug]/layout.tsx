import { notFound } from "next/navigation";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { requireOrganizationMembership } from "@/server/auth/access";

export default async function OrganizationLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}>) {
  const { orgSlug } = await params;
  const { membership } = await requireOrganizationMembership(orgSlug);
  const organization = await getOrganizationWorkspace(orgSlug);

  if (!organization) {
    notFound();
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <WorkspaceSidebar organization={organization} role={membership.role} />
      <main className="flex-1 min-w-0 px-6 py-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
