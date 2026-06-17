import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getAutomationQueue } from "@/server/queues";
import {
  resolveDatabaseChannelByInstanceName,
  stripRoutingCodeFromMessage,
  extractOrgSlugFromMessage,
  resolveOrgBySlug,
} from "@/server/whatsapp/channel-resolver";

export const runtime = "nodejs";

const ENQUEUE_TIMEOUT_MS = 3000;

export async function POST(request: NextRequest) {
  const receivedAt = Date.now();
  const rawBody = await request.text();
  
  // Validation: In a production environment, we should validate a custom token 
  // or use the Global Key if sent in headers by Evolution API.
  // Evolution sends 'apikey' header if configured.
  // Evolution no siempre reenvía el apikey en sus webhooks salientes. Solo
  // rechazamos si llega un apikey y es incorrecto; si no llega, aceptamos
  // (el endpoint igual queda scopeado por instanceName al resolver el canal).
  const apiKey = request.headers.get("apikey");
  if (process.env.EVOLUTION_API_KEY && apiKey && apiKey !== process.env.EVOLUTION_API_KEY) {
     return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
  }

  // Handle Connection Updates
  if (payload.event === "connection.update") {
    const instanceName = payload.instance;
    const state = payload.data?.state;
    
    if (instanceName && state) {
      console.log(`[Evolution Webhook] Connection update for ${instanceName}: ${state}`);
      
      let phone: string | undefined = undefined;
      const rawJid = payload.data?.currentSession?.jid || payload.data?.currentSession?.user?.id;
      if (rawJid && typeof rawJid === "string") {
        const beforeAt = rawJid.split("@")[0];
        phone = beforeAt.split(":")[0];
      }

      await prisma.whatsAppChannel.update({
        where: { instanceName },
        data: { 
          status: state === "open" ? "ACTIVE" : "INACTIVE",
          isPrimary: state === "open" ? true : undefined,
          displayPhoneNumber: phone || undefined,
          phoneNumberId: phone ? `evolution_${phone}` : undefined,
        }
      }).catch(() => null); // Silent if instance not in DB yet
    }
    return NextResponse.json({ ok: true });
  }

  // Handle QR Updates (if we want to store/cache it)
  if (payload.event === "qrcode.updated") {
    // We don't strictly need to store it if the UI is polling/fetching, 
    // but we could use it to push via sockets in the future.
    return NextResponse.json({ ok: true });
  }

  // We only care about messages.upsert (new messages)
  if (payload.event !== "messages.upsert") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const instanceName = payload.instance;
  const messageData = payload.data;

  // Ignore messages sent by the bot itself
  if (messageData.key?.fromMe) {
    return NextResponse.json({ ok: true, ignoredByOrigin: true });
  }

  const channel = await resolveDatabaseChannelByInstanceName(prisma, instanceName);

  if (!channel) {
    console.warn(`[Evolution Webhook] Instance ${instanceName} not found or inactive`);
    return NextResponse.json({ ok: false, error: "instance-unresolved" }, { status: 404 });
  }

  const remoteJid = messageData.key?.remoteJid;
  const contactPhone = remoteJid?.split("@")[0];
  const contactName = messageData.pushName || "WhatsApp User";
  
  // Support for different message types (text, image, etc)
  // Evolution API puts the text in message.conversation or message.extendedTextMessage.text
  const body = messageData.message?.conversation || 
               messageData.message?.extendedTextMessage?.text || 
               "";

  if (!body && !messageData.message?.imageMessage) {
    return NextResponse.json({ ok: true, ignoredEmpty: true });
  }

  // Registrar que llegó un mensaje entrante (señal real de recepción).
  await prisma.whatsAppChannel
    .update({ where: { instanceName }, data: { lastInboundAt: new Date() } })
    .catch(() => null);

  // Platform Routing (same logic as Meta)
  const routingSlug = extractOrgSlugFromMessage(body);
  let targetOrgId = channel.organizationId;

  if (routingSlug) {
    const routedOrg = await resolveOrgBySlug(prisma, routingSlug);
    if (routedOrg) {
      targetOrgId = routedOrg.id;
    }
  }

  const jobPayload = {
    source: "whatsapp" as const,
    provider: "evolution" as const,
    organizationId: targetOrgId,
    channel: {
      instanceName: channel.instanceName,
      channelId: channel.channelId,
    },
    contact: {
      name: contactName,
      phone: contactPhone,
    },
    message: {
      externalId: messageData.key?.id || null,
      from: contactPhone || null,
      timestamp: messageData.messageTimestamp || Math.floor(Date.now() / 1000),
      type: messageData.message?.imageMessage ? "image" : "text",
      body: stripRoutingCodeFromMessage(body),
    },
  };

  try {
    const queue = getAutomationQueue();
    // Dedup: Evolution puede disparar el mismo MESSAGES_UPSERT más de una vez.
    // Usamos el id del mensaje como jobId para que BullMQ descarte el duplicado
    // y no se procese/envíe la respuesta dos veces.
    const dedupeId = messageData.key?.id ? `evo_${messageData.key.id}` : undefined;
    await withTimeout(
      queue.add("whatsapp-inbound", jobPayload, dedupeId ? { jobId: dedupeId } : undefined),
      ENQUEUE_TIMEOUT_MS
    );

    return NextResponse.json({ 
      ok: true, 
      enqueued: true,
      durationMs: Date.now() - receivedAt 
    });
  } catch (error) {
    console.error(`[Evolution Webhook] Failed to enqueue message for ${instanceName}:`, error);
    return NextResponse.json({ ok: false, error: "queue-failed" }, { status: 503 });
  }
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
      }
    );
  });
}
