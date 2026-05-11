export const dynamic = "force-dynamic";

import Link from "next/link";
import { Bot, MessageSquare, Megaphone, QrCode, ShieldCheck } from "lucide-react";

import { prisma } from "@/server/db/prisma";
import { getPlatformWhatsAppStatus } from "@/server/whatsapp/platform-channel-status";
import { requirePlatformAdmin } from "@/server/auth/access";
import { formatRelativeTime } from "@/components/platform/platform-ui";

import { CaptureLinkActions } from "./CaptureLinkActions";

function getStatusUi(status: "ok" | "warning" | "error") {
  if (status === "ok") {
    return {
      label: "OK",
      card: "border-emerald-200 bg-emerald-50",
      chip: "bg-emerald-100 text-emerald-700",
      text: "text-emerald-900",
    };
  }

  if (status === "error") {
    return {
      label: "ERROR",
      card: "border-red-200 bg-red-50",
      chip: "bg-red-100 text-red-700",
      text: "text-red-900",
    };
  }

  return {
    label: "WARNING",
    card: "border-amber-200 bg-amber-50",
    chip: "bg-amber-100 text-amber-700",
    text: "text-amber-900",
  };
}

export default async function PlatformCaptacionPage() {
  await requirePlatformAdmin();

  const platformOrgId = process.env.WHATSAPP_ORGANIZATION_ID?.trim() || null;
  const channelStatus = await getPlatformWhatsAppStatus();

  const [platformOrg, conversationCount, leadCount, lastConversation] = await Promise.all([
    platformOrgId
      ? prisma.organization.findUnique({
          where: { id: platformOrgId },
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        })
      : Promise.resolve(null),
    platformOrgId
      ? prisma.conversation.count({
          where: { organizationId: platformOrgId },
        })
      : Promise.resolve(0),
    platformOrgId
      ? prisma.lead.count({
          where: { organizationId: platformOrgId },
        })
      : Promise.resolve(0),
    platformOrgId
      ? prisma.conversation.findFirst({
          where: { organizationId: platformOrgId },
          orderBy: { lastMessageAt: "desc" },
          select: {
            lastMessageAt: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const prefilledText =
    "Hola, quiero conocer como funciona Raices Pilot para mi inmobiliaria.";
  const waLink = channelStatus.platformPhone
    ? `https://wa.me/${channelStatus.platformPhone}?text=${encodeURIComponent(prefilledText)}`
    : null;
  const qrUrl = waLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(waLink)}&margin=10`
    : null;

  const channelReady = channelStatus.fullyActive;
  const platformOrgReady = Boolean(platformOrg?.isActive);
  const automationSupported = channelReady && platformOrgReady;

  const stateCards = [
    {
      title: "Canal WhatsApp",
      status: channelReady ? "ok" : channelStatus.platformPhone ? "warning" : "error",
      description: channelReady
        ? "Numero visible y credenciales de Meta listas para recibir mensajes."
        : channelStatus.platformPhone
          ? "El numero esta visible, pero la integracion de Meta todavia no quedo completa."
          : "No hay numero de plataforma configurado para compartir el enlace.",
    },
    {
      title: "Org de plataforma",
      status: platformOrgReady ? "ok" : platformOrgId ? "warning" : "error",
      description: platformOrgReady
        ? `${platformOrg?.name} recibe las conversaciones comerciales de entrada.`
        : platformOrgId
          ? "Hay org configurada en entorno, pero no aparece activa o accesible en base."
          : "Falta WHATSAPP_ORGANIZATION_ID para definir a donde entra la conversacion comercial.",
    },
    {
      title: "Flujo automatizado",
      status: automationSupported ? "ok" : channelReady || platformOrgReady ? "warning" : "error",
      description: automationSupported
        ? "La capa automatizada compartida puede tomar el primer contacto y dejar seguimiento manual en soporte."
        : "El flujo existe de forma parcial, pero no esta listo para operar de punta a punta.",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-violet-950 px-6 py-8 text-white sm:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-100">
                <Megaphone className="h-3.5 w-3.5" />
                Captacion comercial
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Link oficial para captar nuevas inmobiliarias
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
                  Compartilo en grupos, redes, videos o campañas para que una inmobiliaria interesada
                  entre por WhatsApp y tome el primer contacto desde el entorno de plataforma.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">
                Para que sirve
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-100">
                <p>Centraliza el primer contacto comercial para nuevas inmobiliarias interesadas.</p>
                <p>Permite compartir un enlace unico del sistema sin depender de una org cliente.</p>
                <p>Conecta el ingreso con la bandeja de plataforma para seguimiento comercial y soporte.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stateCards.map((item) => {
          const ui = getStatusUi(item.status);
          return (
            <article key={item.title} className={`rounded-2xl border p-5 shadow-sm ${ui.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <h2 className={`text-sm font-bold ${ui.text}`}>{item.title}</h2>
                  <p className={`text-sm leading-6 ${ui.text}`}>{item.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${ui.chip}`}
                >
                  {ui.label}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Enlace y QR
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                Punto de entrada comercial de plataforma
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Este link abre WhatsApp con un mensaje comercial inicial. Si el canal de plataforma
                esta operativo, la conversacion entra al entorno definido por el sistema.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
              <CaptureLinkActions waLink={waLink} qrUrl={qrUrl} />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  QR
                </p>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                  {qrUrl ? (
                    <img src={qrUrl} alt="QR de captacion de plataforma" className="block h-full w-full" />
                  ) : (
                    <div className="flex h-[196px] items-center justify-center rounded-xl bg-slate-50 text-center text-sm text-slate-400">
                      Falta configurar el canal para generar el QR.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Como usarlo
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                Donde conviene compartir este link
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                "Grupos de WhatsApp donde participan inmobiliarias o martilleros.",
                "Facebook e Instagram para campañas, posteos o links en perfil.",
                "TikTok y YouTube para bio, descripcion o comentarios fijados.",
                "Landing comercial o boton principal del sitio institucional.",
              ].map((item) => (
                <article key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Flujo real
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                Que pasa cuando alguien entra
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: MessageSquare,
                  title: "1. Llega el mensaje",
                  copy: "La persona escribe al numero central de plataforma desde el enlace compartido.",
                },
                {
                  icon: Bot,
                  title: "2. Entra a la capa automatizada",
                  copy: "Hoy no existe un agente superadmin separado en UI, pero el ingreso queda soportado por la misma capa automatizada compartida del sistema.",
                },
                {
                  icon: ShieldCheck,
                  title: "3. Queda visible en plataforma",
                  copy: "Las conversaciones del WHATSAPP_ORGANIZATION_ID pueden revisarse desde Atencion a Clientes en /platform/support.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.copy}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Estado operativo
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                Evidencia actual del flujo
              </h2>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Organizacion de plataforma</p>
                <p className="mt-1">{platformOrg ? platformOrg.name : "No encontrada o no configurada"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Conversaciones registradas</p>
                <p className="mt-1">{conversationCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Leads registrados</p>
                <p className="mt-1">{leadCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Ultima actividad</p>
                <p className="mt-1">
                  {lastConversation?.lastMessageAt
                    ? formatRelativeTime(lastConversation.lastMessageAt.toISOString())
                    : "Sin actividad registrada"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/platform/support"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Abrir atencion a clientes
              </Link>
              <Link
                href="/platform/settings"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Revisar configuracion
              </Link>
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6">
        <div className="mb-3 flex items-center gap-2">
          <QrCode className="h-4 w-4 text-amber-700" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Limitaciones reales
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            "No hay tracking por campana, UTM ni atribucion por origen en esta version.",
            "No hay reporting comercial avanzado por fuente ni embudo dedicado de captacion.",
            "No existe una UI separada para entrenar un agente superadmin comercial; el soporte actual es la capa automatizada compartida del sistema.",
            "El seguimiento manual hoy ocurre en Atencion a Clientes, no en un CRM comercial de plataforma dedicado.",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-amber-900">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
