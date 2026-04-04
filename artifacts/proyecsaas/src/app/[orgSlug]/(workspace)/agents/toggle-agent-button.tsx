"use client";

import { useTransition } from "react";
import { toggleAgentStatus } from "@/modules/agents/actions";
import type { AiAgentStatus } from "@prisma/client";

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

  const isActive = currentStatus === "ACTIVE";

  function handleToggle() {
    startTransition(async () => {
      await toggleAgentStatus(orgSlug, agentId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending || currentStatus === "DRAFT"}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${
        isActive
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
      title={currentStatus === "DRAFT" ? "Completá la configuración primero" : undefined}
    >
      {isPending ? "..." : isActive ? "Pausar" : "Activar"}
    </button>
  );
}
