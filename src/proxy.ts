import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const intlMiddleware = createMiddleware(routing);

// Routes (without locale prefix) that require an authenticated session.
const PROTECTED_PATHS = ["/account"];

const LOCALES = routing.locales as readonly string[];
const DEFAULT_LOCALE = routing.defaultLocale;

function getLocale(pathname: string): string {
  return LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ?? DEFAULT_LOCALE;
}

function stripLocale(pathname: string): string {
  for (const l of LOCALES) {
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(l.length + 1);
    if (pathname === `/${l}`) return "/";
  }
  return pathname;
}

function buildCsp(nonce: string): string {
  // React/Turbopack dev server uses eval() for HMR and source maps.
  // 'unsafe-eval' is only added in development — production builds never need it.
  const evalDirective = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

  return [
    "default-src 'self'",
    // 'self' allows Next.js static chunks; nonce covers any inline scripts.
    // Note: 'strict-dynamic' is intentionally omitted — it disables 'self' in
    // nonce-aware browsers, which blocks /_next/static/chunks/ from loading.
    `script-src 'self' 'nonce-${nonce}'${evalDirective}`,
    // MapLibre GL spawns a blob: URL web worker for tile parsing — must be allowed explicitly
    // since worker-src falls back to script-src when not set.
    // 'self' is also needed for /globe-worker.js which is loaded from the public directory.
    "worker-src blob: 'self'",
    // unsafe-inline is required for CSS-in-JS (Tailwind inline styles, etc.)
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Generate a per-request nonce ────────────────────────────────────────
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");

  // ── 2. Server-side auth guard ───────────────────────────────────────────────
  const rawPath = stripLocale(pathname);
  const isProtected = PROTECTED_PATHS.some(
    (p) => rawPath === p || rawPath.startsWith(`${p}/`),
  );

  if (isProtected) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Only run the check when real credentials are configured (skip dev placeholder)
    if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("dev-placeholder")) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {}, // read-only in middleware
        },
      });

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const locale = getLocale(pathname);
        const redirectUrl = new URL(`/${locale}/auth`, request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        redirectResponse.headers.set("Content-Security-Policy", buildCsp(nonce));
        return redirectResponse;
      }
    }
  }

  // ── 3. Run next-intl routing, forwarding the nonce as a request header ──────
  //    Server components read it via headers().get('x-nonce') to apply to scripts
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const intlResponse = intlMiddleware(
    new NextRequest(request.url, {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
    }),
  );

  // ── 4. If intl issued a redirect, add CSP and return ────────────────────────
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    intlResponse.headers.set("Content-Security-Policy", buildCsp(nonce));
    return intlResponse;
  }

  // ── 5. For pass-through responses, rebuild with the nonce on the request ────
  //    NextResponse.next({ request }) is the only way to pass custom request
  //    headers to server components via headers().
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Copy cookies set by intl middleware (e.g. NEXT_LOCALE cookie)
  for (const cookie of intlResponse.cookies.getAll()) {
    response.cookies.set(cookie.name, cookie.value, cookie as Parameters<typeof response.cookies.set>[2]);
  }

  // Copy any extra response headers from intl middleware
  for (const [key, value] of intlResponse.headers.entries()) {
    if (key.toLowerCase() !== "content-type") {
      response.headers.set(key, value);
    }
  }

  response.headers.set("Content-Security-Policy", buildCsp(nonce));

  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
