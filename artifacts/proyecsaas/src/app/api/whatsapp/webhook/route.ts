import { NextRequest, NextResponse } from "next/server";

// ── LEGACY WEBHOOK — DISABLED ────────────────────────────────────────────────
// This route is kept alive so Meta webhook verification challenges still pass,
// but all message processing has been moved to the modern pipeline at
// /api/webhooks/whatsapp (Cloud API) and /api/webhooks/whatsapp/evolution.
// The POST handler intentionally does nothing to prevent double-processing.

const VERIFY_TOKEN = process.env["WHATSAPP_WEBHOOK_TOKEN"] ?? "raices_webhook_token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST() {
  return NextResponse.json({
    status: "deprecated",
    message: "Legacy WhatsApp webhook disabled. Use /api/webhooks/whatsapp.",
  });
}
