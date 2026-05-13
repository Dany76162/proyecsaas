export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getPlatformWhatsAppStatus } from "@/server/whatsapp/platform-channel-status";

import { WhatsAppConnectionForm } from "./whatsapp-connection-form";
import { RequestConnectionForm } from "./request-connection-form";
import { prisma } from "@/server/db/prisma";

export default async function WhatsAppIntegrationPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, channelStatus, tenantChannels, connectionRequests] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    getPlatformWhatsAppStatus(),
    prisma.whatsAppChannel.findMany({
      where: { organization: { slug: orgSlug }, isActive: true }
    }),
    prisma.whatsAppChannelConnectionRequest.findMany({
      where: { organization: { slug: orgSlug } },
      orderBy: { createdAt: "desc" }
    })
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
        eyebrow="Configuración"
        title="Estado actual de Captación"
        description="Aquí podés ver y copiar tu enlace principal de WhatsApp. Si tenés un número propio activo, lo usaremos automáticamente."
      >
        <WhatsAppConnectionForm
          orgSlug={orgSlug}
          orgName={organization.name}
          platformPhone={channelStatus.platformPhone}
          metaStatus={channelStatus.metaStatus}
          tenantChannels={tenantChannels}
          connectionRequests={connectionRequests}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Personalización"
        title="Tu propio número de WhatsApp Business"
        description="Conectá el número oficial de tu inmobiliaria para que los agentes respondan desde tu marca. Requiere cuenta de Meta Business."
      >
        <div className="space-y-8">
          {tenantChannels.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {tenantChannels.map((ch: any) => (
                <div key={ch.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{ch.verifiedDisplayName || ch.name}</p>
                      <p className="text-sm text-slate-500">{ch.displayPhoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {ch.isPrimary && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Principal</span>}
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">{ch.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <p className="text-sm text-slate-500 text-center font-medium">
                No tenés números propios conectados. Al conectar uno, tus agentes podrán usarlo en lugar del número de la plataforma.
              </p>
            </div>
          )}

          {connectionRequests.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Solicitudes enviadas</h4>
              {connectionRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{req.requestedPhoneNumber}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{req.businessName}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 mb-4">¿Querés conectar tu propio número?</h4>
            <RequestConnectionForm orgSlug={orgSlug} />
          </div>
        </div>
      </SectionCard>
    </>
  );
}
