export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { PlanEditorPro } from "@/components/masterplan/plan-editor-pro";

interface PageProps {
  params: Promise<{ orgSlug: string; developmentId: string }>;
}

export default async function PlanEditorPage({ params }: PageProps) {
  const { orgSlug, developmentId } = await params;
  const { membership } = await requireOrganizationMembership(orgSlug);

  const development = await prisma.development.findFirst({
    where: { id: developmentId, organizationId: membership.organization.id },
    select: {
      id: true,
      name: true,
      masterplanSVG: true,
      DevelopmentLot: { select: { id: true, status: true, pathData: true } },
    },
  });

  if (!development) notFound();

  return (
    <PlanEditorPro
      orgSlug={orgSlug}
      developmentId={development.id}
      developmentName={development.name}
      masterplanSVG={development.masterplanSVG}
      lots={development.DevelopmentLot}
    />
  );
}
