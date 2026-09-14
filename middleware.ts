import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip Next internals, API routes, and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
