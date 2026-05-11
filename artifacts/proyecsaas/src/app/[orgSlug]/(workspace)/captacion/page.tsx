export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getPlatformWhatsAppStatus } from "@/server/whatsapp/platform-channel-status";
import { WhatsAppConnectionForm } from "../settings/integrations/whatsapp/whatsapp-connection-form";

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
    title: "Sitio web y landing pages",
    description:
      "Colocalo como botón principal para que la persona escriba sin fricción y el ingreso quede asociado a tu inmobiliaria.",
  },
] as const;

const flowSteps = [
  "La persona toca el enlace y se abre WhatsApp con un mensaje ya preparado.",
  "Ese mensaje incluye un código de referencia que identifica a tu inmobiliaria.",
  "Cuando el cliente lo envía, el sistema enruta la conversación a tu espacio de trabajo.",
  "La IA responde, registra el lead y deja el contexto listo para que el equipo intervenga cuando haga falta.",
] as const;

export default async function WorkspaceCaptacionPage({
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
      <section className="rounded-[1.75rem] border border-brand-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_4px_rgba(35,86,217,0.15)]" />
              <span className="text-sm font-semibold text-brand-700">Captación Activa</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Captación de Leads
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-500 font-medium">
              Gestioná tus enlaces de entrada y códigos QR para captar prospectos directamente desde WhatsApp.
            </p>
          </div>
        </div>
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
                  label={channelStatus.fullyActive ? "Canal operativo" : "Configuración pendiente"}
                  tone={channelStatus.fullyActive ? "success" : "warning"}
                />
              </div>

              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Esta pantalla no crea un sistema nuevo: expone de forma clara el flujo real que ya
                usa la plataforma para recibir mensajes por WhatsApp, identificar tu inmobiliaria y
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
          />
        </SectionCard>

        <SectionCard
          eyebrow="Recorrido"
          title="Qué pasa cuando una persona entra por este link"
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
          description="Esta capa resuelve el enlace operativo de entrada por WhatsApp. No incluye todavía campañas con tracking por origen, UTMs comerciales ni reportes por canal."
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
