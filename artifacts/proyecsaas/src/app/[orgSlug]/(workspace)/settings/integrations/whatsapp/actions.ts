"use server";

import { revalidatePath } from "next/cache";

import { MembershipRole, Prisma, WhatsAppChannelVerificationStatus } from "@prisma/client";
import { z } from "zod";

import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { encryptToken } from "@/server/security/token-encryption";
import {
  MetaWhatsAppValidationError,
  validateWhatsAppCloudNumber,
} from "@/server/whatsapp/meta";

export type WhatsAppConnectionActionState = {
  success: boolean;
  message: string;
  connectedChannel?: {
    phoneNumberId: string;
    displayPhoneNumber: string | null;
    verifiedDisplayName: string | null;
    status: string;
  };
};

const whatsappConnectionSchema = z.object({
  orgSlug: z.string().trim().min(1).max(120),
  phoneNumberId: z.string().trim().min(1, "Phone Number ID is required.").max(120),
  accessToken: z.string().trim().min(1, "Access Token is required.").max(4096),
});

const whatsappRequestSchema = z.object({
  orgSlug: z.string().trim().min(1),
  requestedPhoneNumber: z.string().trim().min(5, "Número de teléfono inválido"),
  businessName: z.string().trim().min(2, "Nombre comercial requerido"),
  contactName: z.string().trim().min(2, "Nombre de contacto requerido"),
  contactEmail: z.string().email("Email inválido"),
  notes: z.string().optional(),
});

export async function saveWhatsAppChannelAction(
  _prevState: WhatsAppConnectionActionState | null,
  formData: FormData,
): Promise<WhatsAppConnectionActionState> {
  const parsed = whatsappConnectionSchema.safeParse({
    orgSlug: String(formData.get("orgSlug") ?? ""),
    phoneNumberId: String(formData.get("phoneNumberId") ?? ""),
    accessToken: String(formData.get("accessToken") ?? ""),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Complete the WhatsApp fields and try again.",
    };
  }

  const { orgSlug, phoneNumberId, accessToken } = parsed.data;
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);
  const organizationId = membership.organization.id;

  try {
    const validatedNumber = await validateWhatsAppCloudNumber(phoneNumberId, accessToken);

    const conflictingChannel = await prisma.whatsAppChannel.findUnique({
      where: {
        phoneNumberId: validatedNumber.phoneNumberId,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (conflictingChannel && conflictingChannel.organizationId !== organizationId) {
      return {
        success: false,
        message:
          "That Phone Number ID is already connected to another organization. Use a different number or disconnect it first.",
      };
    }

    const existingOrganizationChannel = await prisma.whatsAppChannel.findFirst({
      where: {
        organizationId,
        provider: "WHATSAPP_CLOUD",
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
      },
    });

    const targetChannelId = conflictingChannel?.id ?? existingOrganizationChannel?.id;

    const savedChannel = targetChannelId
      ? await prisma.whatsAppChannel.update({
          where: {
            id: targetChannelId,
          },
          data: {
            phoneNumberId: validatedNumber.phoneNumberId,
            accessTokenEncrypted: encryptToken(accessToken),
            displayPhoneNumber: validatedNumber.displayPhoneNumber,
            verifiedDisplayName: validatedNumber.verifiedName,
            provider: "WHATSAPP_CLOUD",
            status: "ACTIVE",
            verificationStatus: WhatsAppChannelVerificationStatus.VERIFIED,
            tokenLastValidatedAt: new Date(),
            lastErrorAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            isPrimary: true,
          },
          select: {
            phoneNumberId: true,
            displayPhoneNumber: true,
            verifiedDisplayName: true,
            status: true,
          },
        })
      : await prisma.whatsAppChannel.create({
          data: {
            organizationId,
            phoneNumberId: validatedNumber.phoneNumberId,
            accessTokenEncrypted: encryptToken(accessToken),
            displayPhoneNumber: validatedNumber.displayPhoneNumber,
            verifiedDisplayName: validatedNumber.verifiedName,
            provider: "WHATSAPP_CLOUD",
            status: "ACTIVE",
            verificationStatus: WhatsAppChannelVerificationStatus.VERIFIED,
            tokenLastValidatedAt: new Date(),
            isPrimary: true,
          },
          select: {
            phoneNumberId: true,
            displayPhoneNumber: true,
            verifiedDisplayName: true,
            status: true,
          },
        });

    await prisma.whatsAppChannel.updateMany({
      where: {
        organizationId,
        provider: "WHATSAPP_CLOUD",
        NOT: {
          phoneNumberId: savedChannel.phoneNumberId,
        },
      },
      data: {
        status: "INACTIVE",
        isPrimary: false,
      },
    });

    revalidatePath(`/${orgSlug}`);
    revalidatePath(`/${orgSlug}/settings/integrations`);
    revalidatePath(`/${orgSlug}/settings/integrations/whatsapp`);

    return {
      success: true,
      message: "WhatsApp was validated with Meta and is now connected for this workspace.",
      connectedChannel: {
        phoneNumberId: savedChannel.phoneNumberId,
        displayPhoneNumber: savedChannel.displayPhoneNumber,
        verifiedDisplayName: savedChannel.verifiedDisplayName,
        status: savedChannel.status,
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        message:
          "That Phone Number ID is already saved in another channel record. Refresh the page and try again.",
      };
    }

    if (error instanceof MetaWhatsAppValidationError) {
      return {
        success: false,
        message: error.message,
      };
    }

    console.error(
      JSON.stringify({
        scope: "whatsapp-settings",
        event: "channel-save-failed",
        organizationId,
        phoneNumberId,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );

    return {
      success: false,
      message:
        "The number could not be connected right now. Check the Meta credentials and try again.",
    };
  }
}

export async function requestWhatsAppConnectionAction(
  _prevState: any,
  formData: FormData
) {
  const parsed = whatsappRequestSchema.safeParse({
    orgSlug: String(formData.get("orgSlug") ?? ""),
    requestedPhoneNumber: String(formData.get("requestedPhoneNumber") ?? ""),
    businessName: String(formData.get("businessName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Error en los datos",
    };
  }

  const { orgSlug, ...data } = parsed.data;
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  try {
    await prisma.whatsAppChannelConnectionRequest.create({
      data: {
        organizationId: membership.organization.id,
        ...data,
        status: "PENDING",
      },
    });

    revalidatePath(`/${orgSlug}/settings/integrations/whatsapp`);
    return {
      success: true,
      message: "Tu solicitud ha sido enviada. El equipo de RaicesPilot se pondrá en contacto pronto.",
    };
  } catch (error) {
    console.error("[requestWhatsAppConnectionAction] Error:", error);
    return {
      success: false,
      message: "No se pudo enviar la solicitud. Intentá de nuevo más tarde.",
    };
  }
}
