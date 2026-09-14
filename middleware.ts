import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip Sanity Studio, Next internals, API routes, and static files.
  matcher: ["/((?!api|studio|_next|_vercel|.*\\..*).*)"],
};
