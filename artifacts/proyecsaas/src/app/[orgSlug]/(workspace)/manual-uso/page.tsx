export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
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
    title: "Agendado de visitas",
    description:
      "Si el cliente quiere ver una propiedad, la IA propone turnos basados en tu disponibilidad configurada.",
  },
  {
    step: "5",
    title: "Cierre humano",
    description:
      "Cuando aparece una oportunidad real, el equipo toma el control para cerrar la operación.",
  },
] as const;

const tourSteps = [
  { step: "1", title: "Abrí la propiedad", description: "Entrá a la ficha de la propiedad en el panel y tocá la pestaña '360° / Panorámica' en la sección de Medios." },
  { step: "2", title: "Elegí el ambiente", description: "Tocá 'Escanear con celular' y seleccioná el ambiente que vas a capturar: Living, Cocina, Habitación, Baño, etc." },
  { step: "3", title: "Seguí la guía visual", description: "El celular te va a indicar con bordes verdes cuándo estás en la posición correcta. Mantené el celular quieto y la foto se saca sola." },
  { step: "4", title: "Completá los 18 puntos", description: "El sistema te guía por 6 posiciones × 3 alturas (piso, frente, techo). Tarda entre 5 y 10 minutos por ambiente." },
  { step: "5", title: "Agregá más ambientes", description: "Al terminar un ambiente podés seguir con el siguiente. Cada ambiente queda como una escena navegable dentro del tour." },
] as const;

const leadChecklist = [
  "Revisar la conversación y entender qué pidió el cliente.",
  "Configurar tu Disponibilidad para que la IA pueda agendar visitas por vos.",
  "Identificar si busca una propiedad puntual, información general o una visita.",
  "Responder manualmente solo si hace falta destrabar la conversación.",
  "Llevar el contacto hacia una visita o siguiente paso concreto.",
] as const;

const commonErrors = [
  "No llegan mensajes: revisar integraciones de WhatsApp y estado del canal.",
  "La IA no responde: validar que el canal y el agente estén activos.",
  "No veo leads: revisar conversaciones recientes y filtros del panel.",
  "El tour no se ve: verificar que el servicio de stitching esté activo y que la captura se haya completado correctamente (18 fotos).",
  "La propiedad no aparece en el catálogo: verificar que el estado sea 'Disponible' y que 'Publicar esta propiedad' esté activado.",
  "El link del tour no funciona: la propiedad debe ser pública. Cambiar visibilidad desde la ficha de la propiedad.",
] as const;

const bestPractices = [
  "Responder rápido cuando el cliente ya está listo para avanzar.",
  "No interrumpir la automatización si la conversación todavía avanza bien sola.",
  "Revisar todos los días los leads activos y las conversaciones abiertas.",
  "Hacé el tour 360° antes de publicar la propiedad — los clientes que ven el tour tienen el doble de chances de pedir visita.",
  "Compartí el link del catálogo en tu bio de Instagram y en tu perfil de Zonaprop o Argenprop.",
  "Capturá al menos 2 ambientes por propiedad (living + dormitorio principal) para que el tour sea más convincente.",
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
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft print:hidden">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.15)]" />
              <span className="text-sm font-semibold text-slate-600">Documentación Oficial</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Manual de Uso
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-500 font-medium">
              Todo lo que necesitás saber para operar Raíces Pilot y maximizar tus ventas.
            </p>
          </div>
        </div>
      </section>

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

        <div className="[break-inside:avoid] [page-break-inside:avoid]">
          <SectionCard
            eyebrow="Tour virtual"
            title="Cómo hacer un tour 360° con tu celular"
            description="Cualquier agente puede crear un recorrido inmersivo profesional en minutos, sin equipos especiales."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 print:grid-cols-1">
              {tourSteps.map((item) => (
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

        <div className="[break-inside:avoid] [page-break-inside:avoid]">
          <SectionCard
            eyebrow="Catálogo"
            title="Compartí tu catálogo con clientes"
            description="Tu catálogo es la cara pública de tu inmobiliaria. Cada propiedad activa aparece ahí automáticamente."
          >
            <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1">
              <div className="space-y-4 text-sm leading-6 text-slate-600">
                <p>
                  El catálogo muestra todas tus propiedades disponibles con fotos, precio, tipo y — si tiene tour — un botón directo al recorrido 360°. El cliente puede filtrar por Venta, Alquiler o buscar solo propiedades con tour. Para compartirlo, copiá el link desde el panel de propiedades y envialo por WhatsApp, email o redes sociales.
                </p>
                <div className="print:hidden">
                  <a
                    href={`/cat/${orgSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800"
                  >
                    Ver catálogo público
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Requisito</p>
                  <p className="mt-1.5 text-sm text-slate-700 font-medium">
                    Para que una propiedad aparezca en el catálogo: cambiá el estado a <strong>'Disponible'</strong> y activá <strong>'Publicar esta propiedad'</strong>.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Badge 360°</p>
                  <p className="mt-1.5 text-sm text-slate-700 font-medium">
                    El tour 360° aparece automáticamente con el badge verde cuando la propiedad tiene escenas capturadas.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Consultas</p>
                  <p className="mt-1.5 text-sm text-slate-700 font-medium">
                    Cuando un cliente toca <strong>'Consultar'</strong>, te llega directamente a tu WhatsApp con el nombre y dirección de la propiedad.
                  </p>
                </div>
              </div>
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

        {/* Nueva sección de Disponibilidad */}
        <div className="[break-inside:avoid] [page-break-inside:avoid]">
          <SectionCard
            eyebrow="Configuración"
            title="Gestión de Disponibilidad para Visitas"
            description="Para que la IA pueda proponer visitas, necesita saber cuándo estás disponible."
          >
            <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1">
              <div className="space-y-4 text-sm leading-6 text-slate-600">
                <p>
                  En la sección de <strong>Disponibilidad</strong>, podés configurar tus franjas horarias de trabajo. 
                  Sin esto, la IA no podrá ofrecer turnos automáticos y tendrá que derivar la consulta siempre a un humano.
                </p>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="font-semibold text-slate-900 mb-2">Tipos de Horarios</p>
                  <ul className="space-y-2 list-disc pl-4 text-slate-600">
                    <li><strong>Generales:</strong> Para toda la inmobiliaria.</li>
                    <li><strong>Por Agente:</strong> Si un agente específico tiene sus propios horarios.</li>
                    <li><strong>Por Propiedad:</strong> Si una propiedad solo se puede mostrar en días específicos.</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5 [break-inside:avoid] [page-break-inside:avoid]">
                  <p className="font-semibold text-brand-900">¿Por qué es importante?</p>
                  <p className="mt-2 text-sm leading-relaxed text-brand-800">
                    Las inmobiliarias que configuran sus horarios ven un <strong>40% más de visitas agendadas</strong>, 
                    ya que el cliente recibe una propuesta de turno inmediata en WhatsApp mientras tiene interés.
                  </p>
                </div>
                <div className="print:hidden">
                  <Link
                    href={`/${orgSlug}/settings/availability`}
                    className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Configurar mis horarios ahora
                  </Link>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Nueva sección explicativa: WhatsApp Híbrido y los 3 Niveles de Conexión */}
        <div className="[break-inside:avoid] [page-break-inside:avoid]">
          <SectionCard
            eyebrow="WhatsApp Híbrido"
            title="Los 3 Niveles de Conexión para tu Inmobiliaria"
            description="Entendé cómo conectar WhatsApp y elegí el nivel de independencia adecuado para tu marca."
          >
            <div className="grid gap-6 lg:grid-cols-3 print:grid-cols-1">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-3">
                <span className="text-2xl">🟢 Nivel 1</span>
                <h4 className="text-sm font-bold text-slate-900">Canal Compartido (Cero Configuración)</h4>
                <p className="text-xs leading-relaxed text-slate-600">
                  Usa la línea oficial compartida de la plataforma de forma automática. Tus clientes tocan tu enlace de captación y entran directo a tu panel gracias a un código único invisible al inicio del mensaje.
                </p>
                <p className="text-xs font-semibold text-blue-700 bg-white/60 p-2.5 rounded-xl border border-blue-100">
                  👍 Ideal para probar el sistema y ver la IA en funcionamiento en 10 segundos.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
                <span className="text-2xl">🔵 Nivel 2</span>
                <h4 className="text-sm font-bold text-slate-900">Conexión Rápida QR (Tu Propio Número)</h4>
                <p className="text-xs leading-relaxed text-slate-600">
                  Escaneás un código QR desde la sección de integraciones y tu Agente IA comienza a responder consultas directamente desde tu número personalizado o comercial.
                </p>
                <div className="text-xs text-emerald-800 bg-white/70 p-3 rounded-xl border border-emerald-100/50 space-y-1">
                  <p className="font-bold">🔒 Advertencia Geográfica:</p>
                  <p className="leading-relaxed">
                    Al escanear, WhatsApp podría advertirte que estás vinculando un dispositivo en <b>San Francisco, EE.UU.</b> Esto es <b>100% seguro y normal</b>: se debe a que la infraestructura de IA está alojada en la nube de Railway. Podés presionar <b>"Vincular dispositivo"</b> con total tranquilidad.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 space-y-3">
                <span className="text-2xl">🟣 Nivel 3</span>
                <h4 className="text-sm font-bold text-slate-900">API Oficial de Meta (Corporativo)</h4>
                <p className="text-xs leading-relaxed text-slate-600">
                  Conexión oficial de nivel empresarial a través de Meta Business Suite. No requiere escanear códigos QR, nunca se desconecta y elimina cualquier advertencia de geolocalización.
                </p>
                <p className="text-xs font-semibold text-indigo-700 bg-white/60 p-2.5 rounded-xl border border-indigo-100">
                  👑 Ideal para inmobiliarias de gran volumen, marcas corporativas y equipos comerciales grandes.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Nueva sección explicativa: Personalización del Agente IA */}
        <div className="[break-inside:avoid] [page-break-inside:avoid]">
          <SectionCard
            eyebrow="Personalización"
            title="Configuración de tu Agente IA (Identidad, Tono y Enfoque)"
            description="Adaptá el comportamiento, nombre, personalidad y filtros del Agente IA para alinearlo perfectamente con tu inmobiliaria."
          >
            <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1">
              <div className="space-y-4 text-sm leading-6 text-slate-600">
                <p>
                  Desde la sección de <strong>Agentes IA</strong>, podés editar el agente activo para moldear su forma de hablar, las reglas específicas que debe respetar y los límites del inventario en los que debe enfocarse.
                </p>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                  <div>
                    <p className="font-bold text-slate-900">👤 Nombre e Identidad</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      El agente usará este nombre para presentarse ante los clientes (ej. <i>"Hola, soy Lucas de InmoPalermo..."</i>). Esto genera cercanía y transparencia inmediata.
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">🗣️ Tonos de Comunicación</p>
                    <ul className="text-xs text-slate-500 mt-1 pl-4 list-disc space-y-1.5 leading-relaxed">
                      <li><b>Amigable:</b> Uso de voseo argentino natural (<i>"¿Cómo andás?", "te cuento", "tenés"</i>). Cálido y cercano.</li>
                      <li><b>Formal:</b> Uso de "usted" y conjugaciones formales respetuosas (<i>"¿Cómo está usted?", "le comento", "le acerco"</i>). Profesional y tradicional.</li>
                      <li><b>Neutral:</b> Conciso, directo, neutro y sin vueltas. Al grano.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                  <div>
                    <p className="font-bold text-slate-950">🎯 Zonas y Presupuestos de Enfoque</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Podés limitar los barrios y el rango de precios en los que opera tu agente. Si un lead consulta por una propiedad fuera de este enfoque, la IA responderá amablemente aclarando su especialidad y derivará al equipo humano si insisten.
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-950">🧠 Personalidad y Reglas Personalizadas</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      El campo <b>Personalidad</b> te permite escribir instrucciones únicas para el agente en texto libre (ej. <i>"Hacé hincapié en que somos especialistas en pozo", "No des el número de piso exacto por seguridad", "Si preguntan por alquiler temporario, informá que el mínimo es de 3 meses"</i>).
                    </p>
                  </div>
                </div>
                <div className="print:hidden">
                  <Link
                    href={`/${orgSlug}/agents`}
                    className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Personalizar mi Agente IA
                  </Link>
                </div>
              </div>
            </div>
          </SectionCard>
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
