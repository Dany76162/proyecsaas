/**
 * RAILWAY CRON HEALTH CHECK:
 * -------------------------------------------------------------
 * This lightweight health check confirms that Railway can execute HTTP requests
 * successfully. Useful for monitoring cron execution and uptime logs.
 * 
 * Target URL: https://www.raicespilot.com/api/cron/health
 * Method: GET
 * -------------------------------------------------------------
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: Date.now(),
  });
}
