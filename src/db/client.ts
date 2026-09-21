import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/** Media storage is Workers KV (not R2 — see wrangler.jsonc). */
export async function getMediaKv() {
  const { env } = await getCloudflareContext({ async: true });
  return env.MEDIA;
}
