export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
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
    <WorkspaceShell
      organization={organization}
      role={membership.role}
      userName={user.fullName}
      userEmail={user.email}
    >
      {children}
    </WorkspaceShell>
  );
}
