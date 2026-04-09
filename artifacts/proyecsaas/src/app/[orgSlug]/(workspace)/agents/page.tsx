export const dynamic = "force-dynamic";

import Link from "next/link";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { getAgentsForOrg, getAgentStatsForOrg } from "@/modules/agents/service";
import { STATUS_LABELS, TONE_LABELS, type AgentSummary } from "@/modules/agents/types";
import { ToggleAgentButton } from "./toggle-agent-button";

function AgentStatusBadge({ status }: { status: AgentSummary["status"] }) {
  const tone =
    status === "ACTIVE" ? "success" : status === "PAUSED" ? "warning" : "neutral";
  return <StatusBadge label={STATUS_LABELS[status]} tone={tone} />;
}

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { membership } = await requireOrganizationMembership(orgSlug);
  const orgId = membership.organization.id;

  const [agents, stats, org] = await Promise.all([
    getAgentsForOrg(orgId),
    getAgentStatsForOrg(orgId),
    prisma.organization.findUnique({ where: { id: orgId }, select: { maxAiAgents: true } }),
  ]);

  const maxAiAgents = org?.maxAiAgents ?? 1;
  const isManager = membership.role === "OWNER" || membership.role === "ADMIN";
  const atQuota = agents.length >= maxAiAgents;

  return (
    <>
      <section className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
              <span className="text-sm font-semibold text-emerald-700">Disponibles 24/7</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Agentes IA
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-500">
              Cada agente atiende consultas de WhatsApp las 24 horas, 7 días a la semana — sin
              descanso, sin horario de oficina. Mientras el equipo duerme, el agente cierra leads.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              <span className="font-bold text-slate-900">{agents.length}</span>
              <span>de</span>
              <span className="font-bold text-slate-900">{maxAiAgents}</span>
              <span>
                agente{maxAiAgents !== 1 ? "s" : ""} habilitado{maxAiAgents !== 1 ? "s" : ""}
              </span>
            </div>
            {isManager && !atQuota && (
              <Link
                href={`/${orgSlug}/agents/new`}
                className="shrink-0 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
              >
                + Crear agente
              </Link>
            )}
            {isManager && atQuota && (
              <p className="max-w-[220px] text-right text-xs text-slate-500">
                Límite alcanzado. Para habilitar más agentes, contactá al soporte.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="rounded-2xl border border-slate-200 px-4 py-2.5 text-center">
            <p className="text-2xl font-bold text-slate-950">{stats.total}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center">
            <p className="text-2xl font-bold text-emerald-800">{stats.active}</p>
            <p className="text-xs text-emerald-600">Activos</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center">
            <p className="text-2xl font-bold text-amber-800">{stats.paused}</p>
            <p className="text-xs text-amber-600">Pausados</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center">
            <p className="text-2xl font-bold text-slate-600">{stats.draft}</p>
            <p className="text-xs text-slate-400">En borrador</p>
          </div>
        </div>
      </section>

      {agents.length === 0 ? (
        <SectionCard eyebrow="Sin agentes" title="Todavía no hay agentes configurados">
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
              🤖
            </div>
            <p className="font-semibold text-slate-700">Tu primer agente IA</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
              Creá un agente y asignale un número de WhatsApp. Desde ese momento empieza a atender
              leads automáticamente, todos los días del año.
            </p>
            {isManager && (
              <Link
                href={`/${orgSlug}/agents/new`}
                className="mt-5 inline-block rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Crear primer agente
              </Link>
            )}
          </div>
        </SectionCard>
      ) : (
        <section className="grid gap-6 md:grid-cols-2">
          {agents.map((agent: AgentSummary) => (
            <AgentCard key={agent.id} agent={agent} orgSlug={orgSlug} isManager={isManager} />
          ))}
        </section>
      )}

      <SectionCard
        eyebrow="¿Por qué agentes IA?"
        title="Lo que un agente hace mientras el equipo descansa"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "⏰",
              title: "Responde al instante",
              desc: "Los leads reciben respuesta en segundos, no en horas. La primera impresión hace la diferencia.",
            },
            {
              icon: "🏠",
              title: "Filtra y hace match",
              desc: "El agente entiende qué busca el cliente y propone las propiedades más relevantes del inventario.",
            },
            {
              icon: "📅",
              title: "Agenda visitas solo",
              desc: "Si el cliente está interesado, coordina fecha y hora dentro de los horarios disponibles sin intervención humana.",
            },
            {
              icon: "🌙",
              title: "Trabaja de noche",
              desc: "Consultas de madrugada, fines de semana y feriados. El agente nunca deja una consulta sin responder.",
            },
            {
              icon: "🎯",
              title: "Escala cuando importa",
              desc: "Cuando detecta un lead muy calificado o una conversación compleja, avisa al equipo con todo el contexto.",
            },
            {
              icon: "📊",
              title: "Aprende del inventario",
              desc: "Conoce cada propiedad disponible: precio, zona, características. Nunca recomienda algo reservado o vendido.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 text-2xl">{item.icon}</div>
              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

function AgentCard({
  agent,
  orgSlug,
  isManager,
}: {
  agent: AgentSummary;
  orgSlug: string;
  isManager: boolean;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-[1.75rem] border bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${
              agent.status === "ACTIVE"
                ? "bg-emerald-100 text-emerald-700"
                : agent.status === "PAUSED"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            🤖
          </div>
          <div className="min-w-0">
            <p className="font-bold leading-tight text-slate-950">{agent.name}</p>
            {agent.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{agent.description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <AgentStatusBadge status={agent.status} />
          {agent.is24x7 && <StatusBadge label="24/7" tone="info" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tono</p>
          <p className="mt-0.5 text-sm font-medium text-slate-800">{TONE_LABELS[agent.tone]}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Canal WA
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-800">
            {agent.whatsappChannelId ? "Asignado" : "Sin canal"}
          </p>
        </div>
        {agent.zoneFilters.length > 0 && (
          <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Zonas
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-800">
              {agent.zoneFilters.join(", ")}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 pt-1">
        <Link
          href={`/${orgSlug}/agents/${agent.id}`}
          className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Configurar
        </Link>
        {isManager && (
          <ToggleAgentButton
            orgSlug={orgSlug}
            agentId={agent.id}
            currentStatus={agent.status}
          />
        )}
      </div>
    </article>
  );
}