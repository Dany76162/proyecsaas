export type PersistedOutboundResponse = {
  organizationId: string;
  conversationId: string;
  outboundMessageId: string;
  responseText: string;
  recipientPhone: string;
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
  channel: {
    provider: "whatsapp";
    phoneNumberId: string;
  };
  providerMessageId?: string;
};

const DELIVERY_TIMEOUT_MS = 8000;

function isRealRecipientPhone(value: string) {
  const normalized = value.trim();

  if (!normalized || normalized === "Unknown phone") {
    return false;
  }

  return /^\+?\d{7,20}$/.test(normalized);
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
    channel: {
      provider: "whatsapp",
      phoneNumberId: input.phoneNumberId,
    },
    providerMessageId: `simulated-${Date.now()}`,
  };
}

export async function attemptWhatsAppOutboundDelivery(
  input: PersistedOutboundResponse,
): Promise<DeliveryAttemptResult> {
  if (!input.channel.phoneNumberId) {
    return {
      deliveryStatus: "skipped",
      sendAttempted: false,
      reason: "missing-phone-number-id",
      awaitingRealDelivery: true,
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
          to: input.recipientPhone,
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
          };
        }
      | null;

    if (!response.ok) {
      return {
        deliveryStatus: "failed",
        sendAttempted: true,
        reason: payload?.error?.message ?? `provider-http-${response.status}`,
        awaitingRealDelivery: false,
        channel: {
          provider: input.channel.provider,
          phoneNumberId: input.channel.phoneNumberId,
        },
      };
    }

    return {
      deliveryStatus: "delivered",
      sendAttempted: true,
      reason: "provider-accepted",
      awaitingRealDelivery: false,
      channel: {
        provider: input.channel.provider,
        phoneNumberId: input.channel.phoneNumberId,
      },
      providerMessageId: payload?.messages?.[0]?.id,
    };
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
      channel: {
        provider: input.channel.provider,
        phoneNumberId: input.channel.phoneNumberId,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
