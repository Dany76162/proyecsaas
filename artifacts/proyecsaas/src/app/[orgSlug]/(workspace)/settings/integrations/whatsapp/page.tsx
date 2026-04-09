export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getPlatformWhatsAppStatus } from "@/server/whatsapp/platform-channel-status";

import { WhatsAppConnectionForm } from "./whatsapp-connection-form";

export default async function WhatsAppIntegrationPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, channelStatus] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    getPlatformWhatsAppStatus(),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <SectionCard
        eyebrow="WhatsApp"
        title="Canal de WhatsApp"
        description="Tu agente de IA responde mensajes de WhatsApp automáticamente. Compartí tu enlace o código QR y empezá a recibir consultas."
      >
        <WhatsAppConnectionForm
          orgSlug={orgSlug}
          orgName={organization.name}
          platformPhone={channelStatus.platformPhone}
          metaStatus={channelStatus.metaStatus}
        />
      </SectionCard>
    </>
  );
}
