import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAgentPipeline } from "@/lib/ai/agent-pipeline";
import { prisma } from "@/server/db/prisma";

const SimulateSchema = z.object({
  agentId: z.string().min(1),
  orgSlug: z.string().min(1),
  contactName: z.string().optional(),
  contactPhone: z.string().min(6),
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SimulateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { agentId, orgSlug, contactName, contactPhone, message, conversationId } =
      parsed.data;

    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const agent = await prisma.aiAgent.findFirst({
      where: { id: agentId, organizationId: org.id },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const result = await runAgentPipeline({
      agentId,
      organizationId: org.id,
      contactName,
      contactPhone,
      messageText: message,
      conversationId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[whatsapp/simulate] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
