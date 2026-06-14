import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "proyecsaas_session";

const PUBLIC_PATHS: Array<string | RegExp> = [
  "/",
  "/login",
  "/solicitar-acceso",
  "/suspended",
  "/favicon.ico",
  "/map",
  "/privacy",
  "/terms",
  "/terminos",
  "/propiedades",
  "/manifest.json",
  /^\/map\/.+/,
  /^\/invite\/.+/,
  /^\/api\/public\//,
  /^\/api\/webhooks\//,
  /^\/api\/whatsapp\/webhook(\/|$)/,
  /^\/api\/properties\/sync-from-source/,
  // Reserva de lotes desde catálogo público — compradores externos sin sesión
  /^\/api\/developments\/lots\/[^/]+\/reserve$/,
  /^\/[^/]+\/catalog(\/|$)/,
  /^\/cat(\/|$)/,
  /^\/google.*\.html$/,
];

const DEV_ONLY_PUBLIC_PATHS: Array<string | RegExp> = [
  /^\/api\/internal\/automation-simulate(\/|$)/,
  /^\/api\/whatsapp\/simulate(\/|$)/,
];

function isPublicPath(pathname: string): boolean {
  const rules =
    process.env.NODE_ENV === "production"
      ? PUBLIC_PATHS
      : [...PUBLIC_PATHS, ...DEV_ONLY_PUBLIC_PATHS];

  return rules.some((rule) =>
    typeof rule === "string" ? pathname === rule : rule.test(pathname),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  // [AUTH_SAVE_DEBUG] temporal — diagnóstico de pérdida de sesión en POST de Server Actions.
  // No imprime valores de cookie/token, solo metadatos. Quitar tras cerrar el P0.
  const isServerAction = !!request.headers.get("next-action");
  if (request.method !== "GET" || isServerAction) {
    console.log("[AUTH_SAVE_DEBUG] middleware", {
      pathname,
      method: request.method,
      host: request.headers.get("host"),
      xForwardedHost: request.headers.get("x-forwarded-host"),
      xForwardedProto: request.headers.get("x-forwarded-proto"),
      hasOrigin: !!request.headers.get("origin"),
      refererHost: (() => { try { return request.headers.get("referer") ? new URL(request.headers.get("referer")!).host : null; } catch { return "invalid"; } })(),
      isServerAction,
      hasSessionCookie: hasSession,
      cookieNames: request.cookies.getAll().map((c) => c.name),
      willRedirectLogin: !hasSession,
    });
  }

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - public folder assets (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|api/property-media/upload|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif|woff|woff2|ttf|otf|css|js\\.map)).*)",
  ],
};
