"use client";

import { useTransition } from "react";
import { toggleAgentStatus } from "@/modules/agents/actions";

type AiAgentStatus = "ACTIVE" | "PAUSED" | "DRAFT";

export function ToggleAgentButton({
  orgSlug,
  agentId,
  currentStatus,
}: {
  orgSlug: string;
  agentId: string;
  currentStatus: AiAgentStatus;
}) {
  const [isPending, startTransition] = useTransition();

  const label = currentStatus === "ACTIVE" ? "Pausar" : "Activar";

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleAgentStatus(orgSlug, agentId);
        })
      }
      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Guardando..." : label}
    </button>
  );
}