/**
 * Resolves the platform-level WhatsApp channel status for display in the
 * Admin Inmobiliario panel.
 *
 * Separates two independent concerns:
 *   1. Platform phone number  â€” the human-readable number stored in GlobalSetting.
 *   2. Meta Cloud API channel â€” whether the env-based Cloud API credentials are present.
 *
 * This is the ONLY place that should be called to get this composite status.
 * It avoids reading env vars inside page/component code.
 */

import { prisma } from "@/server/db/prisma";

export type MetaChannelStatus =
  | "connected"     // phone ID + access token + org mapping present
  | "partial"       // some env vars set but not all three required
  | "not_configured"; // none of the WhatsApp env vars are set

export interface PlatformWhatsAppStatus {
  /** Human-readable phone number (e.g. "5491166037990"). Null if not configured yet. */
  platformPhone: string | null;
  /** Status of the Meta Cloud API channel credentials. */
  metaStatus: MetaChannelStatus;
  /** True only when platformPhone is set AND Meta is connected. */
  fullyActive: boolean;
}

function resolveMetaStatus(): MetaChannelStatus {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const orgId = process.env.WHATSAPP_ORGANIZATION_ID?.trim();

  const count = [phoneId, token, orgId].filter(Boolean).length;
  if (count === 3) return "connected";
  if (count > 0) return "partial";
  return "not_configured";
}

export async function getPlatformWhatsAppStatus(): Promise<PlatformWhatsAppStatus> {
  // Read the platform phone from GlobalSetting (source of truth, editable by superadmin).
  // Fall back to env var for backwards compatibility during transition.
  let platformPhone: string | null = null;

  try {
    const row = await prisma.globalSetting.findUnique({
      where: { key: "PLATFORM_WHATSAPP_NUMBER" },
      select: { value: true },
    });
    platformPhone =
      row?.value?.trim() ||
      process.env.WHATSAPP_PLATFORM_PHONE_DISPLAY?.trim() ||
      null;
  } catch {
    // DB unavailable â€” fall back to env
    platformPhone = process.env.WHATSAPP_PLATFORM_PHONE_DISPLAY?.trim() || null;
  }

  const metaStatus = resolveMetaStatus();

  return {
    platformPhone,
    metaStatus,
    fullyActive: !!platformPhone && metaStatus === "connected",
  };
}
