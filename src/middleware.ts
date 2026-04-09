import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "proyecsaas_session";

const PUBLIC_PATHS: Array<string | RegExp> = [
  "/login",
  "/favicon.ico",
  "/map",
  /^\/map\/.+/,
  /^\/catalogo\/.+/,
  /^\/api\/webhooks\//,
  /^\/api\/internal\/automation-simulate(\/|$)/,
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((rule) =>
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
     */
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif|woff|woff2|ttf|otf|css|js\\.map)).*)",
  ],
};
