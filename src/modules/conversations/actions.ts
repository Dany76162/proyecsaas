"use server";

import { revalidatePath } from "next/cache";

import { resolveConversationFollowUp } from "@/modules/conversations/follow-up";
import { getOrganizationBySlug } from "@/server/db/organization-context";

export async function resolveConversationFollowUpAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const conversationId = String(formData.get("conversationId") ?? "");
  const leadId = String(formData.get("leadId") ?? "");

  if (!orgSlug || !conversationId) {
    return;
  }

  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    return;
  }

  await resolveConversationFollowUp({
    organizationId: organization.id,
    conversationId,
    resolutionMethod: "MANUAL",
    link: `/${orgSlug}/conversations`,
  });

  revalidatePath(`/${orgSlug}/conversations`);
  revalidatePath(`/${orgSlug}`);

  if (leadId) {
    revalidatePath(`/${orgSlug}/leads/${leadId}`);
  }
}
