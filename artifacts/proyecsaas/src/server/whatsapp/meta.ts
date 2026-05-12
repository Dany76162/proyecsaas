import "server-only";

const META_GRAPH_BASE_URL = "https://graph.facebook.com";
const META_GRAPH_VERSION = "v22.0";

type MetaGraphSuccessResponse = {
  display_phone_number?: string;
  verified_name?: string;
};

type MetaGraphErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

export type ValidatedMetaWhatsAppNumber = {
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
};

export class MetaWhatsAppValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaWhatsAppValidationError";
  }
}

function sanitizeMetaField(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildMetaValidationError(payload: MetaGraphErrorPayload): string {
  const message = payload.error?.message?.trim();
  const code = payload.error?.code;

  if (message) {
    if (code) {
      return `Meta validation failed (${code}): ${message}`;
    }

    return `Meta validation failed: ${message}`;
  }

  return "Meta validation failed. Check the Phone Number ID and Access Token, then try again.";
}

export async function validateWhatsAppCloudNumber(
  phoneNumberId: string,
  accessToken: string,
): Promise<ValidatedMetaWhatsAppNumber> {
  const url = new URL(
    `${META_GRAPH_BASE_URL}/${META_GRAPH_VERSION}/${encodeURIComponent(phoneNumberId)}`,
  );
  url.searchParams.set("fields", "display_phone_number,verified_name");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    throw new MetaWhatsAppValidationError(
      buildMetaValidationError((payload ?? {}) as MetaGraphErrorPayload),
    );
  }

  const successPayload = (payload ?? {}) as MetaGraphSuccessResponse;

  return {
    phoneNumberId,
    displayPhoneNumber: sanitizeMetaField(successPayload.display_phone_number),
    verifiedName: sanitizeMetaField(successPayload.verified_name),
  };
}
