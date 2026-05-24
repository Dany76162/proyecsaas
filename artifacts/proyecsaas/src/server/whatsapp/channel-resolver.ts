import {
  Prisma,
  PrismaClient,
} from "@prisma/client";
import type {
  WhatsAppChannelStatus,
  WhatsAppChannelVerificationStatus,
} from "@prisma/client";

import { getWhatsAppChannels } from "@/server/config/whatsapp-channels";
import { decryptToken } from "@/server/security/token-encryption";

export type ResolvedWhatsAppChannel = {
  source: "legacy-env" | "database";
  provider: "whatsapp" | "evolution";
  organizationId: string;
  phoneNumberId?: string;
  instanceName?: string;
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
  const key = `${event}:${payload.phoneNumberId ?? payload.instanceName ?? "unknown"}:${payload.organizationId ?? "unknown"}:${payload.reason ?? "none"}`;

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
  prisma: PrismaClient | Prisma.TransactionClient,
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
        instanceName: true,
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

    if (channel.status !== "ACTIVE") {
      logResolutionEventOnce("db-invalid", {
        phoneNumberId,
        organizationId: channel.organizationId,
        reason: "channel-not-active",
      });

      return null;
    }

    if (channel.provider === "EVOLUTION_API") {
      if (!channel.instanceName) {
        logResolutionEventOnce("db-invalid", {
          phoneNumberId,
          organizationId: channel.organizationId,
          reason: "missing-instance-name",
        });
        return null;
      }

      return {
        source: "database",
        provider: "evolution",
        organizationId: channel.organizationId,
        instanceName: channel.instanceName,
        channelId: channel.id,
        status: channel.status,
        verificationStatus: channel.verificationStatus,
        displayPhoneNumber: channel.displayPhoneNumber,
      };
    }

    if (channel.provider !== "WHATSAPP_CLOUD") {
      logResolutionEventOnce("db-invalid", {
        phoneNumberId,
        organizationId: channel.organizationId,
        reason: "unsupported-provider",
      });

      return null;
    }

    const rawToken = channel.accessTokenEncrypted?.trim() || undefined;
    const runtimeAccessToken = rawToken ? decryptToken(rawToken) : undefined;

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PLATFORM ROUTING â€” Option A
// Each org gets a WhatsApp link with a routing code: [ref:orgslug]
// When a lead sends the first message, the system extracts the slug and routes
// to the correct org. Subsequent messages are routed by existing conversation.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ROUTING_CODE_REGEX = /^\[ref:([a-z0-9_-]+)\]\s*/i;

/**
 * Extracts the org slug from the routing code at the start of a message.
 * Returns null if no routing code is present.
 * Example: "[ref:raices] Hola, me interesa una propiedad" → "raices"
 */
export function extractOrgSlugFromMessage(text: string): string | null {
  const match = text.trim().match(ROUTING_CODE_REGEX);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Strips the routing code from a message body so the AI sees clean text.
 * Example: "[ref:raices] Hola, me interesa" → "Hola, me interesa"
 */
export function stripRoutingCodeFromMessage(text: string): string {
  return text.trim().replace(ROUTING_CODE_REGEX, "").trim();
}

/**
 * Looks up an active organization by slug for platform-level routing.
 */
export async function resolveOrgBySlug(
  prisma: PrismaClient | Prisma.TransactionClient,
  slug: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  try {
    return await (prisma as PrismaClient).organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, isActive: true },
    }).then((org) => (org?.isActive ? { id: org.id, name: org.name, slug: org.slug } : null));
  } catch {
    return null;
  }
}

export async function resolveInboundByPhoneNumberId(
  prisma: PrismaClient | Prisma.TransactionClient,
  phoneNumberId: string,
): Promise<ResolvedWhatsAppChannel | null> {
  const [databaseChannel, legacyChannel] = await Promise.all([
    resolveDatabaseChannelByPhoneNumberId(prisma, phoneNumberId),
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

/**
 * Resolves the primary active WhatsApp channel for a given organization.
 * Used when the sender is the org itself (e.g., superadmin support replies).
 * Priority: isPrimary=true → oldest active channel.
 */
export async function resolveActiveChannelByOrgId(
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationId: string,
): Promise<ResolvedWhatsAppChannel | null> {
  try {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { organizationId, status: "ACTIVE" },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        provider: true,
        status: true,
        verificationStatus: true,
        phoneNumberId: true,
        instanceName: true,
        displayPhoneNumber: true,
        wabaId: true,
        accessTokenEncrypted: true,
      },
    });

    if (!channel) return null;

    if (channel.provider === "EVOLUTION_API") {
      if (!channel.instanceName) return null;
      return {
        source: "database",
        provider: "evolution",
        organizationId,
        instanceName: channel.instanceName,
        channelId: channel.id,
        status: channel.status,
        verificationStatus: channel.verificationStatus,
        displayPhoneNumber: channel.displayPhoneNumber,
      };
    }

    if (channel.provider !== "WHATSAPP_CLOUD") return null;

    const rawToken = channel.accessTokenEncrypted?.trim() || undefined;
    const runtimeAccessToken = rawToken ? decryptToken(rawToken) : undefined;
    if (!runtimeAccessToken) return null;

    return {
      source: "database",
      provider: "whatsapp",
      organizationId,
      phoneNumberId: channel.phoneNumberId,
      accessToken: runtimeAccessToken,
      channelId: channel.id,
      status: channel.status,
      verificationStatus: channel.verificationStatus,
      displayPhoneNumber: channel.displayPhoneNumber,
      wabaId: channel.wabaId,
    };
  } catch {
    return null;
  }
}

export async function resolveDatabaseChannelByInstanceName(
  prisma: PrismaClient | Prisma.TransactionClient,
  instanceName: string,
): Promise<ResolvedWhatsAppChannel | null> {
  try {
    const channel = await prisma.whatsAppChannel.findUnique({
      where: {
        instanceName,
      },
      select: {
        id: true,
        organizationId: true,
        provider: true,
        status: true,
        verificationStatus: true,
        phoneNumberId: true,
        instanceName: true,
        displayPhoneNumber: true,
        organization: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!channel || !channel.organization?.isActive || channel.status !== "ACTIVE") {
      return null;
    }

    return {
      source: "database",
      provider: "evolution",
      organizationId: channel.organizationId,
      instanceName: channel.instanceName!,
      channelId: channel.id,
      status: channel.status,
      verificationStatus: channel.verificationStatus,
      displayPhoneNumber: channel.displayPhoneNumber,
    };
  } catch (error) {
    return null;
  }
}
