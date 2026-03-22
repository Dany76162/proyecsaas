import "server-only";

type WhatsAppChannelConfig = {
  organizationId: string;
  accessToken: string;
};

let hasWarnedForPartialWhatsAppConfig = false;

export function getWhatsAppChannels(): Record<string, WhatsAppChannelConfig> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const organizationId = process.env.WHATSAPP_ORGANIZATION_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const providedCount = [phoneNumberId, organizationId, accessToken].filter(Boolean).length;

  if (providedCount > 0 && providedCount < 3 && !hasWarnedForPartialWhatsAppConfig) {
    hasWarnedForPartialWhatsAppConfig = true;
    console.warn(
      "[automation-config] Partial WhatsApp channel configuration detected. WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ORGANIZATION_ID, and WHATSAPP_ACCESS_TOKEN must all be set for runtime delivery.",
    );
  }

  if (!phoneNumberId || !organizationId || !accessToken) {
    return {};
  }

  return {
    [phoneNumberId]: {
      organizationId,
      accessToken,
    },
  };
}
