import { resolveInboundByPhoneNumberId, resolveLegacyFallback } from "@/server/whatsapp/channel-resolver";

function requiredEnv(name: "WHATSAPP_PHONE_NUMBER_ID" | "WHATSAPP_ORGANIZATION_ID") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`[verify-whatsapp-channel-resolution] Missing required env var: ${name}`);
  }

  return value;
}

async function main() {
  const phoneNumberId = requiredEnv("WHATSAPP_PHONE_NUMBER_ID");
  const expectedOrganizationId = requiredEnv("WHATSAPP_ORGANIZATION_ID");

  const [resolved, legacyFallback] = await Promise.all([
    resolveInboundByPhoneNumberId(phoneNumberId),
    resolveLegacyFallback(phoneNumberId),
  ]);

  const webhookResolution = resolved
    ? {
        source: resolved.source,
        organizationId: resolved.organizationId,
        phoneNumberId: resolved.phoneNumberId,
        accessTokenPresent: Boolean(resolved.accessToken),
      }
    : null;

  const workerResolution = resolved
    ? {
        source: resolved.source,
        organizationId: resolved.organizationId,
        phoneNumberId: resolved.phoneNumberId,
        accessTokenPresent: Boolean(resolved.accessToken),
      }
    : null;

  console.log(
    JSON.stringify({
      scope: "whatsapp-channel-resolution",
      event: "checked",
      expectedOrganizationId,
      webhookResolution,
      workerResolution,
      resolved: resolved
        ? {
            source: resolved.source,
            organizationId: resolved.organizationId,
            phoneNumberId: resolved.phoneNumberId,
            channelId: resolved.channelId ?? null,
            status: resolved.status ?? null,
            verificationStatus: resolved.verificationStatus ?? null,
            accessTokenPresent: Boolean(resolved.accessToken),
          }
        : null,
      legacyFallback: legacyFallback
        ? {
            source: legacyFallback.source,
            organizationId: legacyFallback.organizationId,
            phoneNumberId: legacyFallback.phoneNumberId,
            accessTokenPresent: Boolean(legacyFallback.accessToken),
          }
        : null,
      organizationMatchesExpected: resolved?.organizationId === expectedOrganizationId,
      dbBacked: resolved?.source === "database",
      outboundTokenAvailable: Boolean(resolved?.accessToken),
      legacyFallbackAvailable: Boolean(legacyFallback?.accessToken),
    }),
  );
}

void main().catch((error) => {
  console.error(
    JSON.stringify({
      scope: "whatsapp-channel-resolution",
      event: "failed",
      message: error instanceof Error ? error.message : "unknown-resolution-error",
    }),
  );
  process.exit(1);
});
