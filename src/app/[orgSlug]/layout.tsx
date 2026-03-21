import { notFound } from "next/navigation";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { getOrganizationWorkspace } from "@/modules/organizations/service";

export default async function OrganizationLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}>) {
  const { orgSlug } = await params;
  const organization = await getOrganizationWorkspace(orgSlug);

  if (!organization) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[280px_1fr] lg:px-6 lg:py-6">
        <WorkspaceSidebar organization={organization} />
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
