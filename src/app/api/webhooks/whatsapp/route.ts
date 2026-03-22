import { createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getWhatsAppChannels } from "@/server/config/whatsapp-channels";
import { getAutomationQueue } from "@/server/queues";

export const runtime = "nodejs";

type WhatsAppWebhookValue = {
  metadata?: {
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile?: {
      name?: string;
    };
    wa_id?: string;
  }>;
  messages?: Array<{
    id?: string;
    from?: string;
    timestamp?: string;
    type?: string;
    text?: {
      body?: string;
    };
  }>;
};

type WhatsAppWebhookMessage = NonNullable<WhatsAppWebhookValue["messages"]>[number];
const ENQUEUE_TIMEOUT_MS = 3000;

function validateSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    return true;
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
}

export async function GET(request: NextRequest) {
  const verifyToken = request.nextUrl.searchParams.get("hub.verify_token") ?? "";
  const challenge = request.nextUrl.searchParams.get("hub.challenge") ?? "";
  const expectedVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!expectedVerifyToken || verifyToken !== expectedVerifyToken) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!validateSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: {
    entry?: Array<{
      changes?: Array<{
        value?: WhatsAppWebhookValue;
      }>;
    }>;
  };

  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch (error) {
    console.error("Failed to parse WhatsApp webhook payload", error);
    return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
  }

  const channels = getWhatsAppChannels();
  const jobs: Array<ReturnType<typeof buildJobPayload>> = [];
  let ignoredMessageCount = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      if (!value?.messages?.length) {
        continue;
      }

      const phoneNumberId = value.metadata?.phone_number_id;
      const channel = phoneNumberId ? channels[phoneNumberId] : undefined;

      if (!phoneNumberId || !channel) {
        ignoredMessageCount += value.messages.length;
        continue;
      }

      const contact = value.contacts?.[0];

      for (const message of value.messages) {
        jobs.push(
          buildJobPayload({
            organizationId: channel.organizationId,
            phoneNumberId,
            accessToken: channel.accessToken,
            contactName: contact?.profile?.name,
            contactPhone: contact?.wa_id ?? message.from,
            message,
          }),
        );
      }
    }
  }

  if (ignoredMessageCount > 0) {
    console.warn(
      JSON.stringify({
        scope: "automation-webhook",
        event: "messages-ignored-no-channel",
        ignoredMessageCount,
        hasConfiguredChannels: Object.keys(channels).length > 0,
      }),
    );
  }

  if (jobs.length) {
    try {
      const queue = getAutomationQueue();

      await withTimeout(
        queue.addBulk(
          jobs.map((job) => ({
            name: "whatsapp-inbound",
            data: job,
          })),
        ),
        ENQUEUE_TIMEOUT_MS,
      );
    } catch (error) {
      console.error("Failed to enqueue WhatsApp webhook jobs", error);
      return NextResponse.json({ ok: false, error: "queue-unavailable" }, { status: 503 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

function buildJobPayload(input: {
  organizationId: string;
  phoneNumberId: string;
  accessToken: string;
  contactName?: string;
  contactPhone?: string;
  message: WhatsAppWebhookMessage;
}) {
  return {
    source: "whatsapp",
    organizationId: input.organizationId,
    channel: {
      phoneNumberId: input.phoneNumberId,
      accessToken: input.accessToken,
    },
    contact: {
      name: input.contactName ?? "Unknown contact",
      phone: input.contactPhone ?? "Unknown phone",
    },
    message: {
      externalId: input.message.id ?? null,
      from: input.message.from ?? null,
      timestamp: input.message.timestamp ?? null,
      type: input.message.type ?? "unknown",
      body: input.message.text?.body ?? "",
    },
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Queue enqueue timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
