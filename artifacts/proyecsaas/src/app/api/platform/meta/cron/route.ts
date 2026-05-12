import { NextResponse } from "next/server";
import { publishScheduledDrafts } from "@/modules/agents/meta-service";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.AGENTOS_CRON_SECRET;

  // Basic security: Check for AGENTOS_CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await publishScheduledDrafts();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
