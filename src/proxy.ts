import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// In Next.js 16, proxy.ts replaces middleware.ts
// The exported function must be named `proxy`
export const proxy = createMiddleware(routing);

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
