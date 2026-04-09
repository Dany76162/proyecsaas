import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true, ts: Date.now(), env: process.env.NODE_ENV },
    { status: 200 },
  );
}
