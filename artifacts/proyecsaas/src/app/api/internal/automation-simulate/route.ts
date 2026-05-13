import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import {
  processWhatsAppInboundJob,
  type WhatsAppInboundJobData,
} from "@/server/workers/conversation-worker";

export const runtime = "nodejs";

type SimulationPreset = "default" | "visit-intent" | "ignored-non-text";

const VALID_PRESETS = new Set<SimulationPreset>(["default", "visit-intent", "ignored-non-text"]);

function isValidPreset(value: unknown): value is SimulationPreset {
  return typeof value === "string" && VALID_PRESETS.has(value as SimulationPreset);
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function forbidden() {
  return NextResponse.json({ ok: false }, { status: 403 });
}

function isSimulationEnabled() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.INTERNAL_AUTOMATION_SIMULATION_ENABLED === "true";
}

function validateSimulationToken(provided: string | null): boolean {
  const expected = process.env.INTERNAL_AUTOMATION_SIMULATION_TOKEN;

  if (!expected || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function getPinnedOrgSlug(): string | null {
  return process.env.INTERNAL_AUTOMATION_SIMULATION_ORG_SLUG?.trim() || null;
}

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
  if (!isSimulationEnabled()) {
    return forbidden();
  }

  if (!validateSimulationToken(request.headers.get("x-internal-simulation-token"))) {
    return forbidden();
  }

  const pinnedOrgSlug = getPinnedOrgSlug();

  if (!pinnedOrgSlug) {
    return forbidden();
  }

  const rawBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const preset = isValidPreset(rawBody.preset)
    ? rawBody.preset
    : rawBody.preset === undefined
      ? "default"
      : null;

  if (preset === null) {
    return badRequest("invalid preset");
  }

  const contactPhone =
    rawBody.contactPhone === undefined
      ? undefined
      : typeof rawBody.contactPhone === "string" && rawBody.contactPhone.length <= 30
        ? rawBody.contactPhone
        : null;

  const contactName =
    rawBody.contactName === undefined
      ? undefined
      : typeof rawBody.contactName === "string" && rawBody.contactName.length <= 200
        ? rawBody.contactName
        : null;

  const externalId =
    rawBody.externalId === undefined
      ? undefined
      : typeof rawBody.externalId === "string" && rawBody.externalId.length <= 128
        ? rawBody.externalId
        : null;

  if (contactPhone === null || contactName === null || externalId === null) {
    return badRequest("invalid input field");
  }

  const organization = await prisma.organization.findUnique({
    where: {
      slug: pinnedOrgSlug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!organization) {
    return forbidden();
  }

  const phoneNumberId = `simulated-${organization.slug}`;
  const scenario = getPresetBody(preset);
  const defaultContactPhone = `+54911${Date.now().toString().slice(-8)}`;
  const defaultContactName = `Simulation Lead (${preset})`;
  const payload = buildSimulatedInboundPayload({
    phoneNumberId,
    externalId: externalId ?? `sim-${preset}-${Date.now()}`,
    contactName: contactName ?? defaultContactName,
    contactPhone: contactPhone ?? defaultContactPhone,
    body: scenario.body,
    type: scenario.type,
  });
  const result = await processWhatsAppInboundJob(payload, {
    deliveryMode: "simulate",
    channelOverride: {
      organizationId: organization.id,
      source: "database",
      provider: "whatsapp",
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
