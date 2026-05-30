import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  processMPPaymentWebhook,
  type MPWebhookPayload,
} from "@/server/billing/mp-webhook-processor";

export const runtime = "nodejs";

function validateMPSignature(request: NextRequest): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.warn(
      JSON.stringify({
        scope: "mp-webhook",
        event: "signature-secret-missing",
      }),
    );
    return false;
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

  const dataId = (request.nextUrl.searchParams.get("data.id") ?? request.nextUrl.searchParams.get("id") ?? "").toLowerCase();
  const requestId = request.headers.get("x-request-id") ?? "";
  const message = `id:${dataId};request-id:${requestId};ts:${ts};`;

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

export async function POST(request: NextRequest) {
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

  if (result.outcome === "error") {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
