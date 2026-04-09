import { prisma } from "@/server/db/prisma";
import { encryptToken } from "@/server/security/token-encryption";

function requiredEnv(name: "WHATSAPP_ACCESS_TOKEN" | "WHATSAPP_PHONE_NUMBER_ID" | "WHATSAPP_ORGANIZATION_ID") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`[backfill-whatsapp-channel] Missing required env var: ${name}`);
  }

  return value;
}

async function main() {
  const organizationId = requiredEnv("WHATSAPP_ORGANIZATION_ID");
  const phoneNumberId = requiredEnv("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = requiredEnv("WHATSAPP_ACCESS_TOKEN");

  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!organization) {
    throw new Error(
      `[backfill-whatsapp-channel] Organization ${organizationId} does not exist in the current database.`,
    );
  }

  const channel = await prisma.whatsAppChannel.upsert({
    where: {
      phoneNumberId,
    },
    update: {
      organizationId: organization.id,
      provider: "WHATSAPP_CLOUD",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      accessTokenEncrypted: encryptToken(accessToken),
      webhookSubscribed: true,
      tokenLastValidatedAt: new Date(),
      lastErrorAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
    create: {
      organizationId: organization.id,
      provider: "WHATSAPP_CLOUD",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      phoneNumberId,
      accessTokenEncrypted: encryptToken(accessToken),
      webhookSubscribed: true,
      tokenLastValidatedAt: new Date(),
      isPrimary: true,
    },
    select: {
      id: true,
      organizationId: true,
      phoneNumberId: true,
      provider: true,
      status: true,
      verificationStatus: true,
      isPrimary: true,
    },
  });

  console.log(
    JSON.stringify({
      scope: "whatsapp-channel-backfill",
      event: "upserted",
      channelId: channel.id,
      organizationId: channel.organizationId,
      organizationSlug: organization.slug,
      organizationName: organization.name,
      phoneNumberId: channel.phoneNumberId,
      provider: channel.provider,
      status: channel.status,
      verificationStatus: channel.verificationStatus,
      isPrimary: channel.isPrimary,
      accessTokenStored: true,
    }),
  );
}

void main()
  .catch((error) => {
    console.error(
      JSON.stringify({
        scope: "whatsapp-channel-backfill",
        event: "failed",
        message: error instanceof Error ? error.message : "unknown-backfill-error",
      }),
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
