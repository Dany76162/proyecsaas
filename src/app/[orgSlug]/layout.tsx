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
  const { user, membership } = await requireOrganizationMembership(orgSlug);
  const organization = await getOrganizationWorkspace(orgSlug);

  if (!organization) {
    notFound();
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <WorkspaceSidebar
        organization={organization}
        role={membership.role}
        userName={user.fullName}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-white px-6 shadow-sm">
          <span className="rounded bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
            Panel de Inmobiliaria
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900">{user.fullName}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500">{user.email}</span>
          </div>
        </header>
        <main className="flex-1 min-w-0 px-6 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
