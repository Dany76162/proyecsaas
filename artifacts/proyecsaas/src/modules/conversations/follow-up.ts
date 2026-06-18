import { NotificationType, Prisma, PrismaClient } from "@prisma/client";

export type FollowUpResolutionMethod = "MANUAL" | "AUTO_REPLY" | "AUTO_SYSTEM";

type ResolveConversationFollowUpInput = {
  organizationId: string;
  conversationId: string;
  resolutionMethod: FollowUpResolutionMethod;
  link?: string;
};

export async function resolveConversationFollowUp(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: ResolveConversationFollowUpInput,
) {
  const resolvedAt = new Date();

  const runInsideTransaction = async (tx: Prisma.TransactionClient) => {
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
        title: "Seguimiento resuelto",
        body: conversation.followUpReason
          ? `${conversation.subject ?? "Conversación"}: ${conversation.followUpReason}`
          : input.resolutionMethod === "AUTO_REPLY"
            ? `${conversation.subject ?? "Conversación"} se resolvió automáticamente tras una respuesta humana.`
            : input.resolutionMethod === "AUTO_SYSTEM"
              ? `${conversation.subject ?? "Conversación"} se resolvió automáticamente al despejarse el motivo.`
            : `${conversation.subject ?? "Conversación"} fue marcada como resuelta por un operador.`,
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
  };

  if ("$transaction" in prisma) {
    return (prisma as PrismaClient).$transaction(runInsideTransaction);
  }

  return runInsideTransaction(prisma as Prisma.TransactionClient);
}
