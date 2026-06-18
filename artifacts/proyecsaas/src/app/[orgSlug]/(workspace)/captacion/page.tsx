export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getPlatformWhatsAppStatus } from "@/server/whatsapp/platform-channel-status";
import { WhatsAppConnectionForm } from "../settings/integrations/whatsapp/whatsapp-connection-form";
import { prisma } from "@/server/db/prisma";

const channelIdeas = [
  {
    title: "Facebook e Instagram",
    description:
      "Usa el enlace en anuncios, botones del perfil o publicaciones para llevar la consulta directo a WhatsApp.",
  },
  {
    title: "TikTok y YouTube",
    description:
      "Pegalo en la bio, descripción o comentarios fijados para capturar tráfico desde contenido.",
  },
  {
    title: "Sitio web y páginas de captación",
    description:
      "Colocalo como botón principal para que la persona escriba sin fricción y el ingreso quede asociado a tu inmobiliaria.",
  },
] as const;

const flowSteps = [
  "La persona toca el enlace y se abre WhatsApp con un mensaje ya preparado.",
  "Si usás el canal compartido, incluimos una referencia que identifica a tu inmobiliaria.",
  "Cuando el cliente lo envía, el sistema enruta la conversación a tu espacio de trabajo.",
  "La IA responde, registra el lead y deja el contexto listo para que el equipo intervenga.",
] as const;

export default async function WorkspaceCaptacionPage({
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
      <section className="rounded-[1.75rem] border border-brand-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_4px_rgba(35,86,217,0.15)]" />
              <span className="text-sm font-semibold text-brand-700">Enlaces y QR de Captación</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Enlaces de WhatsApp
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-500 font-medium">
              Aquí encontrás el enlace y código QR para compartir con clientes desde tus redes, anuncios o sitio web. Para <strong>conectar tu número de WhatsApp</strong> al sistema, usá la sección de Integraciones.
            </p>
          </div>
          <Link
            href={`/${orgSlug}/settings/integrations/whatsapp`}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.118 1.528 5.845L0 24l6.335-1.504A11.948 11.948 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.214-3.727.885.939-3.618-.234-.372A9.818 9.818 0 0112 2.182c5.428 0 9.818 4.39 9.818 9.818 0 5.429-4.39 9.818-9.818 9.818z"/></svg>
            Conectar WhatsApp
          </Link>
        </div>

        {tenantChannels.length === 0 && (
          <div className="mt-5 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <span className="mt-0.5 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">Tu número de WhatsApp aún no está conectado</p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Para que el agente IA responda mensajes reales, primero tenés que conectar tu número en{" "}
                <Link href={`/${orgSlug}/settings/integrations/whatsapp`} className="font-bold underline underline-offset-2">
                  Administración → WhatsApp
                </Link>
                . Los links de captación de abajo ya funcionan con el canal compartido de la plataforma.
              </p>
            </div>
            <Link
              href={`/${orgSlug}/settings/integrations/whatsapp`}
              className="shrink-0 rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-800"
            >
              Ir a conectar →
            </Link>
          </div>
        )}

      </section>

      <section className="mt-5 space-y-5">
        <SectionCard
          eyebrow="Captación"
          title="Enlace de entrada para campañas y redes"
          description="Usa este módulo para compartir el acceso principal a WhatsApp desde anuncios, redes sociales o botones de contacto."
        >
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge label="WhatsApp de captación" tone="success" />
                <StatusBadge
                  label={tenantChannels.length > 0 ? "Canal propio activo" : channelStatus.fullyActive ? "Canal compartido activo" : "Configuración pendiente"}
                  tone={tenantChannels.length > 0 || channelStatus.fullyActive ? "success" : "warning"}
                />
              </div>

              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Esta pantalla expone de forma clara el flujo real que usa la plataforma para recibir mensajes por WhatsApp, identificar tu inmobiliaria y
                convertir la consulta en lead dentro del panel.
              </p>

              <div className="grid gap-3 md:grid-cols-3">
                {channelIdeas.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-brand-200 bg-brand-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Qué resuelve
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-brand-900">
                <p>Centraliza el punto de entrada para tráfico desde campañas, perfiles y botones.</p>
                <p>Evita perder contexto porque cada primer mensaje llega identificado para tu inmobiliaria.</p>
                <p>Deja al equipo con un enlace listo para copiar sin pasar por configuraciones técnicas.</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Enlace oficial"
          title="WhatsApp y código QR"
          description="El enlace de abajo es el que conviene compartir cuando querés captar consultas reales desde afuera de la plataforma."
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
          eyebrow="Recorrido"
          title="Qué pasa cuando una persona entra por este enlace"
          description="Resumen corto del flujo real de captación que hoy soporta la plataforma."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {flowSteps.map((step, index) => (
              <article
                key={step}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">{step}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Aclaración"
          title="Alcance real de esta versión"
          description="Esta capa resuelve el enlace operativo de entrada por WhatsApp. No incluye todavía campañas con seguimiento por origen, parámetros de campaña ni reportes por canal."
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Si querés entender mejor cómo responde el sistema una vez que entra la consulta,
              revisá el manual de uso o entrá directo a conversaciones para seguir casos reales.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${orgSlug}/manual-uso`}
                className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Abrir manual
              </Link>
              <Link
                href={`/${orgSlug}/conversations`}
                className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Ver conversaciones
              </Link>
            </div>
          </div>
        </SectionCard>
      </section>
    </>
  );
}
