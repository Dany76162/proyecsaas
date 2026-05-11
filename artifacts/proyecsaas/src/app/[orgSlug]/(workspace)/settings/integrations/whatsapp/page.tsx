export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
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
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
              <span className="text-sm font-semibold text-emerald-700">Canal Oficial</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              WhatsApp
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-500 font-medium">
              Gestioná la conexión de WhatsApp de tu inmobiliaria y configurá tu enlace de entrada.
            </p>
          </div>
        </div>
      </section>

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
