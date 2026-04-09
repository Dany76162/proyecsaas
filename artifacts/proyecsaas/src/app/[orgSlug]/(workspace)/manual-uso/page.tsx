export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { PrintManualButton } from "./PrintManualButton";

const systemSteps = [
  {
    step: "1",
    title: "Llega el mensaje",
    description:
      "Una consulta entra por WhatsApp y la plataforma la registra dentro de la inmobiliaria.",
  },
  {
    step: "2",
    title: "La IA responde",
    description:
      "El agente contesta de forma inicial, sostiene la conversación y reúne información útil.",
  },
  {
    step: "3",
    title: "Se clasifica el lead",
    description:
      "El sistema identifica interés, contexto y prioridad para que el equipo actúe mejor.",
  },
  {
    step: "4",
    title: "Interviene una persona",
    description:
      "Cuando aparece una oportunidad real, el equipo toma el control para cerrar visita u operación.",
  },
] as const;

const leadChecklist = [
  "Revisar la conversación y entender qué pidió el cliente.",
  "Identificar si busca una propiedad puntual, información general o una visita.",
  "Responder manualmente solo si hace falta destrabar la conversación.",
  "Llevar el contacto hacia una visita o siguiente paso concreto.",
] as const;

const commonErrors = [
  "No llegan mensajes: revisar integraciones de WhatsApp y estado del canal.",
  "La IA no responde: validar que el canal y el agente estén activos.",
  "No veo leads: revisar conversaciones recientes y filtros del panel.",
] as const;

const bestPractices = [
  "Responder rápido cuando el cliente ya está listo para avanzar.",
  "No interrumpir la automatización si la conversación todavía avanza bien sola.",
  "Revisar todos los días los leads activos y las conversaciones abiertas.",
] as const;

const captureChannels = [
  "Facebook Ads e Instagram para llevar tráfico directo a WhatsApp.",
  "TikTok, YouTube o perfiles sociales donde necesitás un solo punto de entrada.",
  "Botones del sitio web o landing pages para que la consulta llegue ya identificada.",
] as const;

const interventionCases = [
  {
    title: "Cuando pide una visita",
    copy: "Tomá el control para coordinar disponibilidad, confirmar horario y avanzar a la visita.",
    tone: "success" as const,
  },
  {
    title: "Cuando tiene dudas importantes",
    copy: "Intervení si hay objeciones, preguntas comerciales o definiciones que la IA no debe cerrar sola.",
    tone: "warning" as const,
  },
  {
    title: "Cuando el cliente está frío",
    copy: "Dejá primero que la IA sostenga la conversación; intervení solo si hace falta reactivar interés.",
    tone: "info" as const,
  },
] as const;

export default async function WorkspaceManualUsoPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getOrganizationWorkspace(orgSlug);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <div className="print:hidden">
        <WorkspaceHeader organization={organization}>
          <Link
            href={`/${orgSlug}/conversations`}
            className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 print:hidden"
          >
            Ver conversaciones
          </Link>
        </WorkspaceHeader>
      </div>

      <section className="mx-auto mt-5 max-w-5xl space-y-6 print:mt-0 print:max-w-none print:space-y-4">
        <div className="[break-inside:avoid] [page-break-inside:avoid]">
          <SectionCard
            eyebrow="Guía práctica"
            title="Cómo usar Raíces Pilot"
            description="Guía práctica para convertir consultas en visitas y ventas."
          >
            <div className="mb-5 flex justify-end">
              <PrintManualButton />
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 print:border-slate-300 print:bg-white">
              <div className="grid gap-5 p-6 lg:grid-cols-[1.3fr_0.9fr] print:grid-cols-1 print:gap-4 print:p-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 print:hidden">
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-200">
                      Manual oficial de uso
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-200">
                      Operación inmobiliaria
                    </span>
                  </div>
                  <p className="max-w-2xl text-base leading-7 text-slate-100 print:text-slate-700">
                    Este manual está pensado para que cualquier persona de la inmobiliaria pueda operar
                    la plataforma sin depender de soporte constante. La idea es simple: entender qué hace
                    el sistema, cuándo intervenir y cómo transformar conversaciones en oportunidades reales.
                  </p>
                  <div className="flex flex-wrap gap-2 print:hidden">
                    <StatusBadge label="Uso diario" tone="info" />
                    <StatusBadge label="Operación comercial" tone="warning" />
                    <StatusBadge label="Guía rápida" tone="success" />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 print:border-slate-300 print:bg-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 print:text-slate-500">
                    Idea central
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white print:text-slate-700">
                    Raíces Pilot recibe consultas, responde primero con IA, ordena la información y te
                    avisa cuándo conviene intervenir para llevar al cliente hacia una visita o una operación.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="[break-inside:avoid] [page-break-inside:avoid]">
          <SectionCard
            eyebrow="Funcionamiento"
            title="Cómo funciona el sistema"
            description="El recorrido básico de una consulta, desde que entra hasta que necesita intervención humana."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:grid-cols-1">
              {systemSteps.map((item) => (
                <article
                  key={item.step}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 print:bg-white [break-inside:avoid] [page-break-inside:avoid]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-5 xl:grid-cols-2 print:grid-cols-1">
          <div className="[break-inside:avoid] [page-break-inside:avoid]">
            <SectionCard
              eyebrow="Lead entrante"
              title="Qué hacer cuando entra un lead"
              description="Checklist rápido para no perder contexto ni oportunidades."
            >
              <div className="space-y-3">
                {leadChecklist.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 [break-inside:avoid] [page-break-inside:avoid]"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      ✓
                    </span>
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="[break-inside:avoid] [page-break-inside:avoid]">
            <SectionCard
              eyebrow="Conversaciones"
              title="Cómo usar la bandeja de conversaciones"
              description="El panel de conversaciones es el mejor lugar para seguir el ritmo real del negocio."
            >
              <div className="space-y-4 text-sm leading-6 text-slate-600">
                <p>
                  Ahí vas a ver qué está diciendo cada cliente, qué ya respondió la IA y en qué punto
                  conviene entrar manualmente.
                </p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:bg-white [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="font-semibold text-slate-900">Cuándo intervenir</p>
                  <p className="mt-1">
                    Intervení si el cliente quiere avanzar, tiene dudas importantes o necesita una
                    coordinación concreta.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:bg-white [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="font-semibold text-slate-900">Cuándo dejar a la IA</p>
                  <p className="mt-1">
                    Dejala seguir cuando todavía está relevando necesidad, mostrando opciones o
                    manteniendo la charla activa.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2 print:grid-cols-1">
          <div className="[break-inside:avoid] [page-break-inside:avoid]">
            <SectionCard
              eyebrow="Leads"
              title="Gestión de leads"
              description="Un lead es una oportunidad comercial. La clave no es acumularlos, sino moverlos."
            >
              <div className="space-y-4 text-sm leading-6 text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="font-semibold text-slate-900">Qué es un lead</p>
                  <p className="mt-1">
                    Es una persona que mostró interés real en una propiedad o en la inmobiliaria.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="font-semibold text-slate-900">Cómo priorizar</p>
                  <p className="mt-1">
                    Priorizá primero los que piden visita, hacen preguntas concretas o responden con
                    intención clara.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="font-semibold text-slate-900">Seguimiento</p>
                  <p className="mt-1">
                    Si un lead no avanza, revisá la conversación, definí el siguiente paso y no lo
                    dejes perderse por falta de seguimiento.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="[break-inside:avoid] [page-break-inside:avoid]">
            <SectionCard
              eyebrow="Intervención"
              title="Cuándo conviene intervenir"
              description="No todo requiere respuesta humana inmediata. Lo importante es intervenir en el momento correcto."
            >
              <div className="space-y-3">
                {interventionCases.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-white p-4 [break-inside:avoid] [page-break-inside:avoid]"
                  >
                    <div className="flex items-center gap-2">
                      <StatusBadge label={item.title} tone={item.tone} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.copy}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2 print:grid-cols-1">
          <div className="[break-inside:avoid] [page-break-inside:avoid]">
            <SectionCard
              eyebrow="Captacion"
              title="Como usar el link de entrada"
              description="La plataforma ya tiene un enlace de WhatsApp pensado para campañas, redes y botones de contacto."
            >
              <div className="space-y-4 text-sm leading-6 text-slate-600">
                <p>
                  Ese enlace abre WhatsApp con un mensaje preparado y un codigo interno que permite
                  asociar la consulta a tu inmobiliaria desde el primer mensaje.
                </p>
                <p>
                  Este flujo es para captar clientes finales de tu inmobiliaria. La captacion de
                  nuevas inmobiliarias para la plataforma se gestiona aparte desde Superadmin.
                </p>
                <div className="space-y-3">
                  {captureChannels.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 print:bg-white [break-inside:avoid] [page-break-inside:avoid]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 print:border-slate-300 print:bg-white [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="font-semibold text-brand-900">Donde verlo</p>
                  <p className="mt-1 text-sm leading-6 text-brand-800 print:text-slate-700">
                    Entrá a la sección de captación para copiar el enlace, compartir el QR y entender
                    qué pasa cuando alguien escribe por primera vez.
                  </p>
                </div>
                <div className="print:hidden">
                  <Link
                    href={`/${orgSlug}/captacion`}
                    className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Abrir captacion
                  </Link>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="[break-inside:avoid] [page-break-inside:avoid]">
            <SectionCard
              eyebrow="Errores comunes"
              title="Qué revisar si algo no se ve bien"
              description="Primer chequeo rápido antes de pensar que el sistema no funciona."
            >
              <div className="space-y-3">
                {commonErrors.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 print:border-slate-300 print:bg-white print:text-slate-800 [break-inside:avoid] [page-break-inside:avoid]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="[break-inside:avoid] [page-break-inside:avoid]">
            <SectionCard
              eyebrow="Buenas prácticas"
              title="Cómo sacar mejor resultado"
              description="Hábitos simples que mejoran la operación diaria y la conversión."
            >
              <div className="space-y-3">
                {bestPractices.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 print:bg-white [break-inside:avoid] [page-break-inside:avoid]"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                      •
                    </span>
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="[break-inside:avoid] [page-break-inside:avoid]">
          <SectionCard
            eyebrow="Objetivo"
            title="Lo importante al usar la plataforma"
            description="El objetivo no es solo responder mensajes: es convertir consultas en visitas y operaciones."
          >
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-5 print:border-slate-300 print:bg-white">
              <p className="text-base font-semibold text-emerald-900">
                El objetivo es convertir consultas en visitas y operaciones.
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-800 print:text-slate-700">
                Si la IA resuelve el primer contacto, el equipo puede enfocarse en intervenir mejor,
                priorizar oportunidades reales y avanzar más rápido hacia el cierre.
              </p>
            </div>
          </SectionCard>
        </div>
      </section>
    </>
  );
}
