import { redirect } from "next/navigation";

import { requireOrganizationMembership, assertMinimumRole } from "@/server/auth/access";
import { getAvailableChannels } from "@/modules/agents/service";
import { createAgent } from "@/modules/agents/actions";
import { AgentForm } from "../agent-form";

export default async function NewAgentPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, "ADMIN");

  const orgId = membership.organization.id;
  const channels = await getAvailableChannels(orgId);

  async function handleCreate(formData: FormData) {
    "use server";
    const result = await createAgent(orgSlug, {
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
      redirect(`/${orgSlug}/agents`);
    }
  }

  return (
    <AgentForm
      orgSlug={orgSlug}
      action={handleCreate}
      channels={channels}
      mode="create"
    />
  );
}
