export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { prisma } from "@/server/db/prisma";
import { formatDateTime } from "@/lib/utils";
import { getEvolutionInstanceDetails } from "@/server/whatsapp/evolution";

function AutoMetric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "neutral" | "success" | "warning" | "info" | "danger";
}) {
  const colors = {
    neutral: "border-slate-200 bg-white",
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-200 bg-amber-50",
    info: "border-brand-100 bg-brand-50",
    danger: "border-rose-200 bg-rose-50",
  };
  const valueColors = {
    neutral: "text-slate-950",
    success: "text-emerald-800",
    warning: "text-amber-800",
    info: "text-brand-700",
    danger: "text-rose-700",
  };
  return (
    <article className={`rounded-[1.75rem] border p-5 shadow-soft ${colors[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueColors[tone]}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </article>
  );
}

function SystemStatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        active ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" : "bg-slate-300"
      }`}
    />
  );
}

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const organization = await getOrganizationWorkspace(orgSlug);

  if (!organization) notFound();

  const orgId = organization.id;

  const [
    whatsappChannels,
    totalConversations,
    activeFollowUps,
    humanControlled,
    withNextAction,
    closedConversations,
    totalVisits,
    activeSlots,
    outboundMessages,
    inboundMessages,
    failedMessages,
    recentFollowUps,
    leadsByStage,
  ] = await Promise.all([
    prisma.whatsAppChannel.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        status: true,
        displayPhoneNumber: true,
        verifiedDisplayName: true,
        lastInboundAt: true,
        lastDeliveryAt: true,
        lastErrorAt: true,
        lastErrorMessage: true,
        isPrimary: true,
        provider: true,
        instanceName: true,
      },
    }),
    prisma.conversation.count({ where: { organizationId: orgId } }),
    prisma.conversation.count({
      where: { organizationId: orgId, followUpActive: true },
    }),
    prisma.conversation.count({
      where: { organizationId: orgId, isHumanControlled: true },
    }),
    prisma.conversation.count({
      where: { organizationId: orgId, nextBestAction: { not: null } },
    }),
    prisma.conversation.count({
      where: { organizationId: orgId, status: "CLOSED" },
    }),
    prisma.visit.count({ where: { organizationId: orgId } }),
    prisma.availabilitySlot.count({
      where: { organizationId: orgId, isActive: true },
    }),
    prisma.message.count({
      where: { organizationId: orgId, direction: "OUTBOUND" },
    }),
    prisma.message.count({
      where: { organizationId: orgId, direction: "INBOUND" },
    }),
    prisma.message.count({
      where: {
        organizationId: orgId,
        direction: "OUTBOUND",
        deliveryStatus: "FAILED",
      },
    }),
    prisma.conversation.findMany({
      where: { organizationId: orgId, followUpActive: true },
      include: {
        lead: { select: { id: true, fullName: true, status: true } },
        messages: {
          orderBy: { sentAt: "desc" },
          take: 1,
          select: { body: true, direction: true, sentAt: true },
        },
      },
      orderBy: [{ followUpActiveAt: "desc" }],
      take: 8,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    }),
  ]);

  let activeChannel = whatsappChannels.find((ch) => ch.status === "ACTIVE");

  // Self-healing: if Evolution channel is active but missing displayPhoneNumber, fetch and update it
  if (activeChannel && activeChannel.provider === "EVOLUTION_API" && !activeChannel.displayPhoneNumber && activeChannel.instanceName) {
    try {
      const { status, phone } = await getEvolutionInstanceDetails(activeChannel.instanceName);
      if (status === "CONNECTED" && phone) {
        const updated = await prisma.whatsAppChannel.update({
          where: { instanceName: activeChannel.instanceName },
          data: { 
            displayPhoneNumber: phone,
            phoneNumberId: `evolution_${phone}`,
          },
          select: {
            id: true,
            status: true,
            displayPhoneNumber: true,
            verifiedDisplayName: true,
            lastInboundAt: true,
            lastDeliveryAt: true,
            lastErrorAt: true,
            lastErrorMessage: true,
            isPrimary: true,
            provider: true,
            instanceName: true,
          }
        });
        activeChannel = updated;
        
        // Also update in the list
        const idx = whatsappChannels.findIndex(ch => ch.id === updated.id);
        if (idx !== -1) {
          whatsappChannels[idx] = updated;
        }
      }
    } catch (e) {
      console.error("[AutomationsPage] Self-healing displayPhoneNumber failed:", e);
    }
  }

  const hasWhatsApp = whatsappChannels.length > 0;
  const whatsappActive = !!activeChannel;
  const hasSlots = activeSlots > 0;
  const aiConfigured = true; // Gestionado por superadmin — Replit AI proxy siempre disponible
  const redisConfigured = Boolean(process.env.REDIS_URL);

  const botActive = whatsappActive;
  const autoVisitCount = totalVisits;
  const responseRate =
    inboundMessages > 0 ? Math.round((outboundMessages / inboundMessages) * 100) : 0;

  const stageMap: Record<string, number> = {};
  for (const group of leadsByStage) {
    stageMap[group.status] = group._count;
  }

  const STAGE_LABELS: Record<string, string> = {
    NEW: "Nuevos",
    CONTACTED: "Contactados",
    INTERESTED: "Interesados",
    VISIT: "En visita",
    CLOSED: "Cerrados",
  };

  const totalLeads = Object.values(stageMap).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Estado del sistema */}
      <section className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  botActive
                    ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]"
                    : "bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.15)]"
                }`}
              />
              <span
                className={`text-sm font-semibold ${botActive ? "text-emerald-700" : "text-amber-700"}`}
              >
                Agente IA {botActive ? "activo" : "en configuración inicial"}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Actividad automática
            </h1>
            <p className="mt-2 text-base text-slate-500">
              Panel de estado en tiempo real de lo que el agente IA hace automáticamente: conversaciones procesadas, seguimientos y visitas agendadas.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${orgSlug}/settings/availability`}
              className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Configurar horarios
            </Link>
            <Link
              href={`/${orgSlug}/settings/integrations`}
              className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Revisar captación
            </Link>
          </div>
        </div>

        {/* Checklist del sistema */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "WhatsApp conectado",
              active: whatsappActive,
              detail: activeChannel?.displayPhoneNumber || "Conectado correctamente",
              link: `/${orgSlug}/settings/integrations`,
            },
            {
              label: "Motor IA",
              active: aiConfigured,
              detail: "Activo — gestionado por la plataforma",
              link: null,
            },
            {
              label: "Horarios de disponibilidad",
              active: hasSlots,
              detail: hasSlots ? `${activeSlots} franjas activas` : "Sin horarios configurados",
              link: `/${orgSlug}/settings/availability`,
            },
            {
              label: "Cola de procesamiento",
              active: redisConfigured,
              detail: redisConfigured ? "Conectada" : "Modo directo",
              link: null,
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border p-4 ${
                item.active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <SystemStatusDot active={item.active} />
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{item.detail}</p>
              {item.link && !item.active && (
                <Link
                  href={item.link}
                  className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline"
                >
                  Configurar →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Métricas clave */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <AutoMetric
          label="Conversaciones totales"
          value={totalConversations}
          hint="Hilos de WhatsApp procesados por el agente."
          tone={totalConversations > 0 ? "info" : "neutral"}
        />
        <AutoMetric
          label="Seguimientos activos"
          value={activeFollowUps}
          hint="Conversaciones que requieren atención del equipo."
          tone={activeFollowUps > 0 ? "warning" : "neutral"}
        />
        <AutoMetric
          label="Visitas auto-agendadas"
          value={autoVisitCount}
          hint="Visitas creadas por el flujo automático."
          tone={autoVisitCount > 0 ? "success" : "neutral"}
        />
        <AutoMetric
          label="Tasa de respuesta del agente"
          value={`${responseRate}%`}
          hint={`${outboundMessages} mensajes enviados / ${inboundMessages} recibidos.`}
          tone={responseRate > 70 ? "success" : responseRate > 30 ? "info" : "neutral"}
        />
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <AutoMetric
          label="Control humano"
          value={humanControlled}
          hint="Chats escalados a un agente real."
          tone={humanControlled > 0 ? "warning" : "neutral"}
        />
        <AutoMetric
          label="Con acción sugerida"
          value={withNextAction}
          hint="Oportunidades con próximo paso recomendado por IA."
          tone={withNextAction > 0 ? "info" : "neutral"}
        />
        <AutoMetric
          label="Conversaciones cerradas"
          value={closedConversations}
          hint="Hilos resueltos o archivados."
          tone="neutral"
        />
        <AutoMetric
          label="Mensajes fallidos"
          value={failedMessages}
          hint="Envíos que no llegaron al cliente."
          tone={failedMessages > 0 ? "danger" : "neutral"}
        />
      </section>

      {/* Canal WhatsApp */}
      <SectionCard
        eyebrow="Canal"
        title="Canal de WhatsApp"
        description="Estado de los números conectados a la plataforma. Sin canal activo el agente no puede recibir ni enviar mensajes."
      >
        {whatsappChannels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="font-semibold text-slate-700">Sin canales configurados</p>
            <p className="mt-1 text-sm text-slate-400">
              Revisá el canal oficial y el enlace compartible desde Configuracion {"->"} Integraciones.
            </p>
            <Link
              href={`/${orgSlug}/settings/integrations`}
              className="mt-4 inline-block rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Conectar WhatsApp
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {whatsappChannels.map((channel) => (
              <div key={channel.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                        channel.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      WA
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">
                        {channel.verifiedDisplayName ?? channel.displayPhoneNumber ?? (channel.status === "ACTIVE" ? "WhatsApp Conectado" : "Canal QR")}
                      </p>
                      <p className="text-sm text-slate-500">
                        {channel.displayPhoneNumber ?? (channel.status === "ACTIVE" ? "Conectado correctamente" : "Sin número registrado")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={channel.status === "ACTIVE" ? "Activo" : channel.status === "INACTIVE" ? "Inactivo" : "Suspendido"}
                      tone={channel.status === "ACTIVE" ? "success" : "neutral"}
                    />
                    {channel.isPrimary && <StatusBadge label="Principal" tone="info" />}
                  </div>
                </div>
                {channel.lastErrorAt && channel.lastErrorMessage && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <span className="font-semibold">Último error:</span> {channel.lastErrorMessage}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                  {channel.lastInboundAt && (
                    <span>
                      Último mensaje recibido: {formatDateTime(channel.lastInboundAt.toISOString())}
                    </span>
                  )}
                  {channel.lastDeliveryAt && (
                    <span>
                      Último enviado: {formatDateTime(channel.lastDeliveryAt.toISOString())}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Pipeline de leads y funnel de automatización */}
      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          eyebrow="Embudo de prospectos"
          title="Distribución por etapa"
          description="Cómo se distribuyen las oportunidades en el embudo de ventas del equipo."
        >
          <div className="space-y-3">
            {["NEW", "CONTACTED", "INTERESTED", "VISIT", "CLOSED"].map((stage) => {
              const count = stageMap[stage] ?? 0;
              const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">
                      {STAGE_LABELS[stage] ?? stage}
                    </span>
                    <span className="text-sm font-semibold text-slate-950">
                      {count} <span className="text-xs font-normal text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stage === "CLOSED"
                          ? "bg-emerald-500"
                          : stage === "VISIT"
                            ? "bg-amber-400"
                            : stage === "INTERESTED"
                              ? "bg-brand-500"
                              : stage === "CONTACTED"
                                ? "bg-blue-400"
                                : "bg-slate-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {totalLeads === 0 && (
              <p className="text-sm text-slate-400">Sin prospectos en el embudo todavía.</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total en embudo</span>
            <span className="text-lg font-bold text-slate-950">{totalLeads}</span>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Actividad IA"
          title="Conversaciones recientes con seguimiento"
          description="Oportunidades que el agente marcó para seguimiento por el equipo humano."
        >
          {recentFollowUps.length === 0 ? (
            <p className="text-sm text-slate-400">Sin seguimientos activos. El agente está manejando todo automáticamente.</p>
          ) : (
            <div className="space-y-3">
              {recentFollowUps.map((conv) => {
                const lastMsg = conv.messages[0];
                return (
                  <div
                    key={conv.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {conv.lead?.fullName ?? conv.participantName ?? "Participante desconocido"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {conv.participantPhone ?? "Sin teléfono"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge
                          label={
                            conv.followUpCategory === "COMMERCIAL"
                              ? "Seguimiento comercial"
                              : conv.followUpCategory === "TECHNICAL"
                                ? "Problema de entrega"
                                : "Seguimiento operador"
                          }
                          tone="warning"
                        />
                        {conv.isHumanControlled && (
                          <StatusBadge label="Control humano" tone="info" />
                        )}
                      </div>
                    </div>
                    {conv.followUpReason && (
                      <p className="mt-2 text-xs leading-5 text-amber-900">{conv.followUpReason}</p>
                    )}
                    {lastMsg && (
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                        <span className="font-medium">{lastMsg.direction === "OUTBOUND" ? "Agente:" : "Cliente:"}</span>{" "}
                        {lastMsg.body}
                      </p>
                    )}
                    {conv.lead && (
                      <Link
                        href={`/${orgSlug}/leads/${conv.lead.id}`}
                        className="mt-3 inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                      >
                        Ver oportunidad →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </section>

      {/* Explicación del flujo */}
      <SectionCard
        eyebrow="Flujo automático"
        title="¿Cómo funciona el agente IA?"
        description="El agente opera en tiempo real sobre los mensajes de WhatsApp entrantes."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              step: "1",
              title: "Mensaje entrante",
              desc: "Un cliente escribe al número de WhatsApp de la inmobiliaria.",
              color: "bg-slate-100 text-slate-700",
            },
            {
              step: "2",
              title: "Análisis IA",
              desc: "La IA lee el mensaje, extrae preferencias (zona, presupuesto, ambientes) y evalúa la intención del cliente.",
              color: "bg-brand-100 text-brand-700",
            },
            {
              step: "3",
              title: "Coincidencia de inventario",
              desc: "El sistema busca propiedades disponibles que coincidan con las preferencias detectadas.",
              color: "bg-blue-100 text-blue-700",
            },
            {
              step: "4",
              title: "Propuesta de visita",
              desc: "Si hay coincidencia, el agente propone fecha y hora dentro de los horarios de disponibilidad configurados.",
              color: "bg-amber-100 text-amber-700",
            },
            {
              step: "5",
              title: "Seguimiento humano",
              desc: "Si el cliente acepta o si el agente no puede resolver, escala al equipo con contexto completo.",
              color: "bg-emerald-100 text-emerald-700",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-slate-200 p-4">
              <div
                className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold ${item.color}`}
              >
                {item.step}
              </div>
              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Alertas de configuración si falta algo */}
      {(!whatsappActive || !hasSlots) && (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-900">El agente IA aún no está completamente activo</p>
          <p className="mt-1 text-sm text-amber-800">
            Para activar el agendado automático de visitas necesitás completar la siguiente configuración:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-amber-800">
            {!whatsappActive && (
              <li className="flex items-center gap-2">
                <span className="text-amber-500">⚠</span>
                <span>
                  Revisar el canal de WhatsApp en{" "}
                  <Link href={`/${orgSlug}/settings/integrations`} className="font-semibold underline">
                    Configuracion {"->"} Integraciones
                  </Link>
                </span>
              </li>
            )}
            {!hasSlots && (
              <li className="flex items-center gap-2">
                <span className="text-amber-500">⚠</span>
                <span>
                  Configurar al menos un horario de disponibilidad en{" "}
                  <Link href={`/${orgSlug}/settings/availability`} className="font-semibold underline">
                    Configuración → Disponibilidad
                  </Link>
                </span>
              </li>
            )}
          </ul>
        </section>
      )}
    </>
  );
}
