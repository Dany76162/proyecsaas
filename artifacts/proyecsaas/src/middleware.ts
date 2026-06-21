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
  "/app-movil",
  "/manifest.json",
  "/manifest-b2c.json",
  "/sw.js",
  "/sw-b2c.js",
  /^\/map\/.+/,
  /^\/invite\/.+/,
  /^\/api\/public\//,
  // Proxy de media (CORS) para panoramas 360° del catálogo público. El param
  // `url` está restringido a hosts r2.dev (bucket público), así que no expone
  // nada que no sea ya público. Sin esto, el anónimo que abre un tour 360° era
  // redirigido a /login y el visor recibía HTML en vez de la imagen.
  /^\/api\/storage\/view(\/|$)/,
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
    "/((?!_next/static|_next/image|api/property-media/upload|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif|woff|woff2|ttf|otf|css|js|js\\.map)).*)",
  ],
};
