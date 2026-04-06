export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { confirmLeadPropertyAction, updateLeadAction } from "@/modules/leads/actions";
import { getLeadDetail } from "@/modules/leads/service";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { listOrganizationProperties } from "@/modules/properties/service";
import { createVisitAction } from "@/modules/visits/actions";
import { formatDate, formatDateTime } from "@/lib/utils";

const leadStageOptions = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "VISIT",
  "CLOSED",
] as const;

const leadStageLabels: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  INTERESTED: "Interesado",
  VISIT: "En visita",
  CLOSED: "Cerrado",
};

const TEMPERATURE_LABELS: Record<string, string> = {
  hot: "Caliente",
  warm: "Tibio",
  cold: "Frío",
  unclear: "Indefinido",
};

const CONVERSATION_STATUS_LABELS: Record<string, string> = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  PENDING: "Pendiente",
  RESOLVED: "Resuelta",
  HUMAN_CONTROLLED: "Control humano",
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  SENT: "Enviado",
  RECEIVED: "Recibido",
  FAILED: "Fallido",
  PENDING: "Pendiente",
  SKIPPED: "Omitido",
};

const VISIT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELED: "Cancelada",
};

function getTemperatureTone(temperature: "hot" | "warm" | "cold" | "unclear") {
  if (temperature === "hot") return "warning" as const;
  if (temperature === "warm") return "info" as const;
  return "neutral" as const;
}

function getFollowUpLabel(category: "TECHNICAL" | "COMMERCIAL" | null) {
  if (category === "TECHNICAL") return "Problema de entrega";
  if (category === "COMMERCIAL") return "Seguimiento comercial";
  return "Seguimiento del operador";
}

function getPropertyMatchLabel(
  status:
    | "matched"
    | "existing-link"
    | "manual-confirmed"
    | "manual-overridden"
    | "no-match",
) {
  if (status === "matched") return "Match automático";
  if (status === "existing-link") return "Vínculo existente";
  if (status === "manual-confirmed") return "Confirmado manualmente";
  if (status === "manual-overridden") return "Modificado manualmente";
  return "Requiere revisión manual";
}

function getPropertyMatchTone(
  status:
    | "matched"
    | "existing-link"
    | "manual-confirmed"
    | "manual-overridden"
    | "no-match",
) {
  if (status === "matched") return "success" as const;
  if (status === "existing-link" || status === "manual-confirmed") return "info" as const;
  return "neutral" as const;
}

function formatNextBestAction(action: string | null) {
  if (!action) return null;
  return action
    .split("-")
    .join(" ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getDeliveryStatusTone(status: "RECEIVED" | "PENDING" | "SENT" | "FAILED" | "SKIPPED") {
  if (status === "SENT" || status === "RECEIVED") return "success" as const;
  if (status === "FAILED") return "warning" as const;
  return "neutral" as const;
}

function getVisitStatusTone(status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELED") {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success" as const;
  if (status === "CANCELED") return "neutral" as const;
  return "warning" as const;
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; leadId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { orgSlug, leadId } = await params;
  const { success, error } = await searchParams;
  const [organization, lead, properties] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    getLeadDetail(orgSlug, leadId),
    listOrganizationProperties(orgSlug),
  ]);

  if (!organization || !lead) {
    notFound();
  }

  const nextVisit = [...lead.visits]
    .sort(
      (left, right) =>
        new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
    )
    .find((visit) => new Date(visit.scheduledAt).getTime() >= Date.now());

  const successMessage =
    success === "lead-created"
      ? "Lead creado correctamente."
      : success === "lead-updated"
        ? "Lead actualizado correctamente."
        : success === "visit-created"
          ? "Visita agendada correctamente."
          : null;

  const errorMessage =
    error === "missing-property"
      ? "Asigná una propiedad antes de crear una visita."
      : error === "invalid-visit"
        ? "Ingresá una fecha y estado de visita válidos."
        : error === "property-unavailable"
          ? "La propiedad seleccionada ya no está disponible para este lead."
          : error === "missing-owner"
            ? "No hay usuario asignado disponible para crear esta visita."
            : error === "visit-create-failed"
              ? "No se pudo crear la visita. Intentá de nuevo."
              : null;

  return (
    <>
      {successMessage ? (
        <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 shadow-soft">
          {successMessage}
        </section>
      ) : null}
      {errorMessage ? (
        <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800 shadow-soft">
          {errorMessage}
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                label={leadStageLabels[lead.status] ?? lead.status}
                tone={
                  lead.status === "CLOSED"
                    ? "success"
                    : lead.status === "VISIT"
                      ? "warning"
                      : "info"
                }
              />
              <StatusBadge
                label={TEMPERATURE_LABELS[lead.leadTemperature] ?? lead.leadTemperature}
                tone={getTemperatureTone(lead.leadTemperature)}
              />
              <StatusBadge label={lead.interestLabel} />
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {lead.fullName}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{lead.notes}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {lead.propertyId ? (
              <Link
                href={`/${orgSlug}/properties/${lead.propertyId}`}
                className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Ver propiedad relacionada
              </Link>
            ) : null}
            <Link
              href={`/${orgSlug}/visits`}
              className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Ver agenda de visitas
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-4">
        <MetricCard label="Teléfono" value={lead.phone} hint="Contacto directo principal." />
        <MetricCard label="Email" value={lead.email || "Sin email"} hint="Contacto por correo." />
        <MetricCard label="Responsable" value={lead.ownerName} hint={lead.assignedUserEmail} />
        <MetricCard
          label="Próxima visita"
          value={nextVisit ? formatDateTime(nextVisit.scheduledAt) : "Sin agendar"}
          hint={nextVisit ? nextVisit.propertyTitle : "Creá una visita desde este lead para planificar el próximo paso."}
        />
      </section>

      {lead.extractedPreferences.budget ||
      lead.extractedPreferences.zones.length ||
      lead.extractedPreferences.rooms ||
      lead.extractedPreferences.purpose ? (
        <SectionCard
          eyebrow="Señales comerciales"
          title="Preferencias detectadas"
          description="Contexto leído por IA para el agente asignado. Los valores vacíos se omiten."
        >
          <div className="flex flex-wrap gap-2">
            {lead.extractedPreferences.budget ? (
              <StatusBadge label={`Presupuesto: ${lead.extractedPreferences.budget}`} tone="info" />
            ) : null}
            {lead.extractedPreferences.zones.map((zone) => (
              <StatusBadge key={zone} label={`Zona: ${zone}`} tone="neutral" />
            ))}
            {lead.extractedPreferences.rooms ? (
              <StatusBadge label={`Ambientes: ${lead.extractedPreferences.rooms}`} tone="neutral" />
            ) : null}
            {lead.extractedPreferences.purpose ? (
              <StatusBadge
                label={`Finalidad: ${lead.extractedPreferences.purpose === "living" ? "Vivienda" : "Inversión"}`}
                tone="neutral"
              />
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {lead.propertyMatch ? (
        <SectionCard
          eyebrow="Match de inventario"
          title="Vinculación de propiedad"
          description="Trazabilidad de cómo el sistema mantuvo o asignó la propiedad para este lead."
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={getPropertyMatchLabel(lead.propertyMatch.status)}
              tone={getPropertyMatchTone(lead.propertyMatch.status)}
            />
            {lead.propertyMatch.score !== null ? (
              <StatusBadge label={`Puntaje: ${lead.propertyMatch.score}`} tone="neutral" />
            ) : null}
            {lead.propertyMatch.consideredSignals.map((signal) => (
              <StatusBadge key={signal} label={`Señal: ${signal}`} tone="neutral" />
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">
              {lead.propertyMatch.propertyId && lead.propertyTitle !== "No property linked yet"
                ? lead.propertyTitle
                : "Sin propiedad asignada automáticamente"}
            </p>
            {lead.propertyMatch.propertyId ? (
              <Link
                href={`/${orgSlug}/properties/${lead.propertyMatch.propertyId}`}
                className="mt-2 inline-flex rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Ver propiedad matcheada
              </Link>
            ) : null}
          </div>

          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
            {lead.propertyMatch.reasons.map((reason) => (
              <li key={reason} className="rounded-2xl border border-slate-200 px-4 py-3">
                {reason}
              </li>
            ))}
          </ul>

          {lead.propertyMatch.shortlist.length ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-slate-950">
                Propiedades sugeridas para revisión manual
              </p>
              {lead.propertyMatch.shortlist.map((candidate) => (
                <article
                  key={candidate.propertyId}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{candidate.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {[candidate.neighborhood, candidate.city].filter(Boolean).join(" / ") ||
                          "Ubicación pendiente"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge label={`Puntaje: ${candidate.score}`} tone="neutral" />
                      {candidate.propertyType ? (
                        <StatusBadge label={candidate.propertyType} tone="neutral" />
                      ) : null}
                      {candidate.bedrooms ? (
                        <StatusBadge label={`${candidate.bedrooms} dorm`} tone="neutral" />
                      ) : null}
                    </div>
                  </div>

                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {candidate.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/${orgSlug}/properties/${candidate.propertyId}`}
                      className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Ver propiedad
                    </Link>
                    <form action={confirmLeadPropertyAction}>
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="leadId" value={lead.id} />
                      <input type="hidden" name="propertyId" value={candidate.propertyId} />
                      <button
                        type="submit"
                        className="rounded-full bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
                      >
                        {lead.propertyId === candidate.propertyId
                          ? "Mantener esta propiedad"
                          : lead.propertyId
                            ? "Usar esta en su lugar"
                            : "Confirmar esta propiedad"}
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {lead.nextBestAction || lead.automationSummary ? (
        <SectionCard
          eyebrow="Guía de automatización"
          title="Próximo paso recomendado"
          description="Lectura operativa de lo que el flujo recomienda como próximo paso."
        >
          <div className="flex flex-wrap items-center gap-2">
            {lead.nextBestAction ? (
              <StatusBadge
                label={formatNextBestAction(lead.nextBestAction) ?? "Acción sugerida"}
                tone="info"
              />
            ) : null}
            {lead.requiresFollowUp ? (
              <StatusBadge
                label={getFollowUpLabel(lead.followUpCategory)}
                tone="warning"
              />
            ) : null}
          </div>
          {lead.automationSummary ? (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              {lead.automationSummary}
            </p>
          ) : null}
        </SectionCard>
      ) : null}

      {lead.requiresFollowUp && lead.followUpReason ? (
        <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-soft">
          <p className="font-semibold">{getFollowUpLabel(lead.followUpCategory)} recomendado</p>
          <p className="mt-1 leading-6">{lead.followUpReason}</p>
        </section>
      ) : null}

      {lead.conversationContext ? (
        <SectionCard
          eyebrow="Conversación"
          title="Contexto WhatsApp"
          description="El agente asignado puede revisar el hilo del bot aquí sin salir del lead."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-950">
                {lead.conversationContext.subject}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {lead.conversationContext.participantName}
                {" / "}
                {lead.conversationContext.participantPhone}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={CONVERSATION_STATUS_LABELS[lead.conversationContext.status] ?? lead.conversationContext.status} />
              {lead.conversationContext.followUpActive ? (
                <StatusBadge
                  label={getFollowUpLabel(lead.conversationContext.followUpCategory)}
                  tone="warning"
                />
              ) : null}
              <Link
                href={`/${orgSlug}/conversations`}
                className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Abrir bandeja completa
              </Link>
            </div>
          </div>

          {lead.conversationContext.followUpActive && lead.conversationContext.followUpReason ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {lead.conversationContext.followUpReason}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {lead.conversationContext.messages.length ? (
              lead.conversationContext.messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-2xl px-4 py-3 ${
                    message.direction === "OUTBOUND"
                      ? "ml-auto border border-brand-200 bg-brand-50"
                      : "mr-auto border border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{message.senderName}</p>
                    <StatusBadge label={message.direction === "OUTBOUND" ? "Enviado" : "Recibido"} tone="neutral" />
                    {message.direction === "OUTBOUND" ? (
                      <StatusBadge
                        label={DELIVERY_STATUS_LABELS[message.deliveryStatus] ?? message.deliveryStatus}
                        tone={getDeliveryStatusTone(message.deliveryStatus)}
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{message.body}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(message.sentAt)}</p>
                  {message.direction === "OUTBOUND" && message.deliveryError ? (
                    <p className="mt-2 text-xs font-medium text-rose-600">{message.deliveryError}</p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sin mensajes de WhatsApp para este lead todavía.</p>
            )}
          </div>
        </SectionCard>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Editar"
          title="Datos del lead"
          description="Controles mínimos para que el agente mantenga el lead activo."
        >
          <form action={updateLeadAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="leadId" value={leadId} />

            <label className="space-y-2 text-sm text-slate-600">
              <span>Nombre</span>
              <input
                name="fullName"
                required
                defaultValue={lead.fullName}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Teléfono</span>
              <input
                name="phone"
                required
                defaultValue={lead.phone}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Email</span>
              <input
                name="email"
                type="email"
                defaultValue={lead.email}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Estado</span>
              <select
                name="status"
                defaultValue={lead.status}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              >
                {leadStageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {leadStageLabels[stage] ?? stage}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
              <span>Propiedad relacionada</span>
              <select
                name="propertyId"
                defaultValue={lead.propertyId ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              >
                <option value="">Sin propiedad asignada</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Guardar
              </button>
              <a
                href={`tel:${lead.phone}`}
                className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Llamar al lead
              </a>
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Enviar email
                </a>
              ) : null}
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Visitas"
          title="Agregar visita"
          description="Creá una visita en contexto sin salir del lead."
        >
          <form action={createVisitAction} className="space-y-4">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="leadId" value={leadId} />
            <label className="space-y-2 text-sm text-slate-600 block">
              <span>Fecha y hora</span>
              <input
                name="scheduledAt"
                type="datetime-local"
                required
                min={new Date().toISOString().slice(0, 16)}
                step={900}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600 block">
              <span>Estado inicial</span>
              <select
                name="status"
                defaultValue="PENDING"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              >
                <option value="PENDING">Pendiente</option>
                <option value="CONFIRMED">Confirmada</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={!lead.propertyId}
              className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              + Agregar visita
            </button>
            {!lead.propertyId ? (
              <p className="text-sm text-slate-500">
                Asigná una propiedad primero para vincular la visita correctamente.
              </p>
            ) : null}
          </form>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="Actividad"
          title="Historial del lead"
          description="Registro de eventos y acciones sobre este lead."
        >
          <div className="space-y-4">
            {lead.activity.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <span className="text-sm text-slate-500">{formatDate(item.happenedAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Visitas"
          title="Visitas agendadas"
          description="Visitas vinculadas a este lead y la propiedad seleccionada."
        >
          <div className="space-y-4">
            {lead.visits.length ? (
              lead.visits.map((visit) => (
                <div key={visit.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{visit.propertyTitle}</p>
                    <StatusBadge
                      label={VISIT_STATUS_LABELS[visit.status] ?? visit.status}
                      tone={getVisitStatusTone(visit.status)}
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatDateTime(visit.scheduledAt)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{visit.notes}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sin visitas agendadas todavía.</p>
            )}
          </div>
        </SectionCard>
      </section>
    </>
  );
}
