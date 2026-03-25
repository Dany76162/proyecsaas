import { NotificationType, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export type FollowUpResolutionMethod = "MANUAL" | "AUTO_REPLY" | "AUTO_SYSTEM";

type ResolveConversationFollowUpInput = {
  organizationId: string;
  conversationId: string;
  resolutionMethod: FollowUpResolutionMethod;
  link?: string;
};

export async function resolveConversationFollowUp(input: ResolveConversationFollowUpInput) {
  const resolvedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({
      where: {
        id: input.conversationId,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        subject: true,
        followUpActive: true,
        followUpCategory: true,
        followUpReason: true,
      },
    });

    if (!conversation?.followUpActive) {
      return {
        resolved: false,
        notificationId: undefined,
      };
    }

    const updated = await tx.conversation.updateMany({
      where: {
        id: conversation.id,
        organizationId: input.organizationId,
        followUpActive: true,
      },
      data: {
        followUpActive: false,
        followUpCategory: null,
        followUpReason: null,
        followUpResolvedAt: resolvedAt,
        nextBestAction: null,
        nextBestActionAt: null,
      },
    });

    if (!updated.count) {
      return {
        resolved: false,
        notificationId: undefined,
      };
    }

    const notification = await tx.notification.create({
      data: {
        organizationId: input.organizationId,
        type: NotificationType.FOLLOW_UP_RESOLVED,
        title: "Conversation follow-up resolved",
        body: conversation.followUpReason
          ? `${conversation.subject ?? "Conversation"}: ${conversation.followUpReason}`
          : input.resolutionMethod === "AUTO_REPLY"
            ? `${conversation.subject ?? "Conversation"} was auto-resolved after a human reply.`
            : input.resolutionMethod === "AUTO_SYSTEM"
              ? `${conversation.subject ?? "Conversation"} was auto-resolved after the underlying issue cleared.`
            : `${conversation.subject ?? "Conversation"} was marked as resolved by an operator.`,
        metadata: {
          resolutionMethod: input.resolutionMethod,
          previousCategory: conversation.followUpCategory,
          previousReason: conversation.followUpReason,
        } satisfies Prisma.InputJsonValue,
        link: input.link,
        entityType: "conversation",
        entityId: conversation.id,
      },
      select: {
        id: true,
      },
    });

    return {
      resolved: true,
      notificationId: notification.id,
    };
  });
}
