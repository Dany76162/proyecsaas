import { NextResponse } from "next/server";
import { runDueAgentAutomations } from "@/modules/agents/automations-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const secret = process.env.AGENTOS_CRON_SECRET;

  if (!secret) {
    console.error("[AgentOS] AGENTOS_CRON_SECRET not configured");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runDueAgentAutomations();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error("[AgentOS] Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
