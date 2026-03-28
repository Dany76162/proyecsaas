import type { ReactNode } from "react";

import { MembershipRole } from "@prisma/client";

import { SettingsNav } from "@/components/workspace/settings-nav";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  return (
    <>
      <SettingsNav orgSlug={orgSlug} />
      {children}
    </>
  );
}
