import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import crypto from "crypto";

const MAILGUN_WEBHOOK_SIGNING_KEY = process.env.MAILGUN_API_KEY || "";

function verifySignature(timestamp: string, token: string, signature: string) {
  const encodedToken = crypto
    .createHmac("sha256", MAILGUN_WEBHOOK_SIGNING_KEY)
    .update(timestamp + token)
    .digest("hex");
  return encodedToken === signature;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { signature, "event-data": eventData } = body;

    // Verify Mailgun signature
    if (!verifySignature(signature.timestamp, signature.token, signature.signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = eventData.event;
    const messageId = eventData.message?.headers?.["message-id"];
    
    // Custom metadata from our campaign service
    const campaignId = eventData["user-variables"]?.campaignId;
    const recipientId = eventData["user-variables"]?.recipientId;

    if (!recipientId) {
      console.log(`[Webhook] No recipientId found in metadata for event ${event}`);
      return NextResponse.json({ ok: true });
    }

    if (event === "opened") {
      await prisma.prospectingCampaignRecipient.update({
        where: { id: recipientId },
        data: { openedAt: new Date() }
      });
      await prisma.prospectingCampaign.update({
        where: { id: campaignId },
        data: { openCount: { increment: 1 } }
      });
      console.log(`[Webhook] Recipient ${recipientId} opened email`);
    } else if (event === "clicked") {
      await prisma.prospectingCampaignRecipient.update({
        where: { id: recipientId },
        data: { clickedAt: new Date() }
      });
      await prisma.prospectingCampaign.update({
        where: { id: campaignId },
        data: { clickCount: { increment: 1 } }
      });
      console.log(`[Webhook] Recipient ${recipientId} clicked link`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Webhook Error]", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
