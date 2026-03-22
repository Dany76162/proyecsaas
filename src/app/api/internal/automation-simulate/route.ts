import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import {
  processWhatsAppInboundJob,
  type WhatsAppInboundJobData,
} from "@/server/workers/conversation-worker";

export const runtime = "nodejs";

type SimulationPreset = "default" | "visit-intent" | "ignored-non-text";

function buildSimulatedInboundPayload(input: {
  phoneNumberId: string;
  externalId: string;
  contactName: string;
  contactPhone: string;
  body: string;
  type: string;
}): WhatsAppInboundJobData {
  return {
    source: "whatsapp",
    channel: {
      phoneNumberId: input.phoneNumberId,
    },
    contact: {
      name: input.contactName,
      phone: input.contactPhone,
    },
    message: {
      externalId: input.externalId,
      from: input.contactPhone,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: input.type,
      body: input.body,
    },
  };
}

function getPresetBody(preset: SimulationPreset) {
  switch (preset) {
    case "visit-intent":
      return {
        type: "text",
        body: "Hola, quiero visitar la propiedad lo antes posible.",
      };
    case "ignored-non-text":
      return {
        type: "image",
        body: "",
      };
    default:
      return {
        type: "text",
        body: "Hola, quiero saber mas sobre esta propiedad.",
      };
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const expectedToken = process.env.INTERNAL_AUTOMATION_SIMULATION_TOKEN;
  const providedToken = request.headers.get("x-internal-simulation-token");

  if (!expectedToken) {
    return NextResponse.json({ ok: false, error: "simulation-token-not-configured" }, { status: 503 });
  }

  if (!providedToken || providedToken !== expectedToken) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    orgSlug?: string;
    preset?: SimulationPreset;
    contactPhone?: string;
    contactName?: string;
    externalId?: string;
  };
  const orgSlug = body.orgSlug ?? "north-hill";
  const organization = await prisma.organization.findUnique({
    where: {
      slug: orgSlug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!organization) {
    return NextResponse.json({ ok: false, error: "organization-not-found" }, { status: 404 });
  }

  const preset = body.preset ?? "default";
  const phoneNumberId = `simulated-${organization.slug}`;
  const scenario = getPresetBody(preset);
  const defaultContactPhone = `+54911${Date.now().toString().slice(-8)}`;
  const defaultContactName = `Simulation Lead (${preset})`;
  const payload = buildSimulatedInboundPayload({
    phoneNumberId,
    externalId: body.externalId ?? `sim-${preset}-${Date.now()}`,
    contactName: body.contactName ?? defaultContactName,
    contactPhone: body.contactPhone ?? defaultContactPhone,
    body: scenario.body,
    type: scenario.type,
  });
  const result = await processWhatsAppInboundJob(payload, {
    deliveryMode: "simulate",
    channelOverride: {
      organizationId: organization.id,
      phoneNumberId,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      mode: "simulate",
      dryRun: false,
      writesRealData: true,
      warning: "This simulation writes real database records.",
      orgSlug: organization.slug,
      preset,
      result,
    },
    { status: 200 },
  );
}
