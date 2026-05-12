import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/server/auth/access";
import { handleMetaOAuthCallback } from "@/modules/agents/meta-service";

export async function GET(req: NextRequest) {
  try {
    // Note: We check admin here but the OAuth callback is usually triggered by a redirect.
    // If the user isn't logged in as admin in the same session, this will fail.
    // However, since this is for Superadmin only, and they just clicked "Connect", it should be fine.
    await requirePlatformAdmin();

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      return NextResponse.redirect(
        new URL(`/platform/agents/integrations/meta?error=${encodeURIComponent(errorDescription || error)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(`/platform/agents/integrations/meta?error=Missing+OAuth+code`, req.url)
      );
    }

    await handleMetaOAuthCallback(code);

    return NextResponse.redirect(new URL("/platform/agents/integrations/meta?success=true", req.url));
  } catch (err: any) {
    console.error("Meta OAuth Callback Error:", err);
    return NextResponse.redirect(
      new URL(`/platform/agents/integrations/meta?error=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}
