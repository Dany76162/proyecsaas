export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { WhatsAppTestPanel } from "@/components/onboarding/whatsapp-test-panel";

export default async function OnboardingTestPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireOrganizationMembership(orgSlug);

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true,
      deletedAt: true,
      whatsappChannels: {
        where: { status: "ACTIVE" },
        select: { displayPhoneNumber: true },
        orderBy: { isPrimary: "desc" },
        take: 1,
      },
      _count: { select: { conversations: true } },
    },
  });

  if (!org || org.deletedAt) {
    notFound();
  }

  const displayPhoneNumber = org.whatsappChannels[0]?.displayPhoneNumber ?? null;

  return (
    <div className="mt-3 max-w-3xl pb-20">
      <WhatsAppTestPanel
        orgSlug={orgSlug}
        displayPhoneNumber={displayPhoneNumber}
        initialHasConversation={org._count.conversations > 0}
      />
    </div>
  );
}
