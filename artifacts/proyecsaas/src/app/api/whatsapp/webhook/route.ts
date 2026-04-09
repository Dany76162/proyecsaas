import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/server/db/prisma";
import { runAgentPipeline } from "@/lib/ai/agent-pipeline";

const VERIFY_TOKEN = process.env["WHATSAPP_WEBHOOK_TOKEN"] ?? "raices_webhook_token";
const APP_SECRET = process.env["WHATSAPP_APP_SECRET"] ?? "";

function verifySignature(body: string, signature: string): boolean {
  if (!APP_SECRET) return true;
  const expected = "sha256=" + createHmac("sha256", APP_SECRET).update(body).digest("hex");
  return expected === signature;
}

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

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const p = payload as Record<string, unknown>;
  if (p["object"] !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ignored" });
  }

  const entries = (p["entry"] as Array<Record<string, unknown>>) ?? [];

  for (const entry of entries) {
    const changes = (entry["changes"] as Array<Record<string, unknown>>) ?? [];
    for (const change of changes) {
      const value = change["value"] as Record<string, unknown>;
      if (!value) continue;

      const metadata = value["metadata"] as Record<string, string> | undefined;
      const phoneNumberId = metadata?.["phone_number_id"];
      if (!phoneNumberId) continue;

      const channel = await prisma.whatsAppChannel.findFirst({
        where: { phoneNumberId },
        include: { organization: true },
      });
      if (!channel) continue;

      const agent = await prisma.aiAgent.findFirst({
        where: { whatsappChannelId: channel.id, status: "ACTIVE" },
      });
      if (!agent) continue;

      const messages = (value["messages"] as Array<Record<string, unknown>>) ?? [];
      for (const msg of messages) {
        if (msg["type"] !== "text") continue;
        const text = (msg["text"] as Record<string, string>)?.["body"];
        if (!text) continue;

        const from = msg["from"] as string;
        const contacts = (value["contacts"] as Array<Record<string, unknown>>) ?? [];
        const contact = contacts.find((c) => (c["wa_id"] as string) === from);
        const contactName = (contact?.["profile"] as Record<string, string>)?.["name"] ?? from;

        try {
          await runAgentPipeline({
            agentId: agent.id,
            organizationId: channel.organizationId,
            contactName,
            contactPhone: from,
            messageText: text,
          });
        } catch (err) {
          console.error("[whatsapp/webhook] pipeline error:", err);
        }
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
