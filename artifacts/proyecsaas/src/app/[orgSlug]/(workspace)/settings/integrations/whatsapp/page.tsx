import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { prisma } from "@/server/db/prisma";

import { WhatsAppConnectionForm } from "./whatsapp-connection-form";

export default async function WhatsAppIntegrationPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getOrganizationWorkspace(orgSlug);

  if (!organization) {
    notFound();
  }

  const connectedChannel = await prisma.whatsAppChannel.findFirst({
    where: {
      organizationId: organization.id,
      provider: "WHATSAPP_CLOUD",
    },
    orderBy: [{ status: "asc" }, { isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      phoneNumberId: true,
      displayPhoneNumber: true,
      verifiedDisplayName: true,
      status: true,
    },
  });

  const webhookBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "Set NEXT_PUBLIC_APP_URL in runtime";
  const verifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || "Set WHATSAPP_WEBHOOK_VERIFY_TOKEN";

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <SectionCard
        eyebrow="WhatsApp"
        title="Connect your number"
        description="Link your WhatsApp Business number (via Meta Cloud API) to start receiving inbound messages and automating lead responses."
      >
        <WhatsAppConnectionForm
          orgSlug={orgSlug}
          defaultPhoneNumberId={connectedChannel?.phoneNumberId ?? ""}
          webhookUrl={`${webhookBaseUrl.replace(/\/$/, "")}/api/webhooks/whatsapp`}
          verifyToken={verifyToken}
          channelStatus={{
            isConnected: connectedChannel?.status === "ACTIVE",
            phoneNumberId: connectedChannel?.phoneNumberId ?? null,
            displayPhoneNumber: connectedChannel?.displayPhoneNumber ?? null,
            verifiedDisplayName: connectedChannel?.verifiedDisplayName ?? null,
            statusLabel: connectedChannel?.status === "ACTIVE" ? "Connected" : "Not connected",
          }}
        />
      </SectionCard>
    </>
  );
}
