import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip Next internals, API routes, static files, the admin panel (not
  // localized — see src/app/admin), and the R2 media-streaming route.
  matcher: ["/((?!api|admin|media|_next|_vercel|.*\\..*).*)"],
};
