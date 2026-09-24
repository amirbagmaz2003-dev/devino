import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Fallback when SITE_URL isn't configured (e.g. a bare `next build`). */
const DEFAULT_SITE_URL = "https://devino.amirbagmaz2003.workers.dev";

async function readEnv(): Promise<Partial<CloudflareEnv>> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env;
  } catch {
    return process.env as Partial<CloudflareEnv>;
  }
}

/** Public origin, no trailing slash — the base of every absolute URL. */
export async function getSiteUrl(): Promise<string> {
  const env = await readEnv();
  return (env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

/** Search engines may index the site only when ALLOW_INDEXING is exactly "true". */
export async function isIndexingAllowed(): Promise<boolean> {
  return (await readEnv()).ALLOW_INDEXING === "true";
}
