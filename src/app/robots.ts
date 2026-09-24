import type { MetadataRoute } from "next";
import { getSiteUrl, isIndexingAllowed } from "@/lib/site";

// Read the env at request time, not build time, so flipping
// ALLOW_INDEXING (or SITE_URL) only needs a config change + redeploy.
export const dynamic = "force-dynamic";

/**
 * Disallow everything unless ALLOW_INDEXING=true — the workers.dev preview
 * must never be indexed. /admin is disallowed either way.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const [allowed, siteUrl] = await Promise.all([
    isIndexingAllowed(),
    getSiteUrl(),
  ]);
  if (!allowed) {
    return { rules: { userAgent: "*", disallow: ["/", "/admin"] } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/admin/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
