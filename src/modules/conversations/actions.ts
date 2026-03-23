"use server";

import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getOrganizationBySlug } from "@/server/db/organization-context";
import { prisma } from "@/server/db/prisma";

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

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      subject: true,
      followUpActive: true,
      followUpReason: true,
    },
  });

  if (!conversation?.followUpActive) {
    return;
  }

  const resolvedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        followUpActive: false,
        followUpResolvedAt: resolvedAt,
      },
    });

    await tx.notification.create({
      data: {
        organizationId: organization.id,
        type: NotificationType.FOLLOW_UP_RESOLVED,
        title: "Conversation follow-up resolved",
        body: conversation.followUpReason
          ? `${conversation.subject ?? "Conversation"}: ${conversation.followUpReason}`
          : `${conversation.subject ?? "Conversation"} was marked as resolved by an operator.`,
        link: `/${orgSlug}/conversations`,
        entityType: "conversation",
        entityId: conversation.id,
      },
    });
  });

  revalidatePath(`/${orgSlug}/conversations`);
  revalidatePath(`/${orgSlug}`);

  if (leadId) {
    revalidatePath(`/${orgSlug}/leads/${leadId}`);
  }
}
