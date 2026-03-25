import "server-only";

import {
  Prisma,
} from "@prisma/client";
import type {
  WhatsAppChannelStatus,
  WhatsAppChannelVerificationStatus,
} from "@prisma/client";

import { getWhatsAppChannels } from "@/server/config/whatsapp-channels";
import { prisma } from "@/server/db/prisma";

export type ResolvedWhatsAppChannel = {
  source: "legacy-env" | "database";
  provider: "whatsapp";
  organizationId: string;
  phoneNumberId: string;
  accessToken?: string;
  channelId?: string;
  status?: WhatsAppChannelStatus;
  verificationStatus?: WhatsAppChannelVerificationStatus;
  displayPhoneNumber?: string | null;
  wabaId?: string | null;
};

const loggedResolutionEvents = new Set<string>();

function logResolutionEventOnce(
  event: string,
  payload: Record<string, string | null | undefined>,
) {
  const key = `${event}:${payload.phoneNumberId ?? "unknown"}:${payload.organizationId ?? "unknown"}:${payload.reason ?? "none"}`;

  if (loggedResolutionEvents.has(key)) {
    return;
  }

  loggedResolutionEvents.add(key);

  const writer =
    event === "db-hit"
      ? console.info
      : event === "db-miss-legacy-fallback" || event === "db-unresolved"
        ? console.warn
        : console.error;

  writer(
    JSON.stringify({
      scope: "whatsapp-channel-resolver",
      event,
      ...payload,
    }),
  );
}

function normalizeLegacyResolvedChannel(
  phoneNumberId: string,
  organizationId: string,
  accessToken: string,
): ResolvedWhatsAppChannel {
  return {
    source: "legacy-env",
    provider: "whatsapp",
    organizationId,
    phoneNumberId,
    accessToken,
    status: "ACTIVE",
    verificationStatus: "VERIFIED",
  };
}

async function resolveDatabaseChannelByPhoneNumberId(
  phoneNumberId: string,
): Promise<ResolvedWhatsAppChannel | null> {
  try {
    const channel = await prisma.whatsAppChannel.findUnique({
      where: {
        phoneNumberId,
      },
      select: {
        id: true,
        organizationId: true,
        provider: true,
        status: true,
        verificationStatus: true,
        phoneNumberId: true,
        wabaId: true,
        displayPhoneNumber: true,
        accessTokenEncrypted: true,
        organization: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!channel) {
      return null;
    }

    if (!channel.organization?.isActive) {
      logResolutionEventOnce("db-invalid", {
        phoneNumberId,
        organizationId: channel.organizationId,
        reason: "organization-inactive-or-missing",
      });

      return null;
    }

    if (channel.provider !== "WHATSAPP_CLOUD") {
      logResolutionEventOnce("db-invalid", {
        phoneNumberId,
        organizationId: channel.organizationId,
        reason: "unsupported-provider",
      });

      return null;
    }

    if (channel.status !== "ACTIVE") {
      logResolutionEventOnce("db-invalid", {
        phoneNumberId,
        organizationId: channel.organizationId,
        reason: "channel-not-active",
      });

      return null;
    }

    const runtimeAccessToken = channel.accessTokenEncrypted?.trim() || undefined;

    if (!runtimeAccessToken) {
      logResolutionEventOnce("db-invalid", {
        phoneNumberId,
        organizationId: channel.organizationId,
        reason: "missing-runtime-token",
      });

      return null;
    }

    return {
      source: "database",
      provider: "whatsapp",
      organizationId: channel.organizationId,
      phoneNumberId: channel.phoneNumberId,
      accessToken: runtimeAccessToken,
      channelId: channel.id,
      status: channel.status,
      verificationStatus: channel.verificationStatus,
      displayPhoneNumber: channel.displayPhoneNumber,
      wabaId: channel.wabaId,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      logResolutionEventOnce("db-invalid", {
        phoneNumberId,
        organizationId: undefined,
        reason: "channel-table-unavailable",
      });

      return null;
    }

    throw error;
  }
}

export async function resolveLegacyFallback(
  phoneNumberId?: string,
): Promise<ResolvedWhatsAppChannel | null> {
  const channels = getWhatsAppChannels();

  if (phoneNumberId) {
    const channel = channels[phoneNumberId];

    if (!channel) {
      return null;
    }

    return normalizeLegacyResolvedChannel(
      phoneNumberId,
      channel.organizationId,
      channel.accessToken,
    );
  }

  const [firstPhoneNumberId] = Object.keys(channels);

  if (!firstPhoneNumberId) {
    return null;
  }

  const channel = channels[firstPhoneNumberId];

  return normalizeLegacyResolvedChannel(
    firstPhoneNumberId,
    channel.organizationId,
    channel.accessToken,
  );
}

export async function resolveInboundByPhoneNumberId(
  phoneNumberId: string,
): Promise<ResolvedWhatsAppChannel | null> {
  const [databaseChannel, legacyChannel] = await Promise.all([
    resolveDatabaseChannelByPhoneNumberId(phoneNumberId),
    resolveLegacyFallback(phoneNumberId),
  ]);

  if (databaseChannel && legacyChannel && databaseChannel.organizationId !== legacyChannel.organizationId) {
    logResolutionEventOnce("db-legacy-mismatch", {
      phoneNumberId,
      organizationId: databaseChannel.organizationId,
      reason: `legacy-org-${legacyChannel.organizationId}`,
    });

    return legacyChannel;
  }

  if (databaseChannel) {
    logResolutionEventOnce("db-hit", {
      phoneNumberId,
      organizationId: databaseChannel.organizationId,
      reason: "active-channel",
    });

    return databaseChannel;
  }

  if (legacyChannel) {
    logResolutionEventOnce("db-miss-legacy-fallback", {
      phoneNumberId,
      organizationId: legacyChannel.organizationId,
      reason: "legacy-fallback",
    });

    return legacyChannel;
  }

  logResolutionEventOnce("db-unresolved", {
    phoneNumberId,
    organizationId: undefined,
    reason: "no-db-or-legacy-channel",
  });

  return null;
}
