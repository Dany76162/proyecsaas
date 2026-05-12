import { Prisma, PrismaClient } from "@prisma/client";
import { resolveConversationFollowUp } from "@/modules/conversations/follow-up";

export type PersistedOutboundResponse = {
  organizationId: string;
  conversationId: string;
  outboundMessageId: string;
  responseText: string;
  recipientPhone: string;
  senderKind?: "automation" | "human";
  deliveryLink?: string;
  channel: {
    provider: "whatsapp";
    phoneNumberId: string;
    accessToken?: string;
  };
};

export type DeliveryAttemptResult = {
  deliveryStatus: "delivered" | "skipped" | "failed";
  sendAttempted: boolean;
  reason: string;
  awaitingRealDelivery: boolean;
  attemptedAt: string | null;
  channel: {
    provider: "whatsapp";
    phoneNumberId: string;
  };
  providerMessageId?: string;
};

const DELIVERY_TIMEOUT_MS = 8000;

function formatWhatsAppProviderError(input: {
  httpStatus: number;
  message?: string;
  code?: number | string;
  type?: string;
  subcode?: number | string;
  fbtraceId?: string;
}) {
  const parts = [`provider-http-${input.httpStatus}`];

  if (input.code !== undefined && input.code !== null && String(input.code).trim()) {
    parts.push(`wa_code=${String(input.code).trim()}`);
  }
  if (input.subcode !== undefined && input.subcode !== null && String(input.subcode).trim()) {
    parts.push(`wa_subcode=${String(input.subcode).trim()}`);
  }
  if (input.type && input.type.trim()) {
    parts.push(`wa_type=${input.type.trim()}`);
  }
  if (input.fbtraceId && input.fbtraceId.trim()) {
    parts.push(`wa_trace=${input.fbtraceId.trim()}`);
  }
  if (input.message && input.message.trim()) {
    parts.push(`message=${input.message.trim()}`);
  }

  return parts.join(" | ");
}

function isRealRecipientPhone(value: string) {
  const normalized = value.trim();

  if (!normalized || normalized === "Unknown phone") {
    return false;
  }

  return /^\+?\d{7,20}$/.test(normalized);
}

function normalizeWhatsAppRecipientPhone(value: string) {
  const digitsOnly = value.replace(/\D/g, "");

  // Workaround sandbox Meta / Argentina:
  // inbound suele venir como 54911...
  // pero el sandbox allowed list muchas veces espera 5411...
  if (digitsOnly.startsWith("549") && digitsOnly.length === 13) {
    return "54" + digitsOnly.slice(3);
  }

  return digitsOnly;
}

export async function attemptSimulatedWhatsAppOutboundDelivery(input: {
  phoneNumberId: string;
  responseText: string;
}): Promise<DeliveryAttemptResult> {
  if (!input.phoneNumberId) {
    return {
      deliveryStatus: "skipped",
      sendAttempted: false,
      reason: "missing-phone-number-id",
      awaitingRealDelivery: true,
      attemptedAt: null,
      channel: {
        provider: "whatsapp",
        phoneNumberId: "",
      },
    };
  }

  if (!input.responseText.trim()) {
    return {
      deliveryStatus: "failed",
      sendAttempted: false,
      reason: "empty-response-text",
      awaitingRealDelivery: false,
      attemptedAt: null,
      channel: {
        provider: "whatsapp",
        phoneNumberId: input.phoneNumberId,
      },
    };
  }

  return {
    deliveryStatus: "delivered",
    sendAttempted: true,
    reason: "dev-simulated-delivery",
    awaitingRealDelivery: false,
    attemptedAt: new Date().toISOString(),
    channel: {
      provider: "whatsapp",
      phoneNumberId: input.phoneNumberId,
    },
    providerMessageId: `simulated-${Date.now()}`,
  };
}

export async function attemptWhatsAppOutboundDelivery(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: PersistedOutboundResponse,
): Promise<DeliveryAttemptResult> {
  if (!input.channel.phoneNumberId) {
    return {
      deliveryStatus: "skipped",
      sendAttempted: false,
      reason: "missing-phone-number-id",
      awaitingRealDelivery: true,
      attemptedAt: null,
      channel: {
        provider: input.channel.provider,
        phoneNumberId: "",
      },
    };
  }

  if (!input.responseText.trim()) {
    return {
      deliveryStatus: "failed",
      sendAttempted: false,
      reason: "empty-response-text",
      awaitingRealDelivery: false,
      attemptedAt: null,
      channel: {
        provider: input.channel.provider,
        phoneNumberId: input.channel.phoneNumberId,
      },
    };
  }

  if (!isRealRecipientPhone(input.recipientPhone)) {
    return {
      deliveryStatus: "failed",
      sendAttempted: false,
      reason: "invalid-recipient-phone",
      awaitingRealDelivery: false,
      attemptedAt: null,
      channel: {
        provider: input.channel.provider,
        phoneNumberId: input.channel.phoneNumberId,
      },
    };
  }

  if (!input.channel.accessToken) {
    return {
      deliveryStatus: "skipped",
      sendAttempted: false,
      reason: "missing-access-token",
      awaitingRealDelivery: true,
      attemptedAt: null,
      channel: {
        provider: input.channel.provider,
        phoneNumberId: input.channel.phoneNumberId,
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, DELIVERY_TIMEOUT_MS);

  const finalTo = normalizeWhatsAppRecipientPhone(input.recipientPhone);
  const attemptedAt = new Date().toISOString();

  try {
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${input.channel.phoneNumberId}/messages`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${input.channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: finalTo,
          type: "text",
          text: {
            body: input.responseText,
          },
        }),
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | {
        messages?: Array<{
          id?: string;
        }>;
        error?: {
          message?: string;
          type?: string;
          code?: number;
          error_subcode?: number;
          fbtrace_id?: string;
        };
      }
      | null;

    if (!response.ok) {
      return {
        deliveryStatus: "failed",
        sendAttempted: true,
        reason: formatWhatsAppProviderError({
          httpStatus: response.status,
          message: payload?.error?.message,
          type: payload?.error?.type,
          code: payload?.error?.code,
          subcode: payload?.error?.error_subcode,
          fbtraceId: payload?.error?.fbtrace_id,
        }),
        awaitingRealDelivery: false,
        attemptedAt,
        channel: {
          provider: input.channel.provider,
          phoneNumberId: input.channel.phoneNumberId,
        },
      };
    }

    const deliveryResult: DeliveryAttemptResult = {
      deliveryStatus: "delivered",
      sendAttempted: true,
      reason: "provider-accepted",
      awaitingRealDelivery: false,
      attemptedAt,
      channel: {
        provider: input.channel.provider,
        phoneNumberId: input.channel.phoneNumberId,
      },
      providerMessageId: payload?.messages?.[0]?.id,
    };

    if (input.senderKind === "human") {
      try {
        await resolveConversationFollowUp(prisma, {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          resolutionMethod: "AUTO_REPLY",
          link: input.deliveryLink,
        });
      } catch (error) {
        console.error(
          JSON.stringify({
            scope: "automation-delivery",
            event: "follow-up-auto-clear-failed",
            organizationId: input.organizationId,
            conversationId: input.conversationId,
            outboundMessageId: input.outboundMessageId,
            message:
              error instanceof Error ? error.message : "unknown-follow-up-auto-clear-error",
          }),
        );
      }
    }

    return deliveryResult;
  } catch (error) {
    return {
      deliveryStatus: "failed",
      sendAttempted: true,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? `provider-timeout-${DELIVERY_TIMEOUT_MS}ms`
          : error instanceof Error
            ? error.message
            : "provider-request-failed",
      awaitingRealDelivery: false,
      attemptedAt,
      channel: {
        provider: input.channel.provider,
        phoneNumberId: input.channel.phoneNumberId,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
