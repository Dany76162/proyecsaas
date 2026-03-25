"use server";

import { revalidatePath } from "next/cache";

import { MembershipRole } from "@prisma/client";

import { resolveConversationFollowUp } from "@/modules/conversations/follow-up";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";

export async function resolveConversationFollowUpAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const conversationId = String(formData.get("conversationId") ?? "");
  const leadId = String(formData.get("leadId") ?? "");

  if (!orgSlug || !conversationId) {
    return;
  }

  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);
  const organization = membership.organization;

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
