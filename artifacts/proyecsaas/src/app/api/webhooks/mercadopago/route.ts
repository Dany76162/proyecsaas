import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  processMPPaymentWebhook,
  type MPWebhookPayload,
} from "@/server/billing/mp-webhook-processor";

export const runtime = "nodejs";

// ─── Signature validation ─────────────────────────────────────────────────────
//
// Mercado Pago sends a `x-signature` header on Checkout Pro webhooks:
//   x-signature: ts=<unix_timestamp>,v1=<hmac_sha256_hex>
//
// The HMAC-SHA256 message is built from query/header values:
//   id:<notification_id_from_query>;request-id:<x-request-id_header>;ts:<timestamp>
//
// Secret: MERCADO_PAGO_WEBHOOK_SECRET (set in MP panel > Integraciones > Webhooks).
//
// If the env var is not set, signature validation is skipped with a warning.
// This allows development/testing without a configured secret, but production
// deployments MUST set MERCADO_PAGO_WEBHOOK_SECRET.
//
// Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks

function validateMPSignature(request: NextRequest): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.warn(
      JSON.stringify({
        scope: "mp-webhook",
        event: "signature-validation-skipped",
        reason:
          "MERCADO_PAGO_WEBHOOK_SECRET not configured — set it in production to enable signature validation",
      }),
    );
    return true;
  }

  const signatureHeader = request.headers.get("x-signature");
  if (!signatureHeader) {
    console.warn(
      JSON.stringify({
        scope: "mp-webhook",
        event: "signature-missing-header",
      }),
    );
    return false;
  }

  // Parse "ts=<value>,v1=<value>" into a map
  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(",")) {
    const eqIndex = segment.indexOf("=");
    if (eqIndex !== -1) {
      const key = segment.slice(0, eqIndex).trim();
      const value = segment.slice(eqIndex + 1).trim();
      if (key && value) parts[key] = value;
    }
  }

  const { ts, v1 } = parts;
  if (!ts || !v1) {
    return false;
  }

  // MP HMAC message format: "id:<notif_id>;request-id:<req_id>;ts:<ts>"
  const notificationId = request.nextUrl.searchParams.get("id") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const message = `id:${notificationId};request-id:${requestId};ts:${ts}`;

  const expectedBuf = Buffer.from(
    createHmac("sha256", secret).update(message).digest("hex"),
    "hex",
  );
  const providedBuf = Buffer.from(v1, "hex");

  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, providedBuf);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Validate signature before reading the body
  if (!validateMPSignature(request)) {
    console.warn(
      JSON.stringify({
        scope: "mp-webhook",
        event: "signature-rejected",
      }),
    );
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: MPWebhookPayload;
  try {
    payload = (await request.json()) as MPWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
  }

  const result = await processMPPaymentWebhook(payload);

  console.log(
    JSON.stringify({
      scope: "mp-webhook",
      event: "handled",
      outcome: result.outcome,
      detail: "reason" in result ? result.reason : undefined,
    }),
  );

  // Return 200 for processed and skipped events — MP should not retry these.
  // Return 500 for errors so MP will retry the notification automatically.
  if (result.outcome === "error") {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
