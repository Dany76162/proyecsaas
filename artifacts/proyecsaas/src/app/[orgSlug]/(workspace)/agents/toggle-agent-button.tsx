"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleAgentStatus(orgSlug, agentId);
        })
      }
    >
      {isPending ? "Guardando..." : label}
    </Button>
  );
}