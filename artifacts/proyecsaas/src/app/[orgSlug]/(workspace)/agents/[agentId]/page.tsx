export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";

import { StatusBadge } from "@/components/workspace/status-badge";
import { requireOrganizationMembership } from "@/server/auth/access";
import { getAgentDetail, getAvailableChannels } from "@/modules/agents/service";
import { updateAgent, deleteAgent } from "@/modules/agents/actions";
import { STATUS_LABELS, TONE_LABELS } from "@/modules/agents/types";
import { AgentForm } from "../agent-form";
import { ToggleAgentButton } from "../toggle-agent-button";
import { AgentTestChat } from "./agent-test-chat";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; agentId: string }>;
}) {
  const { orgSlug, agentId } = await params;
  const { membership } = await requireOrganizationMembership(orgSlug);

  const orgId = membership.organization.id;
  const isManager = membership.role === "OWNER" || membership.role === "ADMIN";

  const [agent, channels] = await Promise.all([
    getAgentDetail(agentId, orgId),
    isManager ? getAvailableChannels(orgId) : Promise.resolve([]),
  ]);

  if (!agent) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    const result = await updateAgent(orgSlug, agentId, {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      tone: (formData.get("tone") as "FORMAL" | "FRIENDLY" | "NEUTRAL") ?? "FRIENDLY",
      language: (formData.get("language") as string) || "es-AR",
      persona: (formData.get("persona") as string) || undefined,
      is24x7: formData.get("is24x7") === "true",
      whatsappChannelId: (formData.get("whatsappChannelId") as string) || null,
      zoneFilters: ((formData.get("zoneFilters") as string) || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      propertyTypes: formData.getAll("propertyTypes") as string[],
      minBudget: formData.get("minBudget") ? Number(formData.get("minBudget")) : null,
      maxBudget: formData.get("maxBudget") ? Number(formData.get("maxBudget")) : null,
      escalateAfterMessages: Number(formData.get("escalateAfterMessages") ?? "5"),
      escalateOnKeywords: ((formData.get("escalateOnKeywords") as string) || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      humanHandoffMessage: (formData.get("humanHandoffMessage") as string) || undefined,
    });

    if (result.success) {
      redirect(`/${orgSlug}/agents/${agentId}`);
    }
  }

  async function handleDelete(formData: FormData) {
    "use server";
    await deleteAgent(orgSlug, agentId);
    redirect(`/${orgSlug}/agents`);
  }

  const statusTone =
    agent.status === "ACTIVE" ? "success" : agent.status === "PAUSED" ? "warning" : "neutral";

  if (!isManager) {
    return (
      <div className="flex flex-col gap-6">
        {/* Read-only view for non-managers */}
        <div className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
              🤖
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">{agent.name}</h1>
              {agent.description && (
                <p className="text-sm text-slate-500">{agent.description}</p>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <StatusBadge label={STATUS_LABELS[agent.status]} tone={statusTone} />
            {agent.is24x7 && <StatusBadge label="24/7 disponible" tone="success" />}
            <StatusBadge label={`Tono: ${TONE_LABELS[agent.tone]}`} tone="neutral" />
          </div>
          {agent.zoneFilters.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Zonas asignadas</p>
              <p className="mt-1 text-sm text-slate-700">{agent.zoneFilters.join(", ")}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Status bar */}
      <div className="rounded-[1.75rem] border bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                agent.status === "ACTIVE"
                  ? "bg-emerald-100"
                  : agent.status === "PAUSED"
                    ? "bg-amber-100"
                    : "bg-slate-100"
              }`}
            >
              🤖
            </div>
            <div>
              <p className="font-bold text-slate-950">{agent.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge label={STATUS_LABELS[agent.status]} tone={statusTone} />
                {agent.is24x7 && <StatusBadge label="24/7" tone="success" />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ToggleAgentButton
              orgSlug={orgSlug}
              agentId={agentId}
              currentStatus={agent.status}
            />
            <form action={handleDelete}>
              <button
                type="submit"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                onClick={(e) => {
                  if (!confirm(`¿Eliminar el agente "${agent.name}"? Esta acción no se puede deshacer.`)) {
                    e.preventDefault();
                  }
                }}
              >
                Eliminar
              </button>
            </form>
          </div>
        </div>

        {agent.status === "DRAFT" && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Este agente está en borrador.</strong> Completá la configuración y activalo para que empiece a atender consultas.
          </div>
        )}
      </div>

      <AgentForm
        orgSlug={orgSlug}
        action={handleUpdate}
        channels={channels}
        agent={agent}
        mode="edit"
      />

      <AgentTestChat
        agentId={agentId}
        orgSlug={orgSlug}
        agentName={agent.name}
      />
    </div>
  );
}
